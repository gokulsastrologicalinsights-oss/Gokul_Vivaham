const { setTimeout: delay } = require('node:timers/promises');

async function checkSite(base, { attempts = 3, retryMs = 10000, timeoutMs = 15000 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(new URL('/api/health', base), { redirect: 'error', signal: AbortSignal.timeout(timeoutMs), headers: { 'Cache-Control': 'no-cache' } });
      const body = await response.json();
      if (response.status === 200 && body.status === 'ok' && body.database === 'ok') return { healthy: true, attempts: attempt };
    } catch { /* Return a generic result: never publish raw provider errors or member data. */ }
    if (attempt < attempts) await delay(retryMs);
  }
  return { healthy: false, attempts };
}

async function checkBackup({ github, context }, now = Date.now()) {
  const { data } = await github.rest.actions.listWorkflowRuns({ ...context.repo, workflow_id: 'operations-backup.yml', branch: 'main', status: 'success', per_page: 1 });
  const run = data.workflow_runs[0];
  if (!run || now - Date.parse(run.run_started_at) > 30 * 60 * 60 * 1000) return false;
  const { data: files } = await github.rest.actions.listWorkflowRunArtifacts({ ...context.repo, run_id: run.id });
  return files.artifacts.some(file => file.name === `encrypted-backup-${run.id}` && !file.expired && file.size_in_bytes > 0);
}

async function updateAlert({ github, context }, healthy, drill = false, backup = false) {
  const title = backup ? '[Operations] Backup overdue' : drill ? '[Operations drill] Website availability' : '[Operations] Website unavailable';
  const marker = backup ? '<!-- gokul-operations-backup -->' : drill ? '<!-- gokul-operations-drill -->' : '<!-- gokul-operations-monitor -->';
  const { owner, repo } = context.repo;
  const issues = await github.paginate(github.rest.issues.listForRepo, { owner, repo, state: 'open', per_page: 100 });
  const existing = issues.find(issue => !issue.pull_request && issue.title === title && issue.body?.includes(marker) && issue.user?.type === 'Bot');
  const run = `https://github.com/${owner}/${repo}/actions/runs/${context.runId}`;
  if (!healthy && !existing) {
    await github.rest.issues.create({ owner, repo, title, body: `${marker}\n${backup ? 'No successful backup with an available encrypted artifact was found within the last 30 hours.' : drill ? 'This is a planned alert drill. Production was not changed.' : 'The public website/database readiness check failed three times.'}\n\n[Inspect the workflow run](${run}). No member information or credentials are included in this alert.` });
  } else if (healthy && existing) {
    await github.rest.issues.createComment({ owner, repo, issue_number: existing.number, body: `${backup ? 'A recent successful backup and encrypted artifact are available. A restore test is still a separate check.' : drill ? 'Alert drill recovered successfully.' : 'The website/database readiness check is healthy again.'}\n\n[Verification run](${run}).` });
    await github.rest.issues.update({ owner, repo, issue_number: existing.number, state: 'closed', state_reason: 'completed' });
  }
}
module.exports = { checkSite, checkBackup, updateAlert };

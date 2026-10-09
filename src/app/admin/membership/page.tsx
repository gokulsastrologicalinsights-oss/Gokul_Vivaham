'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CreditCard, Edit3, Plus, RefreshCw, Search, Trash2, UserPlus, X } from 'lucide-react';

type Plan = {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  features: Record<string, unknown>;
  is_active: boolean;
  contact_view_limit: number;
  messaging_enabled: boolean;
  profile_visibility_benefit: string;
  photo_viewing_enabled: boolean;
  premium_badge_eligible: boolean;
  search_enabled: boolean;
};

const emptyPlan: Omit<Plan, 'id'> = {
  name: '', description: '', price: 0, duration_days: 30, features: {}, is_active: true,
  contact_view_limit: 0, messaging_enabled: false, profile_visibility_benefit: '', photo_viewing_enabled: false,
  premium_badge_eligible: false, search_enabled: false,
};

const grantTypes = [
  ['cash_payment', 'Cash Payment'], ['bank_transfer', 'Bank Transfer'], ['upi_direct_payment', 'UPI / Direct Payment'],
  ['complimentary_access', 'Complimentary Access'], ['administrative_correction', 'Administrative Correction'], ['other', 'Other'],
];

function isoFromLocal(value: string) { return value ? new Date(value).toISOString() : new Date().toISOString(); }
function localFromIso(value: string) { const date = new Date(value); const offset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); }
function money(value: unknown) { return `₹${Number(value || 0).toLocaleString('en-IN')}`; }
function planFeatureItems(plan: Plan) {
  if (Array.isArray(plan.features)) return plan.features.map(String);
  return Object.entries(plan.features || {}).filter(([, value]) => value !== false && value !== null && value !== undefined && value !== '').map(([key, value]) => `${key.replaceAll('_', ' ')}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`);
}

export default function AdminMembershipPage() {
  const [tab, setTab] = useState('plans');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [offline, setOffline] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState<any>(emptyPlan);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [assignment, setAssignment] = useState({ planId: '', startDate: localFromIso(new Date().toISOString()), endDate: '', grantType: 'cash_payment', amountReceived: '0', paymentReference: '', dateReceived: localFromIso(new Date().toISOString()), internalNote: '', reason: '' });

  const title = useMemo(() => ({ plans: 'Membership Plans', subscriptions: 'Member Subscriptions', assign: 'Assign Plan Access', offline: 'Offline Payment Records', history: 'Subscription History', audit: 'Membership Audit Logs' } as Record<string, string>)[tab] || 'Membership', [tab]);

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get('tab');
    if (initial) setTab(initial);
  }, []);

  const loadPlans = async () => {
    setPlansLoading(true); setPlansError(null);
    try {
      const response = await fetch('/api/admin/membership?view=plans&eligible=assignable', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load membership plans. Please try again.');
      setPlans((data.plans || []).filter((plan: Plan) => plan.is_active !== false));
    } catch (error) {
      setPlans([]);
      setPlansError(error instanceof Error ? error.message : 'Unable to load membership plans. Please try again.');
    } finally { setPlansLoading(false); }
  };

  const load = async () => {
    setLoading(true); setMessage(null);
    try {
      if (tab === 'plans') {
        const response = await fetch('/api/admin/membership?view=plans', { cache: 'no-store' });
        const data = await response.json(); if (!response.ok) throw new Error(data.error); setPlans(data.plans || []);
      } else if (tab === 'assign') {
        const response = await fetch(`/api/admin/membership?view=members&search=${encodeURIComponent(memberSearch)}`, { cache: 'no-store' });
        const data = await response.json(); if (!response.ok) throw new Error(data.error); setMembers(data.members || []);
      } else if (tab === 'audit') {
        const response = await fetch('/api/admin/membership?view=audit', { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setAudit(data.audit || []);
      } else if (tab === 'offline') {
        const response = await fetch('/api/admin/membership?view=offline', { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setOffline(data.offline || []);
      } else {
        const query = new URLSearchParams({ view: 'subscriptions', search, status, pageSize: '100' });
        const response = await fetch(`/api/admin/membership?${query}`, { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setRows(data.subscriptions || []);
        const plansResponse = await fetch('/api/admin/membership?view=plans', { cache: 'no-store' }); const plansData = await plansResponse.json(); if (plansResponse.ok) setPlans(plansData.plans || []);
      }
    } catch (error) { setMessage({ text: error instanceof Error ? error.message : 'Unable to load membership data.', error: true }); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [tab, status]);
  useEffect(() => { if (tab === 'assign') { const timer = window.setTimeout(() => void loadPlans(), 0); return () => window.clearTimeout(timer); } }, [tab]);
  useEffect(() => { if (tab === 'assign') { const timer = window.setTimeout(() => void load(), 250); return () => window.clearTimeout(timer); } }, [memberSearch]);

  const selectTab = (next: string) => { setTab(next); window.history.replaceState(null, '', `/admin/membership?tab=${next}`); };
  const savePlan = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setMessage(null);
    try {
      const response = await fetch('/api/admin/membership', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: editingPlan ? 'plan_update' : 'plan_create', planId: editingPlan?.id, plan: { ...planForm, price: Number(planForm.price), duration_days: Number(planForm.duration_days), contact_view_limit: Number(planForm.contact_view_limit) } }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error); setMessage({ text: 'Plan saved successfully.' }); setEditingPlan(null); setShowPlanForm(false); setPlanForm(emptyPlan); await load();
    } catch (error) { setMessage({ text: error instanceof Error ? error.message : 'Plan could not be saved.', error: true }); } finally { setLoading(false); }
  };
  const deletePlan = async (plan: Plan) => {
    if (!window.confirm(`Delete or deactivate ${plan.name}? Historical plans with subscriptions are retained as inactive.`)) return;
    const response = await fetch('/api/admin/membership', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: plan.id, reason: 'Removed from membership plan catalogue' }) });
    const data = await response.json(); setMessage({ text: response.ok ? (data.result?.deactivated_only ? 'Plan retained as inactive because it has history.' : 'Plan deleted.') : data.error, error: !response.ok }); if (response.ok) await load();
  };
  const assign = async (action: 'assign' | 'change' | 'renew' | 'extend' | 'shorten' | 'revoke' | 'restore', row?: any) => {
    if (!selectedMember && !row?.member?.id) return;
    const memberId = selectedMember?.id || row.member.id;
    const targetPlanId = assignment.planId || row?.plan_id || null;
    if (action === 'revoke' && !window.confirm('Revoke this membership immediately? This removes premium access now and keeps the history.')) return;
    if (action !== 'revoke' && action !== 'renew' && action !== 'extend' && action !== 'shorten' && !targetPlanId) { setMessage({ text: 'Select a plan first.', error: true }); return; }
    const response = await fetch('/api/admin/membership', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, memberId, subscriptionId: row?.id || selectedMember?.current_subscription?.id || null, planId: targetPlanId, grantType: assignment.grantType, startDate: isoFromLocal(assignment.startDate), endDate: assignment.endDate ? isoFromLocal(assignment.endDate) : null, extendDays: action === 'renew' || action === 'extend' ? 30 : undefined, amountReceived: Number(assignment.amountReceived || 0), paymentReference: assignment.paymentReference || null, dateReceived: assignment.dateReceived ? isoFromLocal(assignment.dateReceived) : null, internalNote: assignment.internalNote || null, reason: assignment.reason || (action === 'assign' ? 'Manual plan access granted' : null) }) });
    const data = await response.json(); setMessage({ text: response.ok ? 'Membership updated and access synchronized.' : data.error, error: !response.ok }); if (response.ok) { setSelectedMember(null); setAssignment({ ...assignment, internalNote: '', reason: '' }); await load(); }
  };

  return <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 text-left md:p-8">
    <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-center"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-foreground"><CreditCard className="h-7 w-7 text-primary" />{title}</h1><p className="mt-1 text-xs uppercase tracking-wider text-muted">Database-backed plans, access grants, offline records, and audit history</p></div><button onClick={() => void load()} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold"><RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />Refresh</button></div>
    <div className="flex flex-wrap gap-2 border-b border-border pb-3">{[['plans', 'Membership Plans'], ['subscriptions', 'Member Subscriptions'], ['assign', 'Assign Plan Access'], ['offline', 'Offline Payment Records'], ['history', 'Subscription History'], ['audit', 'Membership Audit Logs']].map(([key, label]) => <button key={key} onClick={() => selectTab(key)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${tab === key ? 'bg-primary text-primary-foreground' : 'bg-surface text-muted hover:text-foreground'}`}>{label}</button>)}</div>
    {message && <div role="alert" className={`rounded-xl border px-4 py-3 text-sm ${message.error ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'}`}>{message.text}</div>}

    {tab === 'plans' && <section className="flex flex-col gap-4"><div className="flex justify-end"><button onClick={() => { setEditingPlan(null); setPlanForm(emptyPlan); setShowPlanForm(true); }} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"><Plus className="h-4 w-4" />Add Plan</button></div><div className="overflow-x-auto rounded-2xl border border-border bg-card"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-surface text-muted"><tr>{['Plan', 'Price / Duration', 'Entitlements', 'Status', 'Actions'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody>{plans.map((plan) => <tr key={plan.id} className="border-t border-border"><td className="px-4 py-4"><div className="font-bold">{plan.name}</div><div className="mt-1 max-w-xs text-muted">{plan.description}</div></td><td className="px-4 py-4 font-mono">{money(plan.price)}<div className="text-muted">{plan.duration_days} days</div></td><td className="px-4 py-4 text-muted">{plan.contact_view_limit} contacts · {plan.messaging_enabled ? 'Messaging' : 'No messaging'}<br />{plan.photo_viewing_enabled ? 'Photos' : 'No photos'} · {plan.search_enabled ? 'Advanced search' : 'Basic search'}</td><td className="px-4 py-4"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${plan.is_active ? 'bg-emerald-500/10 text-emerald-700' : 'bg-zinc-500/10 text-muted'}`}>{plan.is_active ? 'Active' : 'Inactive'}</span></td><td className="px-4 py-4"><div className="flex gap-2"><button title="Edit plan" onClick={() => { setEditingPlan(plan); setPlanForm(plan); setShowPlanForm(true); }} className="rounded-lg border border-border p-2"><Edit3 className="h-4 w-4" /></button><button title="Delete plan" onClick={() => void deletePlan(plan)} className="rounded-lg border border-destructive/30 p-2 text-destructive"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div></section>}

    {(tab === 'subscriptions' || tab === 'history') && <section className="flex flex-col gap-4"><div className="flex flex-col gap-2 sm:flex-row"><label className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3"><Search className="h-4 w-4 text-muted" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search profile ID, name, email, mobile" className="w-full bg-transparent py-2 text-sm outline-none" /></label><select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm"><option value="all">All statuses</option><option value="active">Active</option><option value="pending">Pending</option><option value="expired">Expired</option><option value="cancelled">Cancelled</option></select></div><div className="overflow-x-auto rounded-2xl border border-border bg-card"><table className="w-full min-w-[1100px] text-left text-xs"><thead className="bg-surface text-muted"><tr>{['Profile ID / Member', 'Current Plan', 'Status', 'Start', 'Expiry', 'Grant / Amount', 'Actions'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-border"><td className="px-4 py-4"><div className="font-bold">{row.member.profile_id}</div><div>{row.member.name}</div><div className="text-muted">{row.member.email || row.member.mobile_number}</div></td><td className="px-4 py-4">{row.plan?.name || 'Unknown plan'}</td><td className="px-4 py-4"><span className="rounded-full bg-surface px-2 py-1 font-bold uppercase">{row.status}</span></td><td className="px-4 py-4 font-mono">{row.start_date ? new Date(row.start_date).toLocaleDateString() : '—'}</td><td className="px-4 py-4 font-mono">{row.end_date ? new Date(row.end_date).toLocaleDateString() : '—'}</td><td className="px-4 py-4">{row.offline_payment?.payment_method || row.grant_type}<div className="text-muted">{row.offline_payment ? money(row.offline_payment.amount_received) : 'Gateway'}</div></td><td className="px-4 py-4"><div className="flex flex-wrap gap-2"><button onClick={() => { setSelectedMember(row.member); setAssignment({ ...assignment, planId: row.plan_id }); selectTab('assign'); }} className="rounded-lg border border-border px-2 py-1">Manage</button>{row.status === 'active' && <button onClick={() => void assign('revoke', row)} className="rounded-lg border border-destructive/30 px-2 py-1 text-destructive">Revoke</button>}</div></td></tr>)}</tbody></table>{!rows.length && <div className="p-8 text-center text-sm text-muted">No subscription records match the filters.</div>}</div></section>}

    {tab === 'assign' && <section className="grid gap-5 lg:grid-cols-[1fr_1.3fr]"><div className="rounded-2xl border border-border bg-card p-5"><h2 className="mb-3 flex items-center gap-2 font-bold"><Search className="h-4 w-4 text-primary" />Find a registered member</h2><div className="flex gap-2"><input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Profile ID, name, email, mobile" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm" /><button onClick={() => void load()} className="rounded-xl bg-primary px-3 text-primary-foreground"><Search className="h-4 w-4" /></button></div><div className="mt-4 flex flex-col gap-2">{members.map((member) => <button key={member.id} onClick={() => setSelectedMember(member)} className={`rounded-xl border p-3 text-left ${selectedMember?.id === member.id ? 'border-primary bg-primary/5' : 'border-border'}`}><div className="font-bold">{member.name} <span className="font-mono text-muted">{member.profile_id}</span></div><div className="text-xs text-muted">{member.email} · {member.mobile_number}</div><div className="mt-1 text-xs">Current: {member.current_subscription?.plan?.name || 'No active plan'}</div></button>)}</div></div><div className="rounded-2xl border border-border bg-card p-5"><h2 className="mb-1 flex items-center gap-2 font-bold"><UserPlus className="h-4 w-4 text-primary" />Grant Plan Access</h2><p className="mb-4 text-xs text-muted">Manual assignments create a subscription and an offline record. They never create or complete a gateway payment.</p>{selectedMember ? <div className="flex flex-col gap-3"><div className="rounded-xl bg-surface p-3 text-sm"><strong>{selectedMember.name}</strong><div className="text-xs text-muted">{selectedMember.profile_id} · {selectedMember.email || selectedMember.mobile_number}</div></div><label className="text-xs font-semibold">Membership plan<select disabled={plansLoading || Boolean(plansError) || !plans.length} value={assignment.planId} onChange={(e) => setAssignment({ ...assignment, planId: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"><option value="">{plansLoading ? 'Loading membership plans...' : plansError ? 'Unable to load membership plans. Please try again.' : !plans.length ? 'No active membership plans available.' : 'Select an active plan'}</option>{plans.filter((p) => p.is_active !== false).map((p) => <option key={p.id} value={p.id}>{p.name} · {money(p.price)} · {p.duration_days} days</option>)}</select></label>{plansError && <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"><span>{plansError}</span><button type="button" onClick={() => void loadPlans()} className="shrink-0 rounded-lg border border-destructive/30 px-2 py-1 font-semibold">Retry</button></div>}{!plansLoading && !plansError && !plans.length && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800">No active membership plans available. <Link href="/admin/membership?tab=plans" className="font-bold underline">Open Membership Plan Management</Link></div>}{plans.find((plan) => plan.id === assignment.planId) && <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm"><div className="flex flex-wrap items-start justify-between gap-2"><div><div className="font-bold">{plans.find((plan) => plan.id === assignment.planId)?.name}</div><div className="text-xs text-muted">{money(plans.find((plan) => plan.id === assignment.planId)?.price)} · {plans.find((plan) => plan.id === assignment.planId)?.duration_days} days</div></div><span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-700">Active plan</span></div><p className="mt-2 text-xs text-muted">{plans.find((plan) => plan.id === assignment.planId)?.description || 'No description provided.'}</p><div className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><div>Contacts: {plans.find((plan) => plan.id === assignment.planId)?.contact_view_limit ?? 0}</div><div>Messaging: {plans.find((plan) => plan.id === assignment.planId)?.messaging_enabled ? 'Allowed' : 'Not included'}</div><div>Photos: {plans.find((plan) => plan.id === assignment.planId)?.photo_viewing_enabled ? 'Allowed' : 'Not included'}</div><div>Premium badge: {plans.find((plan) => plan.id === assignment.planId)?.premium_badge_eligible ? 'Eligible' : 'Not included'}</div><div>Search: {plans.find((plan) => plan.id === assignment.planId)?.search_enabled ? 'Advanced' : 'Basic'}</div><div>Start: {assignment.startDate ? new Date(assignment.startDate).toLocaleString() : 'Effective immediately'}</div><div>Expiry: {assignment.endDate ? new Date(assignment.endDate).toLocaleString() : 'Calculated from plan duration'}</div></div>{planFeatureItems(plans.find((plan) => plan.id === assignment.planId)!).length > 0 && <div className="mt-3"><div className="text-xs font-semibold">Features and benefits</div><ul className="mt-1 list-inside list-disc text-xs text-muted">{planFeatureItems(plans.find((plan) => plan.id === assignment.planId)!).map((feature, index) => <li key={`${feature}-${index}`}>{feature}</li>)}</ul></div>}</div>}<div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Start date<input type="datetime-local" value={assignment.startDate} onChange={(e) => setAssignment({ ...assignment, startDate: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" /></label><label className="text-xs font-semibold">Expiry date (optional)<input type="datetime-local" value={assignment.endDate} onChange={(e) => setAssignment({ ...assignment, endDate: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" /></label></div><label className="text-xs font-semibold">Payment / grant type<select value={assignment.grantType} onChange={(e) => setAssignment({ ...assignment, grantType: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2">{grantTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Amount received<input type="number" min="0" step="0.01" value={assignment.amountReceived} onChange={(e) => setAssignment({ ...assignment, amountReceived: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" /></label><label className="text-xs font-semibold">Date received<input type="datetime-local" value={assignment.dateReceived} onChange={(e) => setAssignment({ ...assignment, dateReceived: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" /></label></div><label className="text-xs font-semibold">Reference number<input value={assignment.paymentReference} onChange={(e) => setAssignment({ ...assignment, paymentReference: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" /></label><label className="text-xs font-semibold">Internal note / reason<textarea value={assignment.internalNote} onChange={(e) => setAssignment({ ...assignment, internalNote: e.target.value, reason: e.target.value })} rows={3} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" /></label><div className="flex flex-wrap gap-2"><button disabled={plansLoading || Boolean(plansError) || !assignment.planId} onClick={() => void assign(selectedMember.current_subscription ? 'change' : 'assign')} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">Grant Plan Access</button>{selectedMember.current_subscription && <><button onClick={() => void assign('renew', selectedMember.current_subscription)} className="rounded-xl border border-border px-4 py-2 text-xs font-bold">Renew 30 days</button><button onClick={() => void assign('revoke', selectedMember.current_subscription)} className="rounded-xl border border-destructive/30 px-4 py-2 text-xs font-bold text-destructive">Revoke</button></>}</div></div> : <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted">Select a registered member to view membership details.</div>}</div></section>}

    {tab === 'offline' && <SimpleTable title="Offline payment records" rows={offline} columns={['payment_method', 'amount_received', 'payment_reference', 'date_received', 'internal_note', 'created_at']} />}
    {tab === 'audit' && <SimpleTable title="Membership audit history" rows={audit} columns={['action', 'target_user_id', 'subscription_id', 'previous_values', 'new_values', 'reason', 'created_at']} />}

    {showPlanForm ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><form onSubmit={savePlan} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">{editingPlan ? 'Edit Plan' : 'Add Plan'}</h2><button type="button" onClick={() => { setEditingPlan(null); setShowPlanForm(false); setPlanForm(emptyPlan); }}><X className="h-5 w-5" /></button></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Name<input required value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" /></label><label className="text-xs font-semibold">Price<input type="number" min="0" step="0.01" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" /></label><label className="text-xs font-semibold">Duration days<input type="number" min="1" value={planForm.duration_days} onChange={(e) => setPlanForm({ ...planForm, duration_days: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" /></label><label className="text-xs font-semibold">Contact viewing limit<input type="number" min="0" value={planForm.contact_view_limit} onChange={(e) => setPlanForm({ ...planForm, contact_view_limit: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" /></label></div><label className="mt-3 block text-xs font-semibold">Description<textarea value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} rows={2} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" /></label><label className="mt-3 block text-xs font-semibold">Profile visibility benefit<input value={planForm.profile_visibility_benefit} onChange={(e) => setPlanForm({ ...planForm, profile_visibility_benefit: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" /></label><div className="mt-4 grid gap-2 sm:grid-cols-2">{[['is_active', 'Available for new purchases'], ['messaging_enabled', 'Messaging'], ['photo_viewing_enabled', 'Photo viewing'], ['premium_badge_eligible', 'Premium badge'], ['search_enabled', 'Advanced search']].map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-xl bg-surface p-3 text-xs"><input type="checkbox" checked={Boolean(planForm[key])} onChange={(e) => setPlanForm({ ...planForm, [key]: e.target.checked })} />{label}</label>)}</div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => { setEditingPlan(null); setShowPlanForm(false); setPlanForm(emptyPlan); }} className="rounded-xl border border-border px-4 py-2 text-xs">Cancel</button><button type="submit" disabled={loading} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">Save Plan</button></div></form></div> : null}
  </div>;
}

function SimpleTable({ title, rows, columns }: { title: string; rows: any[]; columns: string[] }) {
  return <section className="rounded-2xl border border-border bg-card p-5"><h2 className="mb-4 font-bold">{title}</h2><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-xs"><thead className="bg-surface text-muted"><tr>{columns.map((column) => <th key={column} className="px-3 py-3">{column.replaceAll('_', ' ')}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id || index} className="border-t border-border">{columns.map((column) => <td key={column} className="max-w-xs truncate px-3 py-3">{typeof row[column] === 'object' ? JSON.stringify(row[column]) : String(row[column] ?? '—')}</td>)}</tr>)}</tbody></table>{!rows.length && <div className="p-6 text-center text-sm text-muted">No records found.</div>}</div></section>;
}

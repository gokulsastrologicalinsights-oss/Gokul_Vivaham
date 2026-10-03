$ErrorActionPreference = 'Stop'
# Set PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE and PGSSLMODE=verify-full
# in the process environment. Never pass passwords in command arguments.
if (-not $env:PGHOST -or -not $env:PGDATABASE) { throw 'Set PostgreSQL connection environment variables first.' }
Get-Command pg_dump -ErrorAction Stop | Out-Null
$backupRoot = Join-Path $PSScriptRoot '../backups'
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
$backupPath = Join-Path $backupRoot ('database-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.dump')
& pg_dump --format=custom --no-owner --no-acl --file $backupPath
if ($LASTEXITCODE -ne 0) { throw 'Database backup failed; do not use the incomplete archive.' }
Get-FileHash -Algorithm SHA256 -LiteralPath $backupPath | ConvertTo-Json | Set-Content -LiteralPath ($backupPath + '.sha256.json')
Write-Output 'Database archive created. Encrypt and copy off-site; Storage file bodies require a separate backup.'

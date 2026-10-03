param([Parameter(Mandatory=$true)][string]$Archive, [Parameter(Mandatory=$true)][string]$ExpectedTargetHost)
$ErrorActionPreference = 'Stop'
if ($env:RESTORE_ISOLATED_TARGET -ne 'YES') { throw 'Set RESTORE_ISOLATED_TARGET=YES only for an empty disposable restore database.' }
if (-not $env:PGHOST -or $env:PGHOST -ne $ExpectedTargetHost) { throw 'The restore target host does not match.' }
if ($env:PGHOST -match 'rzhkwoeesgyekyutgyqr') { throw 'Refusing restore against the connected application project.' }
Get-Command pg_restore -ErrorAction Stop | Out-Null
$archivePath = (Resolve-Path -LiteralPath $Archive).Path
$manifest = Get-Content -LiteralPath ($archivePath + '.sha256.json') -Raw | ConvertFrom-Json
if ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash -ne $manifest.Hash) { throw 'Backup checksum mismatch.' }
& pg_restore --list $archivePath | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Invalid backup archive.' }
& pg_restore --exit-on-error --single-transaction --no-owner --no-acl --dbname $env:PGDATABASE $archivePath
if ($LASTEXITCODE -ne 0) { throw 'Restore failed. Do not switch application traffic.' }
Write-Output 'Restore completed. Validate rows, permissions, Auth, Storage bodies and application journeys before acceptance.'

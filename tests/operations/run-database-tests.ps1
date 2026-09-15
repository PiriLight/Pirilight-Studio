$ErrorActionPreference = 'Stop'
$testRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$containerName = "pirilight-org-verify-$PID"
$containerId = $null
try {
  $containerId = docker run --detach --rm --network none --name $containerName --label pirilight.purpose=organization-local-tests -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17
  if ($LASTEXITCODE -ne 0) { throw 'Could not create isolated test container.' }
  $ready = $false
  for ($attempt = 0; $attempt -lt 150; $attempt++) {
    # TCP is available only after the temporary initialization server stops.
    docker exec $containerName pg_isready -h 127.0.0.1 -U postgres 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Milliseconds 300
  }
  if (-not $ready) {
    docker logs $containerName
    throw 'Local PostgreSQL did not become ready.'
  }
  $files = @{
    'supabase/migrations/20260904113505_create_app_users_allowlist.sql' = 'allowlist.sql'
    'supabase/migrations/20260904194745_optimize_app_users_rls.sql' = 'allowlist-rls.sql'
    'supabase/migrations/20260914141357_organization_core.sql' = 'organization.sql'
    'tests/operations/database.sql' = 'test.sql'
    'supabase/migrations/20260915121236_organization_delete.sql' = 'delete.sql'
  }
  foreach ($entry in $files.GetEnumerator()) {
    docker cp (Join-Path $testRoot $entry.Key) "${containerName}:/tmp/$($entry.Value)"
    if ($LASTEXITCODE -ne 0) { throw 'Could not copy test SQL.' }
  }
  docker exec $containerName psql -U postgres -v ON_ERROR_STOP=1 -f /tmp/test.sql
  if ($LASTEXITCODE -ne 0) { throw 'Database verification failed.' }
} finally {
  if ($containerId) {
    $observedId = docker inspect --format '{{.Id}}' $containerName 2>$null
    $labels = docker inspect --format '{{json .Config.Labels}}' $containerName 2>$null | ConvertFrom-Json
    $purpose = $labels.'pirilight.purpose'
    if ($observedId -eq $containerId -and $purpose -eq 'organization-local-tests') {
      docker stop $containerName | Out-Null
    }
  }
}

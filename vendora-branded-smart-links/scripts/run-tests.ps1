$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$log = Join-Path $root ".wrangler-dev-test.log"
$errLog = Join-Path $root ".wrangler-dev-test.err.log"
$testLog = Join-Path $root ".playwright-test.log"
$state = Join-Path $root ".wrangler\state"
$devVars = Join-Path $root ".dev.vars"

Get-CimInstance Win32_Process |
  Where-Object { $_.Name -like "node*" -and $_.CommandLine -like "*vendora-branded-smart-links*wrangler*dev*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Milliseconds 500

if (Test-Path $log) { Remove-Item $log -Force }
if (Test-Path $errLog) { Remove-Item $errLog -Force }
if (Test-Path $testLog) { Remove-Item $testLog -Force }
if (Test-Path $state) { Remove-Item $state -Recurse -Force }
Set-Content -LiteralPath $devVars -Value 'ADMIN_PASSWORD="test-admin-password"' -NoNewline

$proc = Start-Process `
  -FilePath "npx.cmd" `
  -ArgumentList @("wrangler", "dev", "--local", "--ip", "127.0.0.1", "--port", "8791", "--persist-to", ".wrangler/state") `
  -WorkingDirectory $root `
  -PassThru `
  -WindowStyle Hidden `
  -RedirectStandardOutput $log `
  -RedirectStandardError $errLog

try {
  $ready = $false
  for ($i = 0; $i -lt 60; $i++) {
    try {
      $response = Invoke-WebRequest -Uri "http://127.0.0.1:8791/healthz" -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -eq 200) {
        $ready = $true
        break
      }
    } catch {}
    Start-Sleep -Seconds 1
  }

  if (-not $ready) {
    if (Test-Path $log) { Get-Content $log | Write-Host }
    if (Test-Path $errLog) { Get-Content $errLog | Write-Host }
    throw "Wrangler dev did not become ready."
  }

  $env:TEST_BASE_URL = "http://127.0.0.1:8791"
  $prev = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    & npx.cmd playwright test --reporter=line 2>&1 | Tee-Object -FilePath $testLog
  } finally {
    $ErrorActionPreference = $prev
  }
  if ($LASTEXITCODE -ne 0) {
    if (Test-Path $log) { Get-Content $log | Select-Object -Last 80 | Write-Host }
    if (Test-Path $errLog) { Get-Content $errLog | Select-Object -Last 80 | Write-Host }
    exit $LASTEXITCODE
  }
} finally {
  if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
  if (Test-Path $devVars) { Remove-Item $devVars -Force }
  Get-CimInstance Win32_Process |
    Where-Object { $_.Name -like "node*" -and $_.CommandLine -like "*vendora-branded-smart-links*wrangler*dev*" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

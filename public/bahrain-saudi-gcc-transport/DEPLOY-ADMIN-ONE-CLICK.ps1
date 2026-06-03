$ErrorActionPreference = 'Stop'

$TransportDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PublicDir = Resolve-Path (Join-Path $TransportDir '..')

function Step([string]$Message) {
  Write-Host ""
  Write-Host "============================================================" -ForegroundColor DarkCyan
  Write-Host $Message -ForegroundColor Cyan
  Write-Host "============================================================" -ForegroundColor DarkCyan
}

function Try-Web([string]$Url) {
  try {
    $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 20
    return @{ ok = $true; status = $r.StatusCode; content = $r.Content }
  } catch {
    $status = $null
    try { $status = $_.Exception.Response.StatusCode.value__ } catch { }
    return @{ ok = $false; status = $status; error = $_.Exception.Message }
  }
}

Set-Location $PublicDir

Step "1) Checking Cloudflare login"
& npx wrangler whoami | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Wrangler not logged in. Opening Cloudflare login..." -ForegroundColor Yellow
  & npx wrangler login
  if ($LASTEXITCODE -ne 0) {
    throw "Cloudflare login failed. Run this again and finish the browser login."
  }
}
Write-Host "Cloudflare login OK." -ForegroundColor Green

Step "2) Deploying Worker + static assets (public folder)"
& npx wrangler deploy
if ($LASTEXITCODE -ne 0) { throw "Deploy failed. Fix the error above and re-run." }
Write-Host "Deploy complete." -ForegroundColor Green

Step "3) Verifying API health"
$health = Try-Web "https://getvendora.net/api/transport/health"
if (-not $health.ok) {
  throw "Health check failed ($($health.status)). $($health.error)"
}
Write-Host "Health: $($health.status) $($health.content)" -ForegroundColor Green

Step "4) Opening admin"
Start-Process "https://getvendora.net/bahrain-saudi-gcc-transport/admin/"
Write-Host "Opened admin. Use your existing admin password." -ForegroundColor Green


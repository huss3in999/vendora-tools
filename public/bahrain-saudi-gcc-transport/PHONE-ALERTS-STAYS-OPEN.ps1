$ErrorActionPreference = 'Continue'

$TransportDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PublicDir = Resolve-Path (Join-Path $TransportDir '..')
$LogPath = Join-Path $TransportDir ("transport-phone-alerts-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + ".log")

function Stop-WithMessage {
  param([string]$Message)
  Write-Host ""
  Write-Host $Message -ForegroundColor Red
  Write-Host "Log saved at: $LogPath" -ForegroundColor Yellow
  Read-Host "Press ENTER to close"
  Stop-Transcript | Out-Null
  exit 1
}

function Normalize-NtfyWebhook {
  param([string]$Value)
  $text = ($Value | ForEach-Object { "$_".Trim() })
  if ([string]::IsNullOrWhiteSpace($text)) {
    return ''
  }
  if ($text -notmatch '^https?://') {
    $text = "https://ntfy.sh/$text"
  }
  try {
    $uri = [Uri]$text
    if ($uri.Scheme -ne 'https' -and $uri.Scheme -ne 'http') {
      return ''
    }
    return $uri.AbsoluteUri
  } catch {
    return ''
  }
}

Set-Location $PublicDir
Start-Transcript -Path $LogPath -Append | Out-Null

Write-Host "Vendora Transport Phone Alerts Setup" -ForegroundColor Green
Write-Host "This window will stay open and send a real test notification." -ForegroundColor Yellow
Write-Host ""
Write-Host "On your phone:" -ForegroundColor Cyan
Write-Host "1. Install the app named ntfy."
Write-Host "2. Open ntfy and subscribe to one private topic name, for example vendora-hussain-2026."
Write-Host "3. Use the same topic name here. Do not use your phone number."
Write-Host ""

& npx wrangler whoami
if ($LASTEXITCODE -ne 0) {
  Write-Host "Cloudflare login will open in your browser. Finish it, then return here." -ForegroundColor Yellow
  & npx wrangler login
  if ($LASTEXITCODE -ne 0) {
    Stop-WithMessage "Cloudflare login failed."
  }
}

$inputValue = Read-Host "Type your ntfy topic name or full https://ntfy.sh/... URL"
$webhook = Normalize-NtfyWebhook $inputValue
if ([string]::IsNullOrWhiteSpace($webhook)) {
  Stop-WithMessage "Invalid topic/URL. Example: vendora-hussain-2026 or https://ntfy.sh/vendora-hussain-2026"
}

Write-Host ""
Write-Host "Sending a test notification to: $webhook" -ForegroundColor Cyan
try {
  Invoke-WebRequest `
    -Uri $webhook `
    -Method POST `
    -Headers @{ Title = 'Vendora phone alerts test'; Priority = 'high'; Tags = 'bell' } `
    -Body "Vendora Transport phone alerts are connected. If you see this, your phone setup is working." `
    -UseBasicParsing | Out-Null
  Write-Host "Test notification sent. Check your phone now before continuing." -ForegroundColor Green
} catch {
  Write-Host "Test send failed: $($_.Exception.Message)" -ForegroundColor Yellow
  Write-Host "You can still save it, but first check your topic name and internet connection." -ForegroundColor Yellow
}

$confirm = Read-Host "Did the test arrive on your phone? Type Y to save it to Cloudflare"
if ($confirm -notmatch '^(Y|y)$') {
  Stop-WithMessage "Stopped before saving. Subscribe to the same topic in ntfy, then run this again."
}

$webhook | & npx wrangler secret put TRANSPORT_NOTIFY_WEBHOOK_URL
if ($LASTEXITCODE -ne 0) {
  Stop-WithMessage "Saving TRANSPORT_NOTIFY_WEBHOOK_URL failed."
}

$pageVisits = Read-Host "Alert for every page visit too? Type Y for yes, or press ENTER for WhatsApp clicks only"
if ($pageVisits -match '^(Y|y)$') {
  'true' | & npx wrangler secret put TRANSPORT_NOTIFY_PAGEVIEWS
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Page visit alerts enabled by default." -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "DONE. Phone alerts are saved in Cloudflare." -ForegroundColor Green
Write-Host "Admin > Alerts can still pause or activate WhatsApp/page visit alerts." -ForegroundColor Cyan
Write-Host "Log saved at: $LogPath" -ForegroundColor Yellow
Stop-Transcript | Out-Null
Read-Host "Press ENTER to close"

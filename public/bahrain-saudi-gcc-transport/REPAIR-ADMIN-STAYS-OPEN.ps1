$ErrorActionPreference = 'Continue'

$TransportDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PublicDir = Resolve-Path (Join-Path $TransportDir '..')
$LogPath = Join-Path $TransportDir ("transport-admin-repair-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + ".log")

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "============================================================" -ForegroundColor DarkCyan
  Write-Host $Message -ForegroundColor Cyan
  Write-Host "============================================================" -ForegroundColor DarkCyan
}

function Stop-WithMessage {
  param([string]$Message)
  Write-Host ""
  Write-Host $Message -ForegroundColor Red
  Write-Host ""
  Write-Host "Log saved at: $LogPath" -ForegroundColor Yellow
  Read-Host "Press ENTER to keep this window open / finish"
  Stop-Transcript | Out-Null
  exit 1
}

function ConvertTo-PlainText {
  param([securestring]$Secure)
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
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

function Send-TestNotification {
  param([string]$WebhookUrl)
  try {
    Invoke-WebRequest `
      -Uri $WebhookUrl `
      -Method POST `
      -Headers @{ Title = 'Vendora phone alerts test'; Priority = 'high'; Tags = 'bell' } `
      -Body "Vendora Transport phone alerts are connected. If you see this, your phone setup is working." `
      -UseBasicParsing | Out-Null
    Write-Host "Test notification sent. Check your phone now." -ForegroundColor Green
  } catch {
    Write-Host "Could not send the test notification: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "The webhook was saved only if Wrangler succeeded below. Check your phone app topic/subscription." -ForegroundColor Yellow
  }
}

Set-Location $PublicDir
Start-Transcript -Path $LogPath -Append | Out-Null

Write-Host "Vendora Transport Admin Full Repair" -ForegroundColor Green
Write-Host ""
Write-Host "This window will stay open. If anything fails, copy the red error or open the log file." -ForegroundColor Yellow
Write-Host "Working folder: $PublicDir"
Write-Host "Log file: $LogPath"

Write-Step "1. Checking Cloudflare login"
& npx wrangler whoami
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Wrangler is not logged in. Cloudflare login will open in your browser." -ForegroundColor Yellow
  Write-Host "Finish the browser login, then come back to this CMD window." -ForegroundColor Yellow
  & npx wrangler login
  if ($LASTEXITCODE -ne 0) {
    Stop-WithMessage "Cloudflare login failed. Please run this file again and complete the browser login."
  }
}

Write-Step "2. Deploying the live Worker/API"
& npx wrangler deploy
if ($LASTEXITCODE -ne 0) {
  Stop-WithMessage "Deploy failed. The admin API cannot be repaired until deploy succeeds."
}

Write-Step "3. Resetting the admin password secret"
Write-Host "Choose a NEW admin password now. You will type it twice. Use this same password in the admin login page." -ForegroundColor Yellow
$secureOne = Read-Host "New admin password" -AsSecureString
$secureTwo = Read-Host "Type the same password again" -AsSecureString
$plainOne = ConvertTo-PlainText $secureOne
$plainTwo = ConvertTo-PlainText $secureTwo

if ([string]::IsNullOrWhiteSpace($plainOne)) {
  Stop-WithMessage "Password was empty. Nothing was changed."
}

if ($plainOne -ne $plainTwo) {
  Stop-WithMessage "Passwords did not match. Nothing was changed. Run this file again."
}

Write-Host ""
Write-Host "Saving TRANSPORT_ADMIN_TOKEN to Cloudflare..." -ForegroundColor Cyan
$plainOne | & npx wrangler secret put TRANSPORT_ADMIN_TOKEN

if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Automatic password save failed. Trying Wrangler's manual prompt mode now." -ForegroundColor Yellow
  Write-Host "When Wrangler asks for secret value, type the same new password again." -ForegroundColor Yellow
  & npx wrangler secret put TRANSPORT_ADMIN_TOKEN
  if ($LASTEXITCODE -ne 0) {
    Stop-WithMessage "Secret update failed. The log contains Wrangler's exact error."
  }
}

Write-Step "4. Optional phone notification webhook"
$setPhone = Read-Host "Set or replace phone alerts webhook now? Type Y for yes, or press ENTER to skip"
if ($setPhone -match '^(Y|y)$') {
  Write-Host "Phone alerts use the free ntfy app. Install ntfy on your phone, then subscribe to a private topic name." -ForegroundColor Yellow
  Write-Host "You can paste the full URL, like https://ntfy.sh/your-private-topic-name, or type only the topic name." -ForegroundColor Yellow
  $webhookInput = Read-Host "Phone ntfy URL or topic name"
  $webhook = Normalize-NtfyWebhook $webhookInput
  if ([string]::IsNullOrWhiteSpace($webhook)) {
    Write-Host "That does not look like a valid ntfy URL/topic. Skipping phone webhook save." -ForegroundColor Yellow
  } else {
    Write-Host "Using webhook: $webhook" -ForegroundColor Cyan
    Send-TestNotification $webhook
    $webhook | & npx wrangler secret put TRANSPORT_NOTIFY_WEBHOOK_URL
    if ($LASTEXITCODE -ne 0) {
      Write-Host "Phone webhook save failed. You can run this repair again later." -ForegroundColor Yellow
    }
    $enablePageVisits = Read-Host "Send phone alert for every page visit too? Type Y for yes, or press ENTER for WhatsApp clicks only"
    if ($enablePageVisits -match '^(Y|y)$') {
      'true' | & npx wrangler secret put TRANSPORT_NOTIFY_PAGEVIEWS
      if ($LASTEXITCODE -eq 0) {
        Write-Host "Page visit alerts enabled by default. You can pause them later inside Admin > Alerts." -ForegroundColor Green
      }
    }
  }
}

Write-Step "5. Checking live API"
try {
  $health = Invoke-WebRequest -Uri 'https://getvendora.net/api/transport/health' -UseBasicParsing
  Write-Host "Health status: $($health.StatusCode)" -ForegroundColor Green
  Write-Host $health.Content
} catch {
  Stop-WithMessage "Health check failed: $($_.Exception.Message)"
}

try {
  Invoke-WebRequest -Uri 'https://getvendora.net/api/transport/admin?resource=summary' -UseBasicParsing | Out-Null
  Write-Host "Unexpected: admin summary loaded without password. Check security." -ForegroundColor Yellow
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  if ($status -eq 401) {
    Write-Host "Admin API check: 401 Unauthorized is GOOD here. It means the route exists and waits for your new password." -ForegroundColor Green
  } else {
    Write-Host "Admin API check returned HTTP $status" -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "DONE." -ForegroundColor Green
Write-Host "Open this page and use the NEW password you just typed:" -ForegroundColor Cyan
Write-Host "https://getvendora.net/bahrain-saudi-gcc-transport/admin/" -ForegroundColor Cyan
Write-Host ""
Write-Host "Log saved at: $LogPath" -ForegroundColor Yellow

Stop-Transcript | Out-Null
Read-Host "Press ENTER to close"

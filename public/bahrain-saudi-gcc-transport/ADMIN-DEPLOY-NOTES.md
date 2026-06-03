# Vendora Transport Admin Notes

Use the live admin page:

```text
https://getvendora.net/bahrain-saudi-gcc-transport/admin/
```

The admin password is the Cloudflare Worker secret named:

```text
TRANSPORT_ADMIN_TOKEN
```

If everything is broken or you are not sure whether Cloudflare is logged in, run:

```text
START-HERE-REPAIR-ADMIN.cmd
```

That helper stays open, writes a log file, logs into Cloudflare if needed, deploys the Worker, resets the admin password, optionally sets phone alerts, and checks the live API health route.

## One-click deploy (recommended after any updates)

When you edit any site/admin files, run this instead of uploading files manually:

```text
DEPLOY-ADMIN-ONE-CLICK.cmd
```

It will:

- log into Cloudflare if needed
- deploy the Worker + static assets from the `public` folder
- **NOT** change your admin password
- open the live admin page

## What The Errors Mean

If the admin API returns:

```text
401 Unauthorized
```

The API route is working. The password is wrong. Reset `TRANSPORT_ADMIN_TOKEN` and use the new password in the admin login.

If it returns:

```text
404 Not Found
```

The Worker/API route is missing. Run `repair-transport-admin-everything.bat` or `deploy-vendora-live.bat`.

## After Editing Pages

Run:

```text
deploy-vendora-live.bat
```

This keeps the static pages and transport API routes live together:

```text
/api/transport/admin
/bahrain-saudi-gcc-transport/api/transport/admin
/api/transport/whatsapp-lead
```

## Phone Alerts

Phone alerts are sent by the Cloudflare Worker, so they keep working even when your browser is closed.

Set the private webhook with:

```text
set-transport-phone-alerts.bat
```

Then open Admin > Alerts to choose:

- WhatsApp click alerts
- Page visit alerts
- Pause all alerts

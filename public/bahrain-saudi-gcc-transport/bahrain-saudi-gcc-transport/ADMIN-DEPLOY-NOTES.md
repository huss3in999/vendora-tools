# Vendora Transport Admin Notes

Use the live admin page:

```text
https://getvendora.net/bahrain-saudi-gcc-transport/admin/
```

The admin password is the Cloudflare Worker secret named:

```text
TRANSPORT_ADMIN_TOKEN
```

If you do not remember it, reset it from the parent `public` folder by running:

```text
set-transport-admin-password.bat
```

## After Editing Pages

Deploy from the parent `public` folder, not from inside `bahrain-saudi-gcc-transport`.

Run:

```text
deploy-vendora-live.bat
```

This keeps the static pages and the transport API routes live together:

```text
/api/transport/admin
/bahrain-saudi-gcc-transport/api/transport/admin
/api/transport/whatsapp-lead
```

If the admin API returns `401 Unauthorized`, the route is working and only needs the correct password.

If it returns `404 Not Found`, deploy from the parent `public` folder again.

## Phone Alerts

Phone alerts are sent by the Cloudflare Worker, so they keep working even when your browser is closed.

Set the private webhook once:

```text
set-transport-phone-alerts.bat
```

Then open Admin > Alerts to choose:

- WhatsApp click alerts
- Page visit alerts
- Pause all alerts


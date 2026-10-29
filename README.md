# WhatsApp Bulk Sender + Tracker — Setup Guide

This extension includes the following features:

1. **Online status and heartbeat** — The extension sends a heartbeat when it is installed and every 5 minutes, including online/offline status and last-seen time. If the heartbeat stops, the browser may be closed or the system may be offline.
2. **Client details** — Add each client's domain, brand/company name, and mobile number in `extension/config.js`. The dashboard displays these details for each activation.
3. **Browser and system counts** — The dashboard shows total browser activations, total systems (based on device fingerprints), and currently online systems.
4. **Bulk messaging and reports** — Send messages to a list of numbers using saved templates on WhatsApp Web. The server records each number's result (sent or failed, and which template was used), and the dashboard displays the results.

## Project files

```text
extension/
  manifest.json   — Chrome extension manifest (Manifest V3)
  config.js       — Edit for each client (server URL, client details, and API key)
  background.js   — Activation, heartbeat, and bulk-send loop
  content.js      — Handles the Send button on WhatsApp Web
  popup.html/js   — Extension popup (numbers, templates, Start/Stop)
server-node/
  server.js, package.json, dashboard.html — Node.js server (VPS or Node.js hosting)
server-php/
  api.php, dashboard.html — PHP server (shared hosting / cPanel)
```

## Step 1 — Deploy the server

Choose one of the following options.

**Option A — PHP (works with shared hosting)**

1. Upload `api.php` and `dashboard.html` from `server-php/` to a folder on your domain, for example `https://YOUR-DOMAIN.COM/wa/`.
2. Change `API_KEY` near the top of `api.php`, and use the same key in `dashboard.html`.
3. Make sure the data file can be written to by PHP. Set appropriate permissions through cPanel File Manager; avoid overly broad permissions where possible. The file should be created automatically on the first request.
4. Open the dashboard at `https://YOUR-DOMAIN.COM/wa/dashboard.html`.

**Option B — Node.js (VPS or hosting with Node.js support)**

1. Upload the `server-node/` folder to your server and run `npm install`.
2. Set the `API_KEY` environment variable, or update it in `server.js`. The key must match in the server, extension config, and dashboard.
3. Start the server with `node server.js` (or use a process manager such as PM2). The dashboard is available at `http://YOUR-DOMAIN:3000/dashboard.html`. Configure HTTPS and a reverse proxy for production use.

## Step 2 — Configure the extension for each client

1. Open `extension/config.js` and set:
   - `serverUrl` to your server URL, without a trailing slash.
   - `serverType` to `"php"` or `"node"`.
   - `apiKey` to the same secret key configured on the server.
   - `client.domain`, `client.brand`, and `client.mobile` to the client's details.
   - Add message templates in `templates`. The `{brand}` placeholder will be replaced with the client's brand.
2. In `extension/manifest.json`, add your domain under `host_permissions`, replacing the example domain with your actual domain.
3. For each client, edit the configuration files, create a separate ZIP of the `extension/` folder, and share it with them. Icons are optional.

## Step 3 — Load the extension in Chrome

1. Open `chrome://extensions` and turn on **Developer mode** in the top-right corner.
2. Click **Load unpacked** and select the `extension/` folder.
3. Click the extension icon to open its popup. On first use, it should send an activation to the server, which should appear on the dashboard.
4. Before sending messages, sign in to `web.whatsapp.com` by scanning the QR code.

## How to send messages

1. Enter phone numbers in the popup, one number per line (10 digits or with the country code `91`).
2. Choose a template or write a custom message.
3. Only message people who have agreed to receive your messages, and follow WhatsApp's official messaging policies.
4. Click **Start Bulk Send**. Progress appears in the popup, and the result for each number is saved on the server.

## Important: WhatsApp account restrictions

Bulk or automated messaging may violate WhatsApp's terms and can lead to account restrictions or a permanent ban. Use the official WhatsApp Business Platform for compliant messaging at scale, and only contact people who have opted in.

## Notes and limitations

- **Online status:** The extension runs inside the browser, so it reports the browser's online/offline status and heartbeat. It cannot monitor the entire operating system (such as whether the computer is on when the browser is closed). That would require a separate desktop app. On the dashboard, “offline” means the heartbeat has stopped, which could mean the browser is closed or the system is offline.
- **Security:** Version 1 uses a single shared secret key. Keep the dashboard URL private. For PHP hosting, you can add password protection with `.htaccess`. For production use, add per-client API keys and dashboard login.
- **WhatsApp Web changes:** If WhatsApp changes its Send button or page structure, you may need to update the button selector in `content.js`.

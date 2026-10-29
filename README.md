# WhatsApp Bulk Sender + Tracker — Setup Guide

Ye extension tumhare saare features cover karta hai:

1. **Internet connect hote hi info** — Extension install hote hi aur phir har 5 minute me
   server ko heartbeat bhejta hai (online/offline + last seen). Agar heartbeat ruk
   jaye to samjho browser band hai ya system offline hai.
2. **Client details pehle se** — `extension/config.js` me har client ka domain,
   brand/company naam aur mobile daal do, phir extension usko de do. Dashboard par
   har activation ke saath us client ki details dikhegi.
3. **Kitne browsers / kitne systems** — Dashboard par 3 alag numbers: total
   browsers (activations), total systems (alag device fingerprints), aur online now.
4. **Bulk sender + server report** — Number list + pehle se bane templates se
   WhatsApp Web par bulk send, aur har number ka result (sent/failed, kaunsa
   template) server par save — dashboard par dikhega.

## Files

```
extension/
  manifest.json   — Chrome extension ka manifest (Manifest V3)
  config.js       — HAR CLIENT KE LIYE EDIT KARO (server URL, client details, key)
  background.js   — activation, heartbeat, bulk send loop
  content.js      — WhatsApp Web par Send button dabana
  popup.html/js   — extension ka popup (numbers, templates, Start/Stop)
server-node/
  server.js, package.json, dashboard.html   — Node.js server (VPS / Node hosting)
server-php/
  api.php, dashboard.html                   — PHP server (shared hosting / cPanel)
```

## Step 1 — Server apne hosting domain par daalo (ek option chuno)

**Option A — PHP (aasan, shared hosting par chalega):**
1. `server-php/` ke dono files (`api.php`, `dashboard.html`) ko apne domain par
   ek folder me daalo, jaise `https://YOUR-DOMAIN.COM/wa/`.
2. `api.php` me upar `API_KEY` badlo, aur `dashboard.html` me bhi wahi key daalo.
3. `data.json` writable hona chahiye — folder ko 777 ya file ko 666 kar do
   (cPanel File Manager se). Pehli request par file khud ban jayegi.
4. Dashboard kholo: `https://YOUR-DOMAIN.COM/wa/dashboard.html`

**Option B — Node.js (VPS / Node support wali hosting):**
1. `server-node/` folder server par daalo, `npm install` chalao.
2. `API_KEY` environment variable set karo (ya server.js me badlo — teeno jagah
   same key honi chahiye: server, extension config, dashboard).
3. `node server.js` (ya pm2 se) chalao. Dashboard: `http://domain:3000/dashboard.html`
   (domain ke saath reverse proxy lagana ho to apne hisaab se kar lena).

## Step 2 — Extension me client details daalo (har client ke liye alag)

1. `extension/config.js` kholo:
   - `serverUrl` = apna domain (PHP wale `wa` folder ka URL, aakhri `/` nahi)
   - `serverType` = `"php"` ya `"node"`
   - `apiKey` = wahi secret key jo server par daali hai
   - `client.domain`, `client.brand`, `client.mobile` = US client ki details
   - `templates` me apne templates daal sakte ho (`{brand}` ki jagah brand aa jayega)
2. `extension/manifest.json` me `host_permissions` me apna domain daalo:
   `"https://YOUR-DOMAIN.COM/*"` ki jagah apna asli domain
   (PHP wale folder ka domain bhi chalega, jaise `https://YOUR-DOMAIN.COM/wa/*`).
3. Har client ke liye ye 2 files edit karke `extension/` folder ka alag zip banao
   aur client ko de do. (Icons optional hain — bina icons ke bhi chalega.)

## Step 3 — Chrome me load karo

1. Chrome me `chrome://extensions` kholo → upar right me **Developer mode** ON karo.
2. **Load unpacked** → `extension/` folder select karo.
3. Extension ka icon dikhega — us par click karke popup kholo. Pehli baar me hi
   activation server par chali jayegi (dashboard par dikhegi).
4. Bulk send se pehle **web.whatsapp.com par login** kar lo (QR scan).

## Bulk send kaise karein

1. Popup me numbers daalo (ek line me ek number, 10 digit ya 91 ke saath).
2. Template chuno (ya Custom message likho).
3. Delay kam se kam 5–8 second rakho → **Start Bulk Send**.
4. Progress popup me dikhega, aur har number ka result server par save hoga.

## ⚠️ Zaroori chetavni — WhatsApp ban ka risk

WhatsApp par bulk/automated messages bhejna WhatsApp ke rules ke khilaaf hai —
**number ban ho sakta hai**, kabhi-kabhi permanent. Isliye:
- Roz 50–100 se zyada messages ek number se mat bhejo.
- Delay 8 second se kam mat rakho, aur naya number pehle 1–2 hafte normal
  chatting se warm up karo.
- Sirf un numbers ko bhejo jinhone permission di ho ya jo tumhare customers hon.
- Ye tool tumhare apne risk par use karo — ban hone ki zimmedari tumhari hogi.

## Notes (imaandaari se)

- **"System internet"**: Extension browser ke andar chalta hai, isliye wo browser
  ke online/offline status + heartbeat bhejta hai. Poora OS-level monitoring
  (system on/off, bina browser khole) extension se possible nahi hai — uske liye
  alag desktop app chahiye hoti hai. Dashboard par "offline" ka matlab hai:
  heartbeat ruk gaya = browser band ya system offline.
- **Security**: v1 me sirf ek shared secret key hai. Dashboard ka URL kisi ko mat
  do; chaaho to folder par `.htaccess` password laga do (PHP) — asli production
  ke liye per-client keys + login wala version banana chahiye.
- **WhatsApp Web badal sakta hai**: Agar WhatsApp apna send button ya page
  structure badal de to `content.js` me button ka selector update karna padega.

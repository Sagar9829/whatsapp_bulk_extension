// WhatsApp Bulk Sender — Dashboard server (Node.js + Express)
// Chalane ka tareeka:  npm install   phir   node server.js
// Dashboard: http://localhost:3000/dashboard.html
// Apne hosting domain par daalne ke liye: is folder ko server par daalo,
// API_KEY environment variable set karo, aur process manager (pm2) se chalao.

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

// config.js wali apiKey yahan bhi same honi chahiye
const API_KEY = process.env.API_KEY || "change-this-secret-key";

const DB = path.join(__dirname, "data.json");
function load() {
  try { return JSON.parse(fs.readFileSync(DB, "utf8")); }
  catch (e) { return { activations: {}, reports: [] }; }
}
function save(db) { fs.writeFileSync(DB, JSON.stringify(db, null, 2)); }

// Extension + dashboard dono ke liye key check
function auth(req, res, next) {
  const k = req.headers["x-api-key"] || req.query.key;
  if (k !== API_KEY) return res.status(401).json({ ok: false, error: "unauthorized" });
  next();
}

// ---------- Extension endpoints ----------
// Naya install ya dobara khulna — kaunsa client, kaunsa browser, kaunsa system
app.post("/api/activate", auth, (req, res) => {
  const db = load();
  const b = req.body || {};
  const old = db.activations[b.installId] || {};
  db.activations[b.installId] = {
    installId: b.installId,
    deviceId: b.deviceId || "",
    client: b.client || {},
    browser: b.browser || "",
    platform: b.platform || "",
    version: b.version || "",
    firstSeen: old.firstSeen || Date.now(),
    lastSeen: Date.now(),
    online: !!b.online
  };
  save(db);
  res.json({ ok: true });
});

// Har kuch minute ka online signal
app.post("/api/heartbeat", auth, (req, res) => {
  const db = load();
  const b = req.body || {};
  const a = db.activations[b.installId];
  if (a) { a.lastSeen = Date.now(); a.online = !!b.online; save(db); }
  res.json({ ok: true });
});

// Har bheja gaya message — kaunsa number, kaunsa template, sent/failed
app.post("/api/report", auth, (req, res) => {
  const db = load();
  db.reports.push({ ...(req.body || {}), ts: (req.body && req.body.ts) || Date.now() });
  if (db.reports.length > 5000) db.reports = db.reports.slice(-5000);
  save(db);
  res.json({ ok: true });
});

// ---------- Dashboard endpoints ----------
app.get("/api/stats", auth, (req, res) => {
  const db = load();
  const now = Date.now();
  const acts = Object.values(db.activations);
  const onlineNow = acts.filter(a => now - a.lastSeen < 10 * 60 * 1000 && a.online).length;
  const systems = new Set(acts.map(a => a.deviceId)).size;
  const byClient = {};
  acts.forEach(a => {
    const k = (a.client && a.client.brand) || "unknown";
    byClient[k] = (byClient[k] || 0) + 1;
  });
  res.json({
    totalBrowsers: acts.length,
    totalSystems: systems,
    onlineNow,
    byClient,
    sent: db.reports.filter(r => r.status === "sent").length,
    failed: db.reports.filter(r => r.status === "failed").length
  });
});

app.get("/api/activations", auth, (req, res) => {
  res.json(Object.values(load().activations));
});

app.get("/api/reports", auth, (req, res) => {
  res.json(load().reports.slice(-200).reverse());
});

app.use(express.static(__dirname));
app.listen(3000, () => console.log("Dashboard: http://localhost:3000/dashboard.html"));

// Background service worker: activation + heartbeat + bulk send orchestration
importScripts("config.js");

const INSTALL_KEY = "installId";
const DEVICE_KEY = "deviceId";

// ---------- IDs ----------
async function getOrCreateId(key) {
  const data = await chrome.storage.local.get(key);
  if (data[key]) return data[key];
  const id = (self.crypto && self.crypto.randomUUID)
    ? self.crypto.randomUUID()
    : ("id-" + Date.now() + "-" + Math.floor(Math.random() * 1e9));
  await chrome.storage.local.set({ [key]: id });
  return id;
}

// System fingerprint — ek system par ek hi rahega, alag system par alag
async function deviceFingerprint() {
  const stored = await chrome.storage.local.get(DEVICE_KEY);
  if (stored[DEVICE_KEY]) return stored[DEVICE_KEY];
  const raw = [navigator.userAgent, navigator.platform,
    Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.language].join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  const fp = "sys-" + hash.toString(36);
  await chrome.storage.local.set({ [DEVICE_KEY]: fp });
  return fp;
}

// ---------- Server calls ----------
function apiUrl(action) {
  if (EXT_CONFIG.serverType === "php") return EXT_CONFIG.serverUrl + "/api.php?action=" + action;
  return EXT_CONFIG.serverUrl + "/api/" + action;
}

async function post(action, body) {
  try {
    await fetch(apiUrl(action), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": EXT_CONFIG.apiKey },
      body: JSON.stringify(body)
    });
    return true;
  } catch (e) { return false; }
}

// ---------- Activation + heartbeat ----------
// Install hote hi server ko batao: kaunsa client, kaunsa browser, kaunsa system
async function reportActivation() {
  const installId = await getOrCreateId(INSTALL_KEY);
  const deviceId = await deviceFingerprint();
  await post("activate", {
    installId, deviceId,
    client: EXT_CONFIG.client,
    browser: navigator.userAgent,
    platform: navigator.platform,
    version: chrome.runtime.getManifest().version,
    online: navigator.onLine,
    ts: Date.now()
  });
}

// Har kuch minute me online signal — isse dashboard par "online now" dikhta hai.
// Agar heartbeat ruk jaye to samjho browser band hai ya system offline hai.
async function heartbeat() {
  const installId = await getOrCreateId(INSTALL_KEY);
  const deviceId = await deviceFingerprint();
  await post("heartbeat", { installId, deviceId, online: navigator.onLine, ts: Date.now() });
}

function ensureAlarm() {
  chrome.alarms.create("heartbeat", { periodInMinutes: EXT_CONFIG.heartbeatMinutes });
}

chrome.runtime.onInstalled.addListener(() => { ensureAlarm(); reportActivation(); heartbeat(); });
chrome.runtime.onStartup.addListener(() => { ensureAlarm(); heartbeat(); });
chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === "heartbeat") heartbeat(); });

// ---------- Bulk send (background chalata hai, content script Send dabata hai) ----------
let bulkJob = null;

async function getWhatsAppTab() {
  const tabs = await chrome.tabs.query({ url: "https://web.whatsapp.com/*" });
  if (tabs.length) return tabs[0].id;
  const tab = await chrome.tabs.create({ url: "https://web.whatsapp.com" });
  return tab.id;
}

async function waitTabComplete(tabId, timeout = 30000) {
  try {
    const t = await chrome.tabs.get(tabId);
    if (t.status === "complete") return true;
  } catch (e) { return false; }
  return new Promise((resolve) => {
    const timer = setTimeout(() => { chrome.tabs.onUpdated.removeListener(listener); resolve(false); }, timeout);
    function listener(id, info) {
      if (id === tabId && info.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(true);
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function sendClick(tabId, timeout = 25000) {
  try {
    const res = await Promise.race([
      chrome.tabs.sendMessage(tabId, { type: "CLICK_SEND" }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), timeout))
    ]);
    return res || { ok: false, error: "no response" };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

async function runBulkJob(numbers, text, templateName, delayMs) {
  bulkJob = { stop: false, total: numbers.length, done: 0, results: [], finished: false };
  await chrome.storage.local.set({ bulkProgress: bulkJob });
  const tabId = await getWhatsAppTab();
  await waitTabComplete(tabId);
  const installId = await getOrCreateId(INSTALL_KEY);

  for (const raw of numbers) {
    if (bulkJob.stop) break;
    const digits = String(raw).replace(/\D/g, "");
    const phone = digits.length === 10 ? "91" + digits : digits;
    let status = "failed", error = "";
    try {
      await chrome.tabs.update(tabId, {
        url: "https://web.whatsapp.com/send?phone=" + phone + "&text=" + encodeURIComponent(text)
      });
      await waitTabComplete(tabId);
      await new Promise(r => setTimeout(r, 2000));
      const res = await sendClick(tabId);
      if (res.ok) status = "sent"; else error = res.error || "send failed";
    } catch (e) { error = String((e && e.message) || e); }

    bulkJob.results.push({ number: phone, status, error });
    bulkJob.done++;
    await chrome.storage.local.set({ bulkProgress: bulkJob });
    // Har number ka result server par — dashboard par dikhega
    post("report", {
      installId, client: EXT_CONFIG.client,
      number: phone, template: templateName, status, error, ts: Date.now()
    });

    if (bulkJob.done < numbers.length && !bulkJob.stop) {
      await new Promise(r => setTimeout(r, delayMs + Math.floor(Math.random() * 3000)));
    }
  }
  bulkJob.finished = true;
  await chrome.storage.local.set({ bulkProgress: bulkJob });
}

// ---------- Popup se messages ----------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_STATUS") {
    Promise.all([getOrCreateId(INSTALL_KEY), deviceFingerprint()]).then(([installId, deviceId]) => {
      sendResponse({
        installId, deviceId,
        client: EXT_CONFIG.client,
        online: navigator.onLine,
        serverUrl: EXT_CONFIG.serverUrl
      });
    });
    return true;
  }
  if (msg.type === "START_BULK") {
    if (bulkJob && !bulkJob.finished) { sendResponse({ ok: false, error: "already running" }); return true; }
    runBulkJob(msg.numbers, msg.text, msg.templateName, msg.delayMs);
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === "STOP_BULK") {
    if (bulkJob) bulkJob.stop = true;
    sendResponse({ ok: true });
    return true;
  }
});

const $ = (id) => document.getElementById(id);

function renderProgress(p) {
  if (!p) { $("progress").textContent = ""; $("log").textContent = ""; return; }
  $("progress").textContent = p.done + " / " + p.total + (p.finished ? " — poora ho gaya ✅" : " — chal raha hai...");
  $("log").textContent = p.results.slice(-8)
    .map(r => r.number + " → " + r.status + (r.error ? " (" + r.error + ")" : ""))
    .join("\n");
}

async function refreshProgress() {
  const d = await chrome.storage.local.get("bulkProgress");
  renderProgress(d.bulkProgress);
}

async function init() {
  $("brand").textContent = EXT_CONFIG.client.brand + " — Bulk Sender";
  try {
    const st = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
    $("status").textContent = (st.online ? "🟢 Online" : "🔴 Offline") + " | Server: " + st.serverUrl;
    $("clientBox").innerHTML =
      "<b>Domain:</b> " + st.client.domain + "<br>" +
      "<b>Brand:</b> " + st.client.brand + "<br>" +
      "<b>Mobile:</b> " + st.client.mobile + "<br>" +
      "<b>Install ID:</b> " + st.installId.slice(0, 8) + "...";
  } catch (e) {
    $("status").textContent = "Status nahi mila";
  }

  const sel = $("template");
  EXT_CONFIG.templates.forEach((t, i) => {
    const o = document.createElement("option");
    o.value = i; o.textContent = t.name;
    sel.appendChild(o);
  });
  const co = document.createElement("option");
  co.value = "custom"; co.textContent = "Custom message (neeche likho)";
  sel.appendChild(co);

  $("start").onclick = async () => {
    const numbers = $("numbers").value.split("\n").map(s => s.trim()).filter(Boolean);
    if (!numbers.length) { alert("Pehle numbers daalo (ek line me ek number)."); return; }
    let text, templateName;
    if (sel.value === "custom") {
      text = $("customText").value.trim();
      templateName = "Custom";
      if (!text) { alert("Custom message likho ya template chuno."); return; }
    } else {
      const t = EXT_CONFIG.templates[Number(sel.value)];
      text = t.text.replaceAll("{brand}", EXT_CONFIG.client.brand);
      templateName = t.name;
    }
    const delaySec = Math.max(5, parseInt($("delay").value || "8", 10));
    $("log").textContent = "Shuru ho raha hai... (WhatsApp Web tab khulega)";
    await chrome.runtime.sendMessage({ type: "START_BULK", numbers, text, templateName, delayMs: delaySec * 1000 });
  };

  $("stop").onclick = async () => {
    await chrome.runtime.sendMessage({ type: "STOP_BULK" });
  };

  setInterval(refreshProgress, 2000);
  refreshProgress();
}

document.addEventListener("DOMContentLoaded", init);

// WhatsApp Web par chalta hai — sirf Send button dabane ka kaam.
// Poora bulk loop background.js chalata hai (tab navigation + delay + report),
// kyunki page badalte hi content script dobara load hota hai.

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForSendButton(timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const btn = document.querySelector('span[data-icon="send"]')?.closest('button')
      || document.querySelector('div[aria-label="Send"]');
    if (btn) return btn;
    await sleep(1000);
  }
  return null;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "CLICK_SEND") {
    (async () => {
      // Send wale link se chat khulne par text pehle se bhara hota hai
      await sleep(1500);
      const btn = await waitForSendButton(20000);
      if (!btn) { sendResponse({ ok: false, error: "send button nahi mila (number WhatsApp par nahi ya login nahi)" }); return; }
      btn.click();
      await sleep(1500);
      sendResponse({ ok: true });
    })();
    return true; // async jawab ke liye channel khula rakho
  }
});

// ============================================================================
// CLIENT CONFIG — HAR CLIENT KE LIYE YE FILE EDIT KARO, PHIR EXTENSION DO
// ============================================================================
// Extension kisi ko dene se PEHLE:
//   1. serverUrl me apna hosting domain daalo (https ke saath, aakhri / nahi)
//   2. client me US client ka domain, brand/company naam aur mobile daalo
//   3. apiKey me ek secret key daalo — yehi key server par bhi same honi chahiye
//   4. manifest.json ke host_permissions me bhi apna domain daal do
//   5. serverType: "node" (Node server) ya "php" (shared hosting / cPanel)
// ============================================================================
const EXT_CONFIG = {
  serverUrl: "https://YOUR-DOMAIN.COM",
  serverType: "php", // "node" ya "php"
  apiKey: "change-this-secret-key",

  client: {
    domain: "client-ka-domain.com", // client ki website/domain
    brand: "Client Brand Name",     // brand/company ka naam
    mobile: "+91XXXXXXXXXX"         // client ka mobile number
  },

  heartbeatMinutes: 5, // kitni der me server ko online signal bhejna hai
  sendDelayMs: 8000,   // bulk send me 2 numbers ke beech gap — kam mat karo (ban risk)

  // Pehle se banaye hue templates — {brand} ki jagah client ka brand aa jayega
  templates: [
    {
      name: "Greeting",
      text: "Namaste 🙏 Main {brand} se bol raha hoon. Aapke liye ek khaas offer hai — details chahiye to reply karein."
    },
    {
      name: "Offer",
      text: "Namaste 🙏 {brand} ki taraf se special offer! Professional website sirf ₹2,999–₹4,999 (one-time). Details ke liye reply karein 😊"
    },
    {
      name: "Follow-up",
      text: "Namaste 🙏 Kal wale message ke baare me — kya aapko website ki details chahiye? Sample bhej dunga 😊"
    }
  ]
};

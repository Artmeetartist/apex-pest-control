/**
 * Apex Pest Solutions — Lead capture + auto-reply
 * Google Apps Script Web App backend for the website forms.
 *
 * What it does
 *  - Receives POSTs from the site (contact form + booking modal)
 *  - Appends each submission to a Google Sheet ("Leads" / "Bookings" tabs)
 *  - Sends the customer an automatic confirmation email (branded)
 *  - Emails an internal notification to your inbox
 *
 * Setup: see apps-script/README.md. Edit the CONFIG block below, then
 * Deploy > New deployment > Web app (Execute as: Me, Access: Anyone).
 */

/* ============================ CONFIG ============================ */
var CONFIG = {
  // Leave "" when this script is bound to the Sheet (Extensions > Apps Script
  // from inside the spreadsheet). For a STANDALONE script, paste the Sheet ID
  // (the long id in the sheet URL: /spreadsheets/d/THIS_PART/edit).
  SPREADSHEET_ID: "",

  BOOKINGS_SHEET: "Bookings",
  LEADS_SHEET: "Leads",

  BUSINESS_NAME: "Apex Pest Solutions",
  BUSINESS_PHONE: "(281) 555-0123",
  BUSINESS_PHONE_TEL: "+12815550123",
  BUSINESS_EMAIL: "hello@apexpestsolutions.com",
  WEBSITE_URL: "https://artmeetartist.github.io/apex-pest-control/",

  // Internal notifications (new lead/booking alerts) go here:
  NOTIFY_EMAIL: "hello@apexpestsolutions.com",

  // Optional shared secret. If set, the site must send the same value as
  // CONFIG.forms.accessKey. Leave "" to accept any submission.
  SHARED_SECRET: "",

  // ---- Realistic AI voice (optional) ----
  // Human-sounding voice for the assistant's spoken replies.
  //   "off" (default) | "elevenlabs" | "openai"
  // Put the API KEY in Project Settings > Script properties (NOT here):
  //   key name  ELEVENLABS_API_KEY   or   OPENAI_API_KEY
  // Also set CONFIG.tts.enabled = true in the site's script.js.
  TTS_PROVIDER: "off",
  ELEVENLABS_VOICE_ID: "21m00Tcm4TlvDq8ikWAM", // "Rachel" — any ElevenLabs voice id
  ELEVENLABS_MODEL: "eleven_turbo_v2_5",
  OPENAI_TTS_VOICE: "nova",   // alloy | echo | fable | onyx | nova | shimmer
  OPENAI_TTS_MODEL: "tts-1",

  // Brand colors used in the emails
  BRAND: "#075B43",
  ACCENT: "#0A6E51"
};

/* ============================ ROUTING ============================ */
function doPost(e) {
  try {
    var data = parseBody(e);

    // Spam honeypot — the site leaves these blank; bots fill them.
    if (data.company || data.website) {
      return json({ result: "success", spam: true });
    }
    // Optional shared-secret gate
    if (CONFIG.SHARED_SECRET && data.access_key !== CONFIG.SHARED_SECRET) {
      return json({ result: "error", message: "Unauthorized" });
    }

    // Text-to-speech proxy for the assistant's realistic voice
    if (String(data.type || "").toLowerCase() === "tts") return handleTTS(data);

    var type = String(data.formType || "").toLowerCase();
    return (type === "booking") ? handleBooking(data) : handleLead(data);
  } catch (err) {
    return json({ result: "error", message: String(err) });
  }
}

// Health check — visiting the /exec URL in a browser confirms it's live.
function doGet() {
  return json({ result: "ok", service: CONFIG.BUSINESS_NAME + " lead endpoint" });
}

/* ============================ VOICE (TTS proxy) ============================ */
// Converts reply text to speech using a neural TTS provider, keeping the API
// key server-side. Returns { audio: <base64 mp3>, mime: "audio/mpeg" }.
function handleTTS(d) {
  var text = String(d.text || "").replace(/\s+/g, " ").trim().slice(0, 800);
  if (!text) return json({ result: "error", message: "No text" });
  var provider = String(CONFIG.TTS_PROVIDER || "off").toLowerCase();
  if (provider === "elevenlabs") return ttsElevenLabs(text);
  if (provider === "openai") return ttsOpenAI(text);
  return json({ result: "error", message: "TTS is off (set CONFIG.TTS_PROVIDER)" });
}

function ttsElevenLabs(text) {
  var key = PropertiesService.getScriptProperties().getProperty("ELEVENLABS_API_KEY");
  if (!key) return json({ result: "error", message: "Missing ELEVENLABS_API_KEY in Script properties" });
  var url = "https://api.elevenlabs.io/v1/text-to-speech/" + encodeURIComponent(CONFIG.ELEVENLABS_VOICE_ID) + "?output_format=mp3_44100_128";
  var resp = UrlFetchApp.fetch(url, {
    method: "post",
    headers: { "xi-api-key": key, "accept": "audio/mpeg" },
    contentType: "application/json",
    payload: JSON.stringify({ text: text, model_id: CONFIG.ELEVENLABS_MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
    muteHttpExceptions: true
  });
  if (resp.getResponseCode() !== 200) return json({ result: "error", message: "ElevenLabs " + resp.getResponseCode() + ": " + resp.getContentText().slice(0, 180) });
  return json({ result: "success", mime: "audio/mpeg", audio: Utilities.base64Encode(resp.getBlob().getBytes()) });
}

function ttsOpenAI(text) {
  var key = PropertiesService.getScriptProperties().getProperty("OPENAI_API_KEY");
  if (!key) return json({ result: "error", message: "Missing OPENAI_API_KEY in Script properties" });
  var resp = UrlFetchApp.fetch("https://api.openai.com/v1/audio/speech", {
    method: "post",
    headers: { "Authorization": "Bearer " + key },
    contentType: "application/json",
    payload: JSON.stringify({ model: CONFIG.OPENAI_TTS_MODEL, voice: CONFIG.OPENAI_TTS_VOICE, input: text, response_format: "mp3" }),
    muteHttpExceptions: true
  });
  if (resp.getResponseCode() !== 200) return json({ result: "error", message: "OpenAI " + resp.getResponseCode() + ": " + resp.getContentText().slice(0, 180) });
  return json({ result: "success", mime: "audio/mpeg", audio: Utilities.base64Encode(resp.getBlob().getBytes()) });
}

/* ============================ HANDLERS ============================ */
function handleBooking(d) {
  var headers = ["Timestamp", "Reference", "Service", "Date", "Time", "Name", "Phone", "Email", "Address", "Message", "Source"];
  var sh = sheetWithHeaders(CONFIG.BOOKINGS_SHEET, headers);
  var ref = d.reference || generateRef();
  sh.appendRow([new Date(), ref, d.service || "", d.date || "", d.time || "",
    d.name || "", d.phone || "", d.email || "", d.address || "", d.message || "", d.source || "Website"]);

  if (isEmail(d.email)) {
    sendEmail(d.email,
      "Your inspection is booked — " + CONFIG.BUSINESS_NAME + " (" + ref + ")",
      bookingCustomerEmail(d, ref));
  }
  notifyOwner("New inspection booked — " + ref, bookingOwnerEmail(d, ref));

  return json({ result: "success", type: "booking", reference: ref });
}

function handleLead(d) {
  var headers = ["Timestamp", "Name", "Phone", "Email", "Service", "Message", "Source"];
  var sh = sheetWithHeaders(CONFIG.LEADS_SHEET, headers);
  sh.appendRow([new Date(), d.name || "", d.phone || "", d.email || "",
    d.service || "", d.message || "", d.source || "Website"]);

  if (isEmail(d.email)) {
    sendEmail(d.email,
      "Thanks for reaching out — " + CONFIG.BUSINESS_NAME,
      leadCustomerEmail(d));
  }
  notifyOwner("New website lead — " + (d.name || "Unknown"), leadOwnerEmail(d));

  return json({ result: "success", type: "lead" });
}

/* ============================ SHEET HELPERS ============================ */
function book() {
  return CONFIG.SPREADSHEET_ID
    ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

function sheetWithHeaders(name, headers) {
  var ss = book();
  if (!ss) throw new Error("No spreadsheet found. Set CONFIG.SPREADSHEET_ID or bind the script to a Sheet.");
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold").setBackground(CONFIG.BRAND).setFontColor("#ffffff");
    sh.setFrozenRows(1);
    sh.setColumnWidths(1, headers.length, 150);
  }
  return sh;
}

/* ============================ EMAIL ============================ */
function sendEmail(to, subject, htmlBody) {
  MailApp.sendEmail({
    to: to, subject: subject, htmlBody: htmlBody,
    name: CONFIG.BUSINESS_NAME, replyTo: CONFIG.BUSINESS_EMAIL
  });
}

function notifyOwner(subject, htmlBody) {
  if (isEmail(CONFIG.NOTIFY_EMAIL)) {
    MailApp.sendEmail({ to: CONFIG.NOTIFY_EMAIL, subject: subject, htmlBody: htmlBody, name: CONFIG.BUSINESS_NAME });
  }
}

/* ---- Customer: booking confirmation ---- */
function bookingCustomerEmail(d, ref) {
  var rows =
    detailRow("Service", d.service) +
    detailRow("Date", d.date) +
    detailRow("Time", d.time) +
    detailRow("Address", d.address);
  var body =
    "<p style=\"margin:0 0 14px\">Hi " + esc(firstName(d.name)) + ",</p>" +
    "<p style=\"margin:0 0 18px\">Great news — your free pest inspection is <strong>booked</strong>. " +
    "Our team will call you shortly to confirm the details below.</p>" +
    refBox(ref) +
    "<table style=\"width:100%;border-collapse:collapse;margin:6px 0 20px\">" + rows + "</table>" +
    "<p style=\"margin:0 0 18px\">Need to change anything or have a question? Just call us at " +
      "<a href=\"tel:" + CONFIG.BUSINESS_PHONE_TEL + "\" style=\"color:" + CONFIG.ACCENT + ";font-weight:700;text-decoration:none\">" +
      esc(CONFIG.BUSINESS_PHONE) + "</a> — we're available 24/7.</p>" +
    ctaButton("Call " + CONFIG.BUSINESS_PHONE, "tel:" + CONFIG.BUSINESS_PHONE_TEL);
  return emailShell("You're booked! 🎉", body);
}

/* ---- Customer: contact acknowledgement ---- */
function leadCustomerEmail(d) {
  var body =
    "<p style=\"margin:0 0 14px\">Hi " + esc(firstName(d.name)) + ",</p>" +
    "<p style=\"margin:0 0 18px\">Thanks for reaching out to " + esc(CONFIG.BUSINESS_NAME) + "! " +
    "We've received your message and a member of our team will get back to you shortly — usually within the hour.</p>" +
    (d.message ? "<table style=\"width:100%;border-collapse:collapse;margin:6px 0 20px\">" +
      detailRow("Service", d.service) + detailRow("Your message", d.message) + "</table>" : "") +
    "<p style=\"margin:0 0 18px\">Need help sooner? We're available 24/7 at " +
      "<a href=\"tel:" + CONFIG.BUSINESS_PHONE_TEL + "\" style=\"color:" + CONFIG.ACCENT + ";font-weight:700;text-decoration:none\">" +
      esc(CONFIG.BUSINESS_PHONE) + "</a>.</p>" +
    ctaButton("Call " + CONFIG.BUSINESS_PHONE, "tel:" + CONFIG.BUSINESS_PHONE_TEL);
  return emailShell("We got your message 👋", body);
}

/* ---- Owner notifications ---- */
function bookingOwnerEmail(d, ref) {
  var rows = detailRow("Reference", ref) + detailRow("Service", d.service) + detailRow("Date", d.date) +
    detailRow("Time", d.time) + detailRow("Name", d.name) + detailRow("Phone", d.phone) +
    detailRow("Email", d.email) + detailRow("Address", d.address) + detailRow("Message", d.message) +
    detailRow("Source", d.source);
  return emailShell("New inspection booked",
    "<p style=\"margin:0 0 16px\">A new inspection was booked from the website:</p>" +
    "<table style=\"width:100%;border-collapse:collapse\">" + rows + "</table>");
}

function leadOwnerEmail(d) {
  var rows = detailRow("Name", d.name) + detailRow("Phone", d.phone) + detailRow("Email", d.email) +
    detailRow("Service", d.service) + detailRow("Message", d.message) + detailRow("Source", d.source);
  return emailShell("New website lead",
    "<p style=\"margin:0 0 16px\">A new lead came in from the website:</p>" +
    "<table style=\"width:100%;border-collapse:collapse\">" + rows + "</table>");
}

/* ---- Shared email pieces ---- */
function emailShell(heading, innerHtml) {
  return "" +
  "<div style=\"margin:0;padding:24px;background:#f4faf7;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#101918\">" +
    "<div style=\"max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E3E8E6\">" +
      "<div style=\"background:" + CONFIG.BRAND + ";padding:22px 28px;color:#fff\">" +
        "<div style=\"font-size:18px;font-weight:800;letter-spacing:-.02em\">" + esc(CONFIG.BUSINESS_NAME) + "</div>" +
        "<div style=\"font-size:20px;font-weight:800;margin-top:4px\">" + esc(heading) + "</div>" +
      "</div>" +
      "<div style=\"padding:26px 28px;font-size:15px;line-height:1.6\">" + innerHtml + "</div>" +
      "<div style=\"padding:16px 28px;background:#f4faf7;border-top:1px solid #E3E8E6;font-size:12px;color:#68716F\">" +
        esc(CONFIG.BUSINESS_NAME) + " · Houston Metro &amp; Surrounding Areas · " +
        "<a href=\"tel:" + CONFIG.BUSINESS_PHONE_TEL + "\" style=\"color:" + CONFIG.ACCENT + ";text-decoration:none\">" + esc(CONFIG.BUSINESS_PHONE) + "</a>" +
      "</div>" +
    "</div>" +
  "</div>";
}

function refBox(ref) {
  return "<div style=\"background:#E8F5EF;border:1px dashed " + CONFIG.ACCENT + ";border-radius:12px;padding:14px;text-align:center;margin:0 0 18px\">" +
    "<div style=\"font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#68716F;font-weight:700\">Confirmation number</div>" +
    "<div style=\"font-size:22px;font-weight:800;color:" + CONFIG.BRAND + ";letter-spacing:.04em\">" + esc(ref) + "</div>" +
  "</div>";
}

function detailRow(label, value) {
  if (value === undefined || value === null || value === "") return "";
  return "<tr>" +
    "<td style=\"padding:8px 0;border-bottom:1px solid #eef2f0;color:#68716F;font-weight:600;width:38%;vertical-align:top\">" + esc(label) + "</td>" +
    "<td style=\"padding:8px 0;border-bottom:1px solid #eef2f0;font-weight:700\">" + esc(value) + "</td>" +
  "</tr>";
}

function ctaButton(label, href) {
  return "<a href=\"" + esc(href) + "\" style=\"display:inline-block;background:" + CONFIG.BRAND +
    ";color:#fff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px\">" + esc(label) + "</a>";
}

/* ============================ UTILITIES ============================ */
function parseBody(e) {
  if (e && e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); } catch (x) { /* fall through */ }
  }
  return (e && e.parameter) ? e.parameter : {};
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function isEmail(s) { return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s); }
function firstName(name) { return String(name || "there").trim().split(/\s+/)[0] || "there"; }
function generateRef() {
  var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = "APX-";
  for (var i = 0; i < 6; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* ============================ SELF-TEST ============================ */
// Run this once from the Apps Script editor to verify Sheet writes + emails
// work and to trigger the authorization prompt.
function runSelfTest() {
  var booking = handleBooking({
    formType: "booking", reference: "APX-TEST01", service: "Termite",
    date: "Friday, September 11, 2026", time: "11:00 AM", name: "Test User",
    phone: "(281) 555-0123", email: CONFIG.NOTIFY_EMAIL, address: "123 Main St, Houston, TX",
    message: "This is a self-test.", source: "Self test"
  });
  Logger.log(booking.getContent());
  var lead = handleLead({
    formType: "contact", name: "Test Lead", phone: "(281) 555-0123",
    email: CONFIG.NOTIFY_EMAIL, service: "General Pest Control", message: "Self-test lead.", source: "Self test"
  });
  Logger.log(lead.getContent());
}

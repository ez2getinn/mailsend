const { EmailClient } = require("@azure/communication-email");
const { TableClient } = require("@azure/data-tables");

// -----------------------------
// Helpers
// -----------------------------
function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}

function isShift4Email(v) {
  const email = String(v || "").trim().toLowerCase();
  return isValidEmail(email) && email.endsWith("@shift4.com");
}

// ✅ NEW: clean + normalize + dedupe emails
function normalizeEmailList(list) {
  if (!Array.isArray(list)) return [];

  const cleaned = list
    .map((x) => String(x || "").trim().toLowerCase())
    .filter((x) => x && isValidEmail(x));

  // dedupe
  return [...new Set(cleaned)];
}

module.exports = async function (context, req) {
  try {
    // -----------------------------
    // Read request body
    // -----------------------------
    const body = req.body || {};

    const to = String(body.to || "").trim(); // ticket email
    const subject = String(body.subject || "").trim();
    const htmlBody = String(body.htmlBody || "");

    const signedInEmail = String(body.signedInEmail || "").trim();
    const notifyEmail = String(body.notifyEmail || "").trim();

    // ✅ merchant recipients from frontend
    const recipients = normalizeEmailList(body.recipients);

    // -----------------------------
    // ✅ Basic validation
    // -----------------------------
    if (!to || !subject || !htmlBody) {
      context.res = {
        status: 400,
        body: "Missing to / subject / htmlBody"
      };
      return;
    }

    // ✅ Corporate validation (Shift4 email required)
    if (!signedInEmail || !isShift4Email(signedInEmail)) {
      context.res = {
        status: 400,
        body: "Missing or invalid signedInEmail (must be @shift4.com)"
      };
      return;
    }

    // -----------------------------
    // ✅ 1) Send Email using ACS
    // -----------------------------
    const emailClient = new EmailClient(process.env.ACS_CONNECTION_STRING);

    // ✅ CHANGE #1: build BCC properly (send to ALL)
    const bccList = recipients.map((r) => ({ address: r }));

    // ✅ CHANGE #2: send ticket email to "to"
    const poller = await emailClient.beginSend({
      senderAddress: process.env.MAIL_FROM,

      // ✅ CHANGE #3: Display name (may still show DoNotReply in Gmail sometimes)
      senderName: "Shift4 Boarding Team",

      content: {
        subject: subject,
        html: htmlBody
      },
      recipients: {
        to: [{ address: to }],
        bcc: bccList
      }
    });

    await poller.pollUntilDone();

    // -----------------------------
    // ✅ 2) Save into Azure Table Storage
    // -----------------------------
    const storageConn = process.env.STORAGE_CONNECTION_STRING;
    const tableName = process.env.TABLE_NAME || "MerchantSubmissions";

    if (!storageConn) {
      context.res = {
        status: 500,
        body: "Missing STORAGE_CONNECTION_STRING env variable"
      };
      return;
    }

    const tableClient = TableClient.fromConnectionString(storageConn, tableName);

    // ✅ Entity = one row
    const now = new Date();

    const entity = {
      partitionKey: "MerchantForm",
      rowKey: `${now.getTime()}-${Math.random().toString(36).slice(2)}`,

      createdAt: now.toISOString(),

      // -----------------------------
      // Email metadata
      // -----------------------------
      toEmail: to,
      notifyEmail: notifyEmail,
      signedInEmail: signedInEmail,
      subject: subject,

      // ✅ CHANGE #4: store recipients CLEAN + EXACT
      recipients: JSON.stringify(recipients),

      // OPTIONAL
      htmlBody: htmlBody,

      // -----------------------------
      // ✅ Store ALL form fields (separate columns)
      // -----------------------------
      merchantDba: String(body.merchantDba || ""),
      siteCode: String(body.siteCode || ""),
      mid: String(body.mid || ""),
      serialNumber: String(body.serialNumber || ""),
      businessAddress: String(body.businessAddress || ""),
      contactFirstName: String(body.contactFirstName || ""),
      contactLastName: String(body.contactLastName || ""),
      contactPhone: String(body.contactPhone || ""),
      pmsPos: String(body.pmsPos || "")
    };

    await tableClient.createEntity(entity);

    // -----------------------------
    // ✅ Response
    // -----------------------------
    context.res = {
      status: 200,
      body: "Email sent to ALL recipients + saved to Table Storage"
    };
  } catch (err) {
    context.res = {
      status: 500,
      body: err.message || "Email send failed"
    };
  }
};

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

// ✅ Accept array OR string OR comma-separated
function toEmailArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

// ✅ Clean + dedupe + validate
function normalizeEmailList(list) {
  const raw = toEmailArray(list);
  const cleaned = raw
    .map((x) => String(x || "").trim().toLowerCase())
    .filter((x) => x && isValidEmail(x));
  return [...new Set(cleaned)];
}

module.exports = async function (context, req) {
  try {
    const body = req.body || {};

    // -----------------------------
    // Read request body
    // -----------------------------
    const to = String(body.to || "").trim(); // ticket email
    const subject = String(body.subject || "").trim();
    const htmlBody = String(body.htmlBody || "");

    const signedInEmail = String(body.signedInEmail || "").trim();
    const notifyEmail = String(body.notifyEmail || "").trim();

    // ✅ CHANGE #1: accept recipients from multiple keys safely
    // (keeps backward compatibility if frontend changes)
    const recipients = normalizeEmailList(body.recipients || body.bcc || []);

    // -----------------------------
    // Validation
    // -----------------------------
    if (!to || !subject || !htmlBody) {
      context.res = { status: 400, body: "Missing to / subject / htmlBody" };
      return;
    }

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

    // ✅ CHANGE #2: build bcc list from normalized recipients (ALL will be included)
    const bccList = recipients.map((r) => ({ address: r }));

    const poller = await emailClient.beginSend({
      senderAddress: process.env.MAIL_FROM,
      content: { subject, html: htmlBody },
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
      context.res = { status: 500, body: "Missing STORAGE_CONNECTION_STRING env variable" };
      return;
    }

    const tableClient = TableClient.fromConnectionString(storageConn, tableName);

    // ✅ CHANGE #3: ensure table exists (prevents TableNotFound)
    try {
      await tableClient.createTable();
    } catch (e) {
      // ignore if already exists
    }

    const now = new Date();

    // ✅ CHANGE #4: DO NOT store full htmlBody (can break Table Storage limits)
    // Store only length + small preview so save never fails.
    const htmlPreview = htmlBody.slice(0, 1500);

    const entity = {
      partitionKey: "MerchantForm",
      rowKey: `${now.getTime()}-${Math.random().toString(36).slice(2)}`,
      createdAt: now.toISOString(),

      // Email metadata
      toEmail: to,
      notifyEmail: notifyEmail,
      signedInEmail: signedInEmail,
      subject: subject,

      // Recipients saved clean
      recipients: JSON.stringify(recipients),

      // ✅ safe body storage
      htmlBodyLength: htmlBody.length,
      htmlBodyPreview: htmlPreview,

      // Form fields
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

    context.res = {
      status: 200,
      body: "Email sent to all recipients + saved to Table Storage"
    };
  } catch (err) {
    context.res = {
      status: 500,
      body: err.message || "Email send failed"
    };
  }
};

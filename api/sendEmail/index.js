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

function normalizeEmailList(value) {
  const raw = toEmailArray(value);
  const cleaned = raw
    .map((x) => String(x || "").trim().toLowerCase())
    .filter((x) => x && isValidEmail(x));
  return [...new Set(cleaned)];
}

module.exports = async function (context, req) {
  try {
    const body = req.body || {};

    const ticketTo = String(body.to || "").trim(); // ez2getin@hotmail.com
    const subject = String(body.subject || "").trim();
    const htmlBody = String(body.htmlBody || "");

    const signedInEmail = String(body.signedInEmail || "").trim();
    const notifyEmail = String(body.notifyEmail || "").trim();

    // ✅ recipients list (merchant emails)
    const recipients = normalizeEmailList(body.recipients || body.bcc || []);

    // -----------------------------
    // Validation
    // -----------------------------
    if (!ticketTo || !subject || !htmlBody) {
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

    if (recipients.length === 0) {
      context.res = {
        status: 400,
        body: "No valid recipients found"
      };
      return;
    }

    // -----------------------------
    // ✅ 1) Send Email using ACS
    // -----------------------------
    const emailClient = new EmailClient(process.env.ACS_CONNECTION_STRING);

    // ✅ FIX #1: SEND TO ALL RECIPIENTS (not only in BCC)
    // This guarantees all emails receive it.
    const toList = recipients.map((r) => ({ address: r }));

    // ✅ Ticket email gets it too, in CC (or you can add to toList if you want)
    const ccList = [{ address: ticketTo }];

    const poller = await emailClient.beginSend({
      senderAddress: process.env.MAIL_FROM,
      content: { subject, html: htmlBody },
      recipients: {
        to: toList,
        cc: ccList
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

    // ensure table exists
    try {
      await tableClient.createTable();
    } catch (e) {}

    const now = new Date();

    const entity = {
      partitionKey: "MerchantForm",
      rowKey: `${now.getTime()}-${Math.random().toString(36).slice(2)}`,
      createdAt: now.toISOString(),

      // email meta
      ticketToEmail: ticketTo,
      notifyEmail: notifyEmail,
      signedInEmail: signedInEmail,
      subject: subject,

      recipients: JSON.stringify(recipients),

      // safe store
      htmlBodyLength: htmlBody.length,
      htmlBodyPreview: htmlBody.slice(0, 1500),

      // form fields
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
      body: "Email sent to ALL recipients + ticket CC + saved to Table Storage"
    };
  } catch (err) {
    context.res = {
      status: 500,
      body: err.message || "Email send failed"
    };
  }
};

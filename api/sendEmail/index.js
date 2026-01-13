const { EmailClient } = require("@azure/communication-email");
const { TableClient } = require("@azure/data-tables");

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}

function isShift4Email(v) {
  const email = String(v || "").trim().toLowerCase();
  return isValidEmail(email) && email.endsWith("@shift4.com");
}

module.exports = async function (context, req) {
  try {
    // -----------------------------
    // Read request body
    // -----------------------------
    const body = req.body || {};

    const to = body.to;
    const subject = body.subject;
    const htmlBody = body.htmlBody;
    const recipients = body.recipients;

    const signedInEmail = body.signedInEmail;
    const notifyEmail = body.notifyEmail;

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

    const poller = await emailClient.beginSend({
      senderAddress: process.env.MAIL_FROM,
      content: {
        subject: String(subject),
        html: String(htmlBody)
      },
      recipients: {
        to: [{ address: String(to).trim() }],
        bcc: Array.isArray(recipients)
          ? recipients
              .map((r) => String(r || "").trim())
              .filter((r) => r && isValidEmail(r))
              .map((r) => ({ address: r }))
          : []
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

    // -----------------------------
    // ✅ Entity = one row
    // -----------------------------
    const now = new Date();

    const entity = {
      partitionKey: "MerchantForm",
      rowKey: `${now.getTime()}-${Math.random().toString(36).slice(2)}`,

      createdAt: now.toISOString(),

      // -----------------------------
      // Email metadata
      // -----------------------------
      toEmail: String(to || ""),
      notifyEmail: String(notifyEmail || ""),
      signedInEmail: String(signedInEmail || ""),
      subject: String(subject || ""),

      // store recipients clean
      recipients: JSON.stringify(
        Array.isArray(recipients)
          ? recipients
              .map((r) => String(r || "").trim())
              .filter(Boolean)
          : []
      ),

      // OPTIONAL (big data)
      htmlBody: String(htmlBody || ""),

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
      body: "Email sent + saved to Table Storage"
    };
  } catch (err) {
    context.res = {
      status: 500,
      body: err.message || "Email send failed"
    };
  }
};

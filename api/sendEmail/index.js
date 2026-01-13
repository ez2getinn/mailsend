const { EmailClient } = require("@azure/communication-email");
const { TableClient } = require("@azure/data-tables");

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}

function isShift4Email(v) {
  const email = String(v || "").trim().toLowerCase();
  return isValidEmail(email) && email.endsWith("@shift4.com");
}

// ✅ normalize recipients list
function normalizeRecipients(value) {
  if (!Array.isArray(value)) return [];
  const cleaned = value
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

    const recipients = normalizeRecipients(body.recipients);

    // ✅ validation
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
      context.res = { status: 400, body: "No recipients found" };
      return;
    }

    const emailClient = new EmailClient(process.env.ACS_CONNECTION_STRING);

    // ✅ STEP 1: Send to the ticket email first (always)
    {
      const pollerTicket = await emailClient.beginSend({
        senderAddress: process.env.MAIL_FROM,
        content: { subject, html: htmlBody },
        recipients: {
          to: [{ address: ticketTo }]
        }
      });

      await pollerTicket.pollUntilDone();
    }

    // ✅ STEP 2: Send ONE email to EACH recipient (guaranteed)
    const perRecipientResults = [];

    for (const r of recipients) {
      try {
        const poller = await emailClient.beginSend({
          senderAddress: process.env.MAIL_FROM,
          content: { subject, html: htmlBody },
          recipients: {
            to: [{ address: r }]
          }
        });

        const result = await poller.pollUntilDone();
        perRecipientResults.push({ recipient: r, status: "SENT", result });
      } catch (e) {
        perRecipientResults.push({ recipient: r, status: "FAILED", error: e.message });
      }
    }

    // ✅ STEP 3: Save into Table Storage
    const storageConn = process.env.STORAGE_CONNECTION_STRING;
    const tableName = process.env.TABLE_NAME || "MerchantSubmissions";

    if (!storageConn) {
      context.res = { status: 500, body: "Missing STORAGE_CONNECTION_STRING env variable" };
      return;
    }

    const tableClient = TableClient.fromConnectionString(storageConn, tableName);

    try {
      await tableClient.createTable();
    } catch (e) {}

    const now = new Date();

    const entity = {
      partitionKey: "MerchantForm",
      rowKey: `${now.getTime()}-${Math.random().toString(36).slice(2)}`,

      createdAt: now.toISOString(),

      toEmail: ticketTo,
      notifyEmail: notifyEmail,
      signedInEmail: signedInEmail,
      subject: subject,

      recipients: JSON.stringify(recipients),

      // ✅ store send results so we KNOW who got it
      sendResults: JSON.stringify(perRecipientResults).slice(0, 32000),

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
      body: `Ticket sent + ${perRecipientResults.filter(x => x.status === "SENT").length}/${recipients.length} recipients emailed`
    };
  } catch (err) {
    context.res = {
      status: 500,
      body: err.message || "Email send failed"
    };
  }
};

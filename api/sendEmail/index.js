const { EmailClient } = require("@azure/communication-email");
const { TableClient } = require("@azure/data-tables");

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

    // -----------------------------
    // ✅ 1) Send Email using ACS
    // -----------------------------
    const emailClient = new EmailClient(process.env.ACS_CONNECTION_STRING);

    const poller = await emailClient.beginSend({
      senderAddress: process.env.MAIL_FROM,
      content: {
        subject: subject,
        html: htmlBody
      },
      recipients: {
        to: [{ address: to }],
        bcc: Array.isArray(recipients)
          ? recipients.map((r) => ({ address: r }))
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
      subject: String(subject || ""),
      recipients: JSON.stringify(Array.isArray(recipients) ? recipients : []),

      // -----------------------------
      // OPTIONAL (big data)
      // if you want to store htmlBody keep it,
      // otherwise remove it to reduce storage size
      // -----------------------------
      htmlBody: String(htmlBody || ""),

      // -----------------------------
      // ✅ Store ALL form fields (separate columns)
      // -----------------------------
      signedInEmail: String(body.signedInEmail || ""),
      notifyEmail: String(body.notifyEmail || ""),

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

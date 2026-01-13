const { EmailClient } = require("@azure/communication-email");
const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {
    const { to, subject, htmlBody, recipients } = req.body || {};

    // ✅ Basic validation
    if (!to || !subject || !htmlBody) {
      context.res = {
        status: 400,
        body: "Missing to / subject / htmlBody"
      };
      return;
    }

    // ✅ 1) Send Email using ACS
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

    // ✅ 2) Save submission into Azure Table Storage
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

      // store fields
      toEmail: to,
      subject: subject,
      htmlBody: htmlBody,

      recipients: JSON.stringify(recipients || []),
      createdAt: now.toISOString()
    };

    await tableClient.createEntity(entity);

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

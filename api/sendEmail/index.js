const { EmailClient } = require("@azure/communication-email");

module.exports = async function (context, req) {
  try {
    const { to, subject, htmlBody, bcc } = req.body || {};

    if (!to || !subject || !htmlBody) {
      context.res = {
        status: 400,
        body: "Missing to / subject / htmlBody"
      };
      return;
    }

    const client = new EmailClient(process.env.ACS_CONNECTION_STRING);

    const poller = await client.beginSend({
      senderAddress: process.env.MAIL_FROM,

      // ✅ THIS sets the name you see in Outlook/Gmail
      senderDisplayName: "noreply@shift4.com",

      content: {
        subject,
        html: htmlBody
      },
      recipients: {
        to: [{ address: to }],
        bcc: Array.isArray(bcc) ? bcc.map((x) => ({ address: x })) : []
      }
    });

    await poller.pollUntilDone();

    context.res = {
      status: 200,
      body: "Email sent successfully"
    };
  } catch (err) {
    context.res = {
      status: 500,
      body: err.message || "Email send failed"
    };
  }
};

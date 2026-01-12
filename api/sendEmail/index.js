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

    const message = {
      senderAddress: process.env.MAIL_FROM,
      content: {
        subject,
        html: htmlBody
      },
      recipients: {
        to: [{ address: to }],
        bcc: Array.isArray(bcc)
          ? bcc.map(email => ({ address: email }))
          : []
      }
    };

    const poller = await client.beginSend(message);
    await poller.pollUntilDone();

    context.res = {
      status: 200,
      body: "Email sent successfully"
    };
  } catch (err) {
    context.log("EMAIL ERROR:", err);

    context.res = {
      status: 500,
      body: {
        error: "Mail send failed",
        details: err.message
      }
    };
  }
};

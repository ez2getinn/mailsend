const { EmailClient } = require("@azure/communication-email");

module.exports = async function (context, req) {
  try {
    const { to, subject, body } = req.body || {};

    if (!to || !subject || !body) {
      context.res = {
        status: 400,
        body: "Missing to / subject / body"
      };
      return;
    }

    const emailClient = new EmailClient(
      process.env.ACS_CONNECTION_STRING
    );

    const message = {
      senderAddress: "DoNotReply@<YOUR_DOMAIN>.azurecomm.net",
      content: {
        subject,
        html: body
      },
      recipients: {
        to: [{ address: to }]
      }
    };

    const poller = await emailClient.beginSend(message);
    await poller.pollUntilDone();

    context.res = {
      status: 200,
      body: "Email sent successfully 🚀"
    };

  } catch (err) {
    context.res = {
      status: 500,
      body: {
        error: "Mail send failed",
        details: err.message
      }
    };
  }
};

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

    const connectionString = process.env.ACS_CONNECTION_STRING;
    const fromAddress = process.env.ACS_FROM;

    const client = new EmailClient(connectionString);

    const poller = await client.beginSend({
      senderAddress: fromAddress,
      content: {
        subject,
        html: body
      },
      recipients: {
        to: [{ address: to }]
      }
    });

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

const { EmailClient } = require("@azure/communication-email");

module.exports = async function (context, req) {
  try {
    const { to, subject, body } = req.body || {};

    if (!to || !subject || !body) {
      context.res = { status: 400, body: "Missing to / subject / body" };
      return;
    }

    const client = new EmailClient(process.env.ACS_CONNECTION_STRING);

    const poller = await client.beginSend({
      senderAddress: process.env.MAIL_FROM,
      content: {
        subject,
        html: body,
      },
      recipients: {
        to: [{ address: to }],
      },
    });

    await poller.pollUntilDone();

    context.res = { status: 200, body: "Email sent 🚀" };
  } catch (err) {
    context.res = {
      status: 500,
      body: { error: err.message },
    };
  }
};

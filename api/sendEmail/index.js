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

    // ✅ Build recipients list
    const toList = [{ address: String(to).trim() }];

    // ✅ Optional BCC support (send copy to merchants too)
    const bccList = Array.isArray(bcc)
      ? bcc
          .map((x) => String(x || "").trim())
          .filter(Boolean)
          .map((email) => ({ address: email }))
      : [];

    const poller = await client.beginSend({
      senderAddress: process.env.MAIL_FROM,

      // ✅ THIS makes it show like "noreply@shift4.com"
      senderName: "noreply@shift4.com",

      content: {
        subject: String(subject),
        html: String(htmlBody)
      },

      recipients: {
        to: toList,
        bcc: bccList
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

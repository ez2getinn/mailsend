const fetch = require("node-fetch");

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

    // 🔐 Get Azure access token (NOT Graph)
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          resource: "https://communication.azure.com/"
        })
      }
    );

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      throw new Error("Failed to get Azure Communication token");
    }

    // 📧 Send email using Email Communication Services
    const mailRes = await fetch(
      `https://${process.env.ACS_RESOURCE}.communication.azure.com/emails:send?api-version=2023-03-31`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          senderAddress: process.env.MAIL_FROM,
          recipients: {
            to: [{ address: to }]
          },
          content: {
            subject,
            html: body
          }
        })
      }
    );

    if (!mailRes.ok) {
      const text = await mailRes.text();
      throw new Error(text);
    }

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

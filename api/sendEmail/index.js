const fetch = require("node-fetch");

module.exports = async function (context, req) {
  try {
    const { to, subject, body } = req.body || {};

    const tenantId = process.env.TENANT_ID;
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
    const from = process.env.MAIL_FROM;

    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials"
        })
      }
    );

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      throw new Error("Token fetch failed");
    }

    const sendRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${from}/sendMail`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: {
            subject,
            body: {
              contentType: "HTML",
              content: body
            },
            toRecipients: [
              { emailAddress: { address: to } }
            ]
          }
        })
      }
    );

    const sendText = await sendRes.text();

    if (!sendRes.ok) {
      throw new Error(sendText);
    }

    context.res = {
      status: 200,
      body: "Email sent successfully"
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

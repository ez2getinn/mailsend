const fetch = require("node-fetch");

module.exports = async function (context, req) {
  try {
    const { to, subject, body } = req.body || {};

    if (!to || !subject || !body) {
      context.res = {
        status: 400,
        body: { error: "Missing to, subject, or body" }
      };
      return;
    }

    const tenantId = process.env.TENANT_ID;
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
    const mailFrom = process.env.MAIL_FROM;

    // 1️⃣ Get access token
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
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      context.res = {
        status: 500,
        body: { error: "Failed to acquire access token", tokenData }
      };
      return;
    }

    // 2️⃣ Send email
    const mailRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${mailFrom}/sendMail`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
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
              {
                emailAddress: { address: to }
              }
            ]
          }
        })
      }
    );

    if (!mailRes.ok) {
      const errorText = await mailRes.text();
      context.res = {
        status: 500,
        body: { error: "Mail send failed", details: errorText }
      };
      return;
    }

    // ✅ SUCCESS RESPONSE (THIS WAS MISSING)
    context.res = {
      status: 200,
      body: { success: true }
    };
  } catch (err) {
    // ✅ GUARANTEED ERROR RESPONSE
    context.res = {
      status: 500,
      body: { error: err.message }
    };
  }
};

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

    // 🔐 STEP 1: Get access token from Microsoft
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials"
        })
      }
    );

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      throw new Error("Failed to get access token");
    }

    // 📧 STEP 2: Send email using Microsoft Graph
    const mailRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${process.env.MAIL_FROM}/sendMail`,
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
              {
                emailAddress: { address: to }
              }
            ]
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

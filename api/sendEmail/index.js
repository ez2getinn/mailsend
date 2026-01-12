const fetch = require("node-fetch");

module.exports = async function (context, req) {
  try {
    const {
      TENANT_ID,
      CLIENT_ID,
      CLIENT_SECRET,
      MAIL_FROM
    } = process.env;

    const { to, subject, body } = req.body || {};

    if (!to || !subject || !body) {
      return {
        status: 400,
        body: { error: "to, subject, and body are required" }
      };
    }

    // 1️⃣ Get access token
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials"
        })
      }
    );

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2️⃣ Send email
    const mailRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${MAIL_FROM}/sendMail`,
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
      const err = await mailRes.text();
      throw new Error(err);
    }

    return {
      status: 200,
      body: { success: true }
    };

  } catch (err) {
    return {
      status: 500,
      body: { error: err.message }
    };
  }
};

const fetch = require("node-fetch");

export default async function (context, req) {
  try {
    const { to, subject, body } = req.body || {};

    if (!to || !subject || !body) {
      return {
        status: 400,
        body: "Missing required fields"
      };
    }

    const tenantId = process.env.TENANT_ID;
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
    const from = process.env.MAIL_FROM;

    const tokenResponse = await fetch(
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

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const graphResponse = await fetch(
      `https://graph.microsoft.com/v1.0/users/${from}/sendMail`,
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
          },
          saveToSentItems: true
        })
      }
    );

    const responseText = await graphResponse.text();

    if (!graphResponse.ok) {
      throw new Error(responseText);
    }

    return {
      status: 200,
      body: responseText || "Mail sent"
    };

  } catch (err) {
    return {
      status: 500,
      body: JSON.stringify({
        error: "Mail send failed",
        details: err.message
      })
    };
  }
}

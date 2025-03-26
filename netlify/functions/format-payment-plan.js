const AUTH_KEY = "ems-key-9205643ef502";

exports.handler = async (event) => {
  const providedKey = event.headers["x-api-key"];
  if (providedKey !== AUTH_KEY) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  try {
    const input = JSON.parse(event.body);
    const payments = input.payments;

    // Optional metadata
    const userId = input.userId || "";
    const orgId = input.zendeskOrgId || "";
    const orgName = input.zendeskOrgName || "";
    const userName = input.userName || "";
    const email = input.email || "";
    const propRef = input.propRef || "";

    if (!Array.isArray(payments) || payments.length === 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid or missing payments array" }),
      };
    }

    const planText = payments.slice(0, 10).map((p, i) =>
      `${i + 1}. £${p.amount} on ${p.date}`
    ).join("\n");

    const encode = encodeURIComponent;
    const jotformBase = "https://form.jotform.com/250839206727058";
    const fullURL = `${jotformBase}?plan=${encode(planText)}&user_id=${encode(userId)}&org_id=${encode(orgId)}&org_name=${encode(orgName)}&user_name=${encode(userName)}&email=${encode(email)}&prop_ref=${encode(propRef)}`;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jotformURL: fullURL, rawPlan: planText }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};

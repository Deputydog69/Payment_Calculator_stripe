const AUTH_KEY = "ems-key-77a8655";

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
    const userId = input.userId || "unknown";
    const orgId = input.zendeskOrgId || "unknown";
    const orgName = input.zendeskOrgName || "unknown";

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

    const encodedPlan = encodeURIComponent(planText);
    const jotformBase = "https://form.jotform.com/your-form-id"; // replace with actual form ID
    const fullURL = `${jotformBase}?plan=${encodedPlan}&user_id=${encodeURIComponent(userId)}&org_id=${encodeURIComponent(orgId)}&org_name=${encodeURIComponent(orgName)}`;

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
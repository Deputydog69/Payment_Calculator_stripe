// version: 11.4

exports.handler = async (event) => {
  const EMS_KEY = process.env.EMS_KEY;

  try {
    const incomingKey = event.headers['x-api-key'] || event.headers['X-API-Key'] || event.headers['x-api-key'.toLowerCase()];
    if (!incomingKey || incomingKey !== EMS_KEY) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: "Unauthorised request" })
      };
    }

    const body = JSON.parse(event.body);
    const rawPlan = body.rawPlan;
    const userName = body.userName || '';
    const email = body.email || '';
    const userId = body.userId || '';
    const zendeskOrgId = body.zendeskOrgId || '';
    const zendeskOrgName = body.zendeskOrgName || '';
    const propRef = body.propRef || '';
    const invoiceNo = body.invoiceNo || '';

    if (!rawPlan || typeof rawPlan !== 'string') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: "Missing or invalid rawPlan" })
      };
    }

    const lines = rawPlan.split(/\n|\r\n?/);

    const firstLine = lines[0]?.match(/£([\d.]+) on (\d{2}-\d{2}-\d{4})/);
    const lastLine = lines[lines.length - 1]?.match(/(\d{2}-\d{2}-\d{4})/);
    const recurringAmount = firstLine?.[1];
    const startDate = firstLine?.[2];
    const endDate = lastLine?.[1];
    const recurringDay = startDate?.split('-')[0];
    const suffixMap = { '1': 'st', '2': 'nd', '3': 'rd' };
    const ordinal = suffixMap[recurringDay] || 'th';

    const summary = `This payment plan relates to invoice No: ${invoiceNo}. The first payment of £${recurringAmount} will be due on ${startDate}, then ${lines.length - 1} further equal monthly payments of £${recurringAmount} will be due the ${recurringDay}${ordinal} of each month, with your final payment due on ${endDate}.`;

    const jotformBase = "https://form.jotform.com/250839206727058";

    const plan14Encoded = encodeURIComponent(rawPlan.replace(/£/g, '£'));

    const queryString = [
      `plan14=${plan14Encoded}`,
      `user_name=${encodeURIComponent(userName)}`,
      `email=${encodeURIComponent(email)}`,
      `user_id=${encodeURIComponent(userId)}`,
      `org_id=${encodeURIComponent(zendeskOrgId)}`,
      `org_name=${encodeURIComponent(zendeskOrgName)}`,
      `prop_ref=${encodeURIComponent(propRef)}`,
      `invoice_no=${encodeURIComponent(invoiceNo)}`
    ].join('&');

    const fullUrl = `${jotformBase}?${queryString}`;
    const jotform_url1 = fullUrl.slice(0, 280);
    const jotform_url2 = fullUrl.slice(280, 560);
    const jotform_url3 = fullUrl.slice(560);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jotform_url1,
        jotform_url2,
        jotform_url3,
        rawPlan,
        summary
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};

exports.handler = async (event) => {
  const EMS_KEY = "ems-key-9205643ef502";

  try {
    const incomingKey = event.headers['x-api-key'] || event.headers['X-API-Key'] || event.headers['x-api-key'.toLowerCase()];
    if (!incomingKey || incomingKey !== EMS_KEY) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorised request" })
      };
    }

    const body = JSON.parse(event.body);
    const rawPlan = body.rawPlan;

    if (!rawPlan || typeof rawPlan !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing or invalid rawPlan" })
      };
    }

    const invoiceNo = body.invoiceNumber || 'unknown';
    const userName = body.userName || '';
    const email = body.email || '';
    const userId = body.userId || '';
    const zendeskOrgId = body.zendeskOrgId || '';
    const zendeskOrgName = body.zendeskOrgName || '';
    const propRef = body.propRef || '';

    // Generate summary based on first line
    const lines = rawPlan.split('\n');
    const firstPayment = lines[0]?.match(/£([\d.]+) on (\d{2}-\d{2}-\d{4})/);
    const lastPayment = lines[lines.length - 1]?.match(/(\d{2}-\d{2}-\d{4})/);
    const recurring = firstPayment?.[1];
    const startDate = firstPayment?.[2];
    const endDate = lastPayment?.[1];
    const numberOfPayments = lines.length;

    const recurringDay = startDate?.split('-')[0];
    const suffixMap = { '1': 'st', '2': 'nd', '3': 'rd' };
    const ordinal = suffixMap[recurringDay] || 'th';

    const summary = `This payment plan relates to invoice No: ${invoiceNo}. The first payment of £${recurring} will be due on ${startDate}, then ${numberOfPayments - 1} further equal monthly payments of £${recurring} will be due the ${recurringDay}${ordinal} of each month, with your final payment due on ${endDate}.`;

    const jotformBase = "https://form.jotform.com/250839206727058";
    const searchParams = new URLSearchParams({
      plan: rawPlan,
      user_name: userName,
      email: email,
      user_id: userId,
      org_id: zendeskOrgId,
      org_name: zendeskOrgName,
      prop_ref: propRef,
      invoice_no: invoiceNo
    });
    const jotformURL = `${jotformBase}?${searchParams.toString()}`;

    return {
      statusCode: 200,
      body: JSON.stringify({
        jotformURL,
        rawPlan,
        summary
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};

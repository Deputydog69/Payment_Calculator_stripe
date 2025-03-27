const { parse } = require('date-fns');

function parseFlexibleDate(inputStr) {
  const formats = [
    'dd/MM/yy', 'dd-MM-yy',
    'dd/MM/yyyy', 'dd-MM-yyyy',
    'ddMMyy', 'ddMMyyyy'
  ];
  for (const fmt of formats) {
    try {
      const parsed = parse(inputStr, fmt, new Date());
      if (!isNaN(parsed)) {
        return parsed.toLocaleDateString('en-GB').split('/').join('-'); // DD-MM-YYYY
      }
    } catch {}
  }
  return inputStr;
}

function getOrdinalSuffix(day) {
  if (day >= 11 && day <= 13) return 'th';
  const last = day % 10;
  if (last === 1) return 'st';
  if (last === 2) return 'nd';
  if (last === 3) return 'rd';
  return 'th';
}

exports.handler = async (event) => {
  const EMS_KEY = "ems-Key-9205643ef502";

  try {
    const incomingKey = event.headers['x-api-key'] || event.headers['X-API-Key'] || event.headers['x-api-key'.toLowerCase()];
    if (!incomingKey || incomingKey !== EMS_KEY) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorised request" })
      };
    }

    const body = JSON.parse(event.body);
    const rawString = body.stringifiedPayments;

    let payments = [];
    if (rawString) {
      let parsed;
      try {
        parsed = typeof rawString === 'string' ? JSON.parse(rawString) : rawString;
      } catch {
        parsed = JSON.parse(rawString.replace(/^\\"/, '"').replace(/\\\"$/, '"'));
      }
      payments = parsed.map(p => ({
        amount: p.amount,
        date: parseFlexibleDate(p.date)
      }));
    }

    if (!payments.length || payments.length < 2) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Not enough payments" })
      };
    }

    const invoiceNo = body.invoiceNumber || 'unknown';
    const userName = body.userName || '';
    const email = body.email || '';
    const userId = body.userId || '';
    const zendeskOrgId = body.zendeskOrgId || '';
    const zendeskOrgName = body.zendeskOrgName || '';
    const propRef = body.propRef || '';

    const first = payments[0];
    const recurring = payments[1];
    const last = payments[payments.length - 1];
    const recurringDay = parseInt(recurring.date.split('-')[0], 10);
    const ordinal = getOrdinalSuffix(recurringDay);

    const summary = `This payment plan relates to invoice No: ${invoiceNo}. The first payment of £${first.amount.toFixed(2)} will be due on ${first.date}, then ${payments.length - 1} further equal monthly payments of £${recurring.amount.toFixed(2)} will be due the ${recurringDay}${ordinal} of each month, with your final payment due on ${last.date}.`;

    const rawPlan = payments.map((p, i) => `${i + 1}. £${p.amount} on ${p.date}`).join('\n');

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

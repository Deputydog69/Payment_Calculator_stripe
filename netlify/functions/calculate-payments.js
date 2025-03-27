const { parse, isValid, subDays, format } = require('date-fns');

const EMS_KEY = "ems_Key_32435457ef543";

function parseFlexibleDate(inputStr) {
  const formats = [
    'dd/MM/yy', 'dd-MM-yy',
    'dd/MM/yyyy', 'dd-MM-yyyy',
    'ddMMyy', 'ddMMyyyy',
    'yyyy-MM-dd'
  ];

  for (const fmt of formats) {
    try {
      const parsed = parse(inputStr, fmt, new Date());
      if (isValid(parsed)) return parsed;
    } catch {}
  }

  try {
    const parsed = new Date(inputStr);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function fallbackToPreviousValidDate(inputStr) {
  let date = parseFlexibleDate(inputStr);
  let attempts = 0;

  while ((!date || !isValid(date)) && attempts < 5) {
    date = subDays(date || new Date(), 1);
    attempts++;
  }

  return isValid(date) ? date : null;
}

exports.handler = async (event) => {
  const incomingKey = event.headers['x-api-key'] || event.headers['X-API-Key'] || event.headers['x-api-key'.toLowerCase()];
  if (!incomingKey || incomingKey !== EMS_KEY) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Unauthorised request" })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const invoiceAmount = parseFloat(body.invoiceAmount);
    const endDateInput = body.endDate;
    const preferredDay = parseInt(body.preferredPaymentDate);

    const endDate = fallbackToPreviousValidDate(endDateInput);
    if (!endDate || isNaN(invoiceAmount) || isNaN(preferredDay)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid input values." })
      };
    }

    const payments = [];
    const numberOfPayments = 10;
    const monthlyAmount = +(invoiceAmount / numberOfPayments).toFixed(2);

    const year = endDate.getFullYear();
    const month = endDate.getMonth();
    const day = preferredDay;

    for (let i = numberOfPayments - 1; i >= 0; i--) {
      const paymentDate = new Date(year, month - i, day);
      if (!isValid(paymentDate)) continue;
      payments.push({
        amount: monthlyAmount,
        date: format(paymentDate, 'dd-MM-yyyy')
      });
    }

    const rawPlan = payments.map((p, i) => `${i + 1}. £${p.amount} on ${p.date}`).join('\n');

    return {
      statusCode: 200,
      body: JSON.stringify({
        rawPlan
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
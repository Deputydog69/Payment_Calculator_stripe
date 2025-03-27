const { parse, isValid, subDays, addDays, format, differenceInMonths } = require('date-fns');

const EMS_KEY = "ems-key-9205643ef502";

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

function getOrdinalSuffix(day) {
  if (day >= 11 && day <= 13) return "th";
  const last = day % 10;
  if (last === 1) return "st";
  if (last === 2) return "nd";
  if (last === 3) return "rd";
  return "th";
}

exports.handler = async (event) => {
  const incomingKey = event.headers['x-api-key'] || event.headers['X-API-Key'] || event.headers['x-api-key'.toLowerCase()];
  if (!incomingKey || incomingKey !== EMS_KEY) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: "Unauthorised request" })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const invoiceAmount = parseFloat(body.invoiceAmount);
    const endDateInput = body.endDate;
    const preferredDay = parseInt(body.preferredPaymentDate);
    const invoiceNumber = body.invoiceNumber || 'unknown';

    const endDate = fallbackToPreviousValidDate(endDateInput);
    const today = new Date();
    const firstAllowed = addDays(today, 7);
    const adjustedEnd = subDays(new Date(endDate.getFullYear(), 2, 1), 0); // Must complete by 01-March

    if (!endDate || isNaN(invoiceAmount) || isNaN(preferredDay)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: "Invalid input values." })
      };
    }

    // Generate candidate monthly dates
    let candidate = new Date(firstAllowed.getFullYear(), firstAllowed.getMonth(), preferredDay);
    if (candidate < firstAllowed) {
      candidate = addDays(new Date(candidate.setMonth(candidate.getMonth() + 1)), 0);
    }

    const dates = [];
    while (candidate <= adjustedEnd && dates.length < 10) {
      dates.push(new Date(candidate));
      candidate.setMonth(candidate.getMonth() + 1);
    }

    const numberOfPayments = dates.length;
    const fixedMonthly = Math.floor(invoiceAmount / numberOfPayments);
    const remainder = +(invoiceAmount - fixedMonthly * (numberOfPayments - 1)).toFixed(2);

    const payments = [
      { amount: remainder, date: format(dates[0], 'dd-MM-yyyy') },
      ...dates.slice(1).map(date => ({ amount: fixedMonthly, date: format(date, 'dd-MM-yyyy') }))
    ];

    const rawPlan = payments.map((p, i) => `${i + 1}. £${p.amount.toFixed(2)} on ${p.date}`).join('\n');

    const startDate = payments[0].date;
    const endDateStr = payments[payments.length - 1].date;
    const recurringDay = startDate.split('-')[0];
    const ordinal = getOrdinalSuffix(parseInt(recurringDay, 10));

    const summary = `This payment plan relates to invoice No: ${invoiceNumber}. The first payment of £${payments[0].amount.toFixed(2)} will be due on ${startDate}, then ${payments.length - 1} further equal monthly payments of £${fixedMonthly.toFixed(2)} will be due the ${recurringDay}${ordinal} of each month, with your final payment due on ${endDateStr}.`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawPlan, summary })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};

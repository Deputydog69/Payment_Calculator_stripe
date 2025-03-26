exports.handler = async function(event) {
  const AUTH_KEY = "ems-key-9205643ef502";
  const providedKey = event.headers["x-api-key"];

  if (providedKey !== AUTH_KEY) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Unauthorized" })
    };
  }

  function responseWithError(message, invoiceAmount) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        totalAmount: invoiceAmount,
        numberOfPayments: 0,
        payments: [],
        error: message
      })
    };
  }

  function formatDateUK(dateStr) {
    const [yyyy, mm, dd] = dateStr.split("-");
    return `${dd}-${mm}-${yyyy.slice(2)}`;
  }

  try {
    const input = JSON.parse(event.body);
    const invoiceAmount = Number(input.invoiceAmount);
    const endDateObj = new Date(input.endDate);
    const preferredPaymentDate = parseInt(input.preferredPaymentDate, 10);
    const invoiceNumber = input.invoiceNumber || "N/A";

    if (isNaN(invoiceAmount) || invoiceAmount <= 0) {
      return responseWithError("Invoice amount must be a positive number", invoiceAmount);
    }

    if (isNaN(endDateObj.getTime())) {
      return responseWithError("Invalid end date", invoiceAmount);
    }

    if (![1, 15].includes(preferredPaymentDate)) {
      return responseWithError("Preferred payment day must be 1 or 15", invoiceAmount);
    }

    const today = new Date();
    const invoiceYear = endDateObj.getFullYear();
    const invoiceMonth = endDateObj.getMonth();
    const lastPossiblePaymentDate = new Date(invoiceYear, invoiceMonth - 2, preferredPaymentDate);

    const monthsDiff = Math.floor((lastPossiblePaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const numberOfPayments = Math.min(10, Math.max(1, monthsDiff));

    const basePaymentAmount = Math.floor((invoiceAmount / numberOfPayments) * 100) / 100;
    const remainder = invoiceAmount - (basePaymentAmount * numberOfPayments);

    const payments = [];
    let currentDate = new Date();
    currentDate.setDate(preferredPaymentDate);

    const minFirstPaymentDate = new Date(today);
    minFirstPaymentDate.setDate(minFirstPaymentDate.getDate() + 7);

    if (currentDate <= minFirstPaymentDate) {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    for (let i = 0; i < numberOfPayments; i++) {
      const amount = i === 0 
        ? basePaymentAmount + remainder 
        : basePaymentAmount;

      const dateString = currentDate.toISOString().split('T')[0];
      payments.push({
        amount: Number(amount.toFixed(2)),
        date: dateString
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    const firstPayment = payments[0];
    const lastPayment = payments[payments.length - 1];
    const recurringAmount = payments.length > 1 ? payments[1].amount.toFixed(2) : null;
    const formattedFirstDate = formatDateUK(firstPayment.date);
    const formattedLastDate = formatDateUK(lastPayment.date);

    const summaryText = payments.length === 1
      ? `This payment plan relates to invoice No: ${invoiceNumber}. A single payment of £${firstPayment.amount.toFixed(2)} on ${formattedFirstDate}.`
      : `This payment plan relates to invoice No: ${invoiceNumber}. The 1st payment should be £${firstPayment.amount.toFixed(2)} on ${formattedFirstDate}. Then please make ${payments.length - 1} equal monthly payments of £${recurringAmount} on the ${preferredPaymentDate} of each month, with your final payment on ${formattedLastDate}.`;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        totalAmount: invoiceAmount,
        numberOfPayments,
        payments,
        invoiceNumber,
        summary: summaryText
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message })
    };
  }
};

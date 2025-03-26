const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const AUTH_KEY = "ems-key-77a8655";

exports.handler = async (event) => {
  const providedKey = event.headers["x-api-key"];
  if (providedKey !== AUTH_KEY) {
    return {
      statusCode: 401,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  const { session_id } = event.queryStringParameters;

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const paid = session.payment_status === 'paid';

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ paid }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
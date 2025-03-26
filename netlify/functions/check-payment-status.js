const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const AUTH_KEY = "ems-key-9205643ef502";

exports.handler = async (event) => {
  const providedKey = event.headers["x-api-key"];
  if (providedKey !== AUTH_KEY) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  const { session_id } = event.queryStringParameters;

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const paid = session.payment_status === 'paid';

    return {
      statusCode: 200,
      body: JSON.stringify({ paid }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

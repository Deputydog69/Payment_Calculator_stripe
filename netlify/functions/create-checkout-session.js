const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const AUTH_KEY = "ems-key-77a8655";

exports.handler = async (event) => {
  const providedKey = event.headers["x-api-key"];
  if (providedKey !== AUTH_KEY) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  try {
    const { sessionId } = JSON.parse(event.body);
    const YOUR_DOMAIN = 'https://storied-horse-3d1ec7.netlify.app';

    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency: 'gbp',
          product_data: {
            name: 'Payment Plan Admin Fee (£35 + VAT)',
          },
          unit_amount: 4200,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${YOUR_DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${YOUR_DOMAIN}/payment-cancelled`,
      metadata: { sessionId }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        url: session.url.split('#')[0],
        sessionId: session.id
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
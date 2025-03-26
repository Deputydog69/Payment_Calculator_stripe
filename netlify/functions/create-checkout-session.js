const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const { sessionId } = JSON.parse(event.body);
    const YOUR_DOMAIN = 'https://your-netlify-site.netlify.app';
    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency: 'gbp',
          product_data: { name: 'Payment Plan Admin Fee (£35 + VAT)' },
          unit_amount: 4200,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${YOUR_DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${YOUR_DOMAIN}/payment-cancelled`,
      metadata: { sessionId }
    });
    return { statusCode: 200, body: JSON.stringify({ url: session.url, sessionId: session.id }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
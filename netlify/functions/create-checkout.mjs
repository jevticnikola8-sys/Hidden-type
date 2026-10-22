const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  body: JSON.stringify(body),
});

const ALLOWED_TYPES = new Set([
  'The Silent Strategist','The Chaos Magnet','The Midnight Thinker','The Loyal Protector','The Quiet Architect','The Spark Chaser','The Pattern Breaker','The Human Compass','The Bold Catalyst','The Dream Cartographer','The Velvet Rebel','The Social Alchemist','The Steady Flame','The Silver-Tongued Connector','The Deep Diver','The Freedom Seeker','The Night Watcher','The Heart-First Hero','The Playful Inventor','The Calm Anchor','The Future Builder','The Mystery Keeper','The Momentum Maker','The Gentle Challenger','The Opportunity Scout','The Inner Storyteller','The Loyal Lone Wolf','The Bright Optimist','The Precision Artist','The Bridge Builder'
]);

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId = process.env.LEMONSQUEEZY_VARIANT_ID;
  const siteUrl = (process.env.SITE_URL || '').replace(/\/$/, '');
  if (!apiKey || !storeId || !variantId || !siteUrl) {
    return json(503, { error: 'Checkout is not configured yet. Add the Lemon Squeezy environment variables in Netlify after creating your product.' });
  }
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid request.' }); }
  const a = body.archetype || {};
  if (!ALLOWED_TYPES.has(a.name)) return json(400, { error: 'Please finish the quiz and select a valid Hidden Type result.' });
  const safeArchetype = {
    name: String(a.name).slice(0, 100),
    emoji: String(a.emoji || '✦').slice(0, 8),
    tag: String(a.tag || '').slice(0, 350),
    traits: String(a.traits || '').slice(0, 200),
    desc: String(a.desc || '').slice(0, 800),
    twist: String(a.twist || '').slice(0, 800),
    edge: String(a.edge || '').slice(0, 800),
  };
  const payload = {
    data: {
      type: 'checkouts',
      attributes: {
        product_options: {
          name: 'Hidden Type — Full Personality Report',
          description: 'A personalized, one-time digital personality report.',
          redirect_url: `${siteUrl}/?order_id=[order_id]`,
          receipt_button_text: 'Open your Hidden Type report',
          receipt_link_url: `${siteUrl}/?order_id=[order_id]`,
          receipt_thank_you_note: 'Thank you for purchasing your Hidden Type report. Return to this page to verify your purchase and view your report.'
        },
        checkout_options: { embed: false, media: false, logo: true, desc: true, discount: true, button_color: '#ff66b2' },
        checkout_data: { custom: { product: 'hidden_type_full_report_v1', archetype: safeArchetype } }
      },
      relationships: {
        store: { data: { type: 'stores', id: String(storeId) } },
        variant: { data: { type: 'variants', id: String(variantId) } }
      }
    }
  };
  try {
    const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: { 'Accept': 'application/vnd.api+json', 'Content-Type': 'application/vnd.api+json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || !data?.data?.attributes?.url) {
      console.error('Lemon Squeezy checkout error:', res.status, JSON.stringify(data).slice(0, 1200));
      return json(502, { error: 'The payment provider could not create checkout. Check the product, store and variant IDs in Netlify.' });
    }
    return json(200, { url: data.data.attributes.url });
  } catch (e) {
    console.error('Checkout request failed:', e);
    return json(502, { error: 'Could not contact the payment provider. Please try again.' });
  }
};

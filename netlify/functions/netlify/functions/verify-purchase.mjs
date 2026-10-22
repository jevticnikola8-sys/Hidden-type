const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  body: JSON.stringify(body),
});

function buildReport(a) {
  const name = String(a.name || 'Your Hidden Type').slice(0, 100);
  const traits = String(a.traits || 'Reflective · Adaptive · Individual').split('·').map(x => x.trim()).filter(Boolean);
  const traitA = traits[0] || 'your natural strengths';
  const traitB = traits[1] || 'your personal rhythm';
  const traitC = traits[2] || 'your values';
  const desc = String(a.desc || 'You bring a distinctive perspective to the situations and people around you.');
  const twist = String(a.twist || 'Your strongest habits can become limiting when you rely on them in every situation.');
  const edge = String(a.edge || 'Notice where your strengths help, and where a small adjustment could help even more.');
  const tag = String(a.tag || 'A distinctive way of seeing the world.');
  return {
    title: `${a.emoji || '✦'} ${name}: The Full Report`,
    intro: `${tag} This report is a practical reflection guide based on your Hidden Type result—not a diagnosis or a fixed definition of who you are.`,
    sections: [
      { title: '01 · Your core pattern', body: `${desc}\n\nAt your best, you can use ${traitA.toLowerCase()} as a way to understand what matters and choose your next move with intention.` },
      { title: '02 · Strengths to lean into', body: `${edge}\n\nYour reported qualities—${traits.join(', ')}—can become most useful when you apply them deliberately rather than automatically. Look for real examples in your life that confirm these strengths.` },
      { title: '03 · The blind spot', body: `${twist}\n\nA blind spot is not a flaw or a prediction. It is a pattern worth checking: when you are tired, stressed or trying to protect something important, do you overuse a familiar strength?` },
      { title: '04 · Connection & relationships', body: `Try making your intentions easier to read. Say what you appreciate, what you need, and when you need time to think. Your ${traitB.toLowerCase()} may be obvious to you but less visible to other people. Ask rather than assume what the other person meant.` },
      { title: '05 · Work & motivation', body: `Notice which tasks give you energy and which ones repeatedly drain it. Build your week around one meaningful priority, one small step you can finish, and a clear stopping point. Your ${traitC.toLowerCase()} can guide your choices, but let evidence and feedback guide your adjustments.` },
      { title: '06 · Under pressure', body: `When pressure rises, pause before defaulting to your usual response. Ask yourself: What is actually happening? What am I assuming? What would help in the next ten minutes? This creates room to use your strengths without letting a habit run the whole situation.` },
      { title: '07 · Your 7-day reflection plan', body: `Day 1: Write down three moments when you felt most like yourself.\nDay 2: Notice one strength someone else relies on you for.\nDay 3: Identify a recurring situation that drains you.\nDay 4: Try one different response to that situation.\nDay 5: Have one clear, kind conversation about a need or boundary.\nDay 6: Spend 20 minutes on a goal that matters to you.\nDay 7: Review what worked and choose one habit to keep.\n\nKeep the observations that fit your experience; discard what does not.` },
      { title: '08 · A question to keep', body: `What would change this month if you used your strengths with intention—and gave yourself permission to respond differently when your usual approach no longer helps?` }
    ]
  };
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = String(process.env.LEMONSQUEEZY_STORE_ID || '');
  const variantId = String(process.env.LEMONSQUEEZY_VARIANT_ID || '');
  if (!apiKey || !storeId || !variantId) return json(503, { error: 'Payment verification is not configured yet.' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid request.' }); }
  const orderId = String(body.orderId || '').trim();
  if (!/^\d{1,20}$/.test(orderId)) return json(400, { error: 'Missing or invalid order ID.' });
  try {
    const res = await fetch(`https://api.lemonsqueezy.com/v1/orders/${encodeURIComponent(orderId)}`, {
      headers: { 'Accept': 'application/vnd.api+json', 'Authorization': `Bearer ${apiKey}` }
    });
    const response = await res.json();
    if (!res.ok || !response?.data?.attributes) return json(402, { paid: false, error: 'We could not verify this order. If you were charged, use the receipt email and try again.' });
    const order = response.data;
    const attrs = order.attributes;
    const custom = order.meta?.custom_data || {};
    const orderStore = String(attrs.store_id || '');
    const item = attrs.first_order_item || {};
    const orderVariant = String(item.variant_id || attrs.variant_id || '');
    const paid = String(attrs.status || '').toLowerCase() === 'paid' && orderStore === storeId && (!orderVariant || orderVariant === variantId) && custom.product === 'hidden_type_full_report_v1' && custom.archetype && typeof custom.archetype.name === 'string';
    if (!paid) return json(402, { paid: false, error: 'This order is not yet verified as a paid Hidden Type report. If payment was just completed, wait a few seconds and refresh.' });
    return json(200, { paid: true, report: buildReport(custom.archetype) });
  } catch (e) {
    console.error('Purchase verification failed:', e);
    return json(502, { paid: false, error: 'Temporary verification issue. Please refresh in a moment.' });
  }
};

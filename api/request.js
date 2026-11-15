// Creates a ride request for a private person, enforcing verification and the monthly quota on the server.
const { admin, init, caller, rateLimit, israelMonth } = require('./_lib');

const REQ_PRIV = ['contactName', 'phone', 'notes', 'cog'];
const BLOCKED = ['createdBy', 'driverIds', 'driverId', 'driverName', 'driverPhone', 'driverCar', 'covers', 'status', 'confirmed', 'takenAt', 'doneAt', 'stages', 'privPending'];
const ridesOf = (r, month) => r.schedule === 'weekly' ? 4 * Math.max(1, (r.days || []).length) : ((r.date || '').slice(0, 7) === month ? 1 : 0);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  if (!init()) return res.status(503).json({ ok: false, error: 'השרת לא מוגדר' });
  let me;
  try { me = await caller(req); } catch (e) { return res.status(401).json({ ok: false, error: 'צריך להיכנס מחדש' }); }
  const r = Object.assign({}, (req.body || {}).r);
  if (r.kind !== 'private') return res.status(400).json({ ok: false });
  if (JSON.stringify(r).length > 8000) return res.status(413).json({ ok: false });
  if (!(await rateLimit(me.uid, 'request', 20))) return res.status(429).json({ ok: false, error: 'יותר מדי בקשות בשעה האחרונה' });
  const db = admin.firestore();
  const pv = await db.doc('pvts/' + me.uid).get();
  if (!pv.exists) return res.status(403).json({ ok: false, error: 'צריך להשלים אימות קודם' });
  const p = pv.data();
  if (p.status === 'blocked') return res.status(403).json({ ok: false, error: 'לא ניתן לפרסם נסיעות מהחשבון הזה. לבירור: פנו לצוות.' });
  const month = israelMonth(), limit = p.refName ? 12 : 6;
  const mine = await db.collection('requests').where('createdBy', '==', me.uid).get();
  let used = 0;
  mine.forEach(d => { const x = d.data(); if (x.status !== 'cancelled') used += ridesOf(x, month); });
  if (used + ridesOf(r, month) > limit)
    return res.status(429).json({ ok: false, error: `הגעת למכסה של ${limit} נסיעות בחודש (${used} כבר בחודש הזה). לנסיעות נוספות: דרך גורם מפנה או עמותה, או פנייה לצוות.` });
  for (const k of BLOCKED) delete r[k];
  const pub = {}, priv = {};
  for (const [k, v] of Object.entries(r)) (REQ_PRIV.includes(k) ? priv : pub)[k] = v;
  const ref = db.collection('requests').doc();
  const b = db.batch();
  b.set(ref, { ...pub, status: 'open', covers: {}, createdBy: me.uid, driverIds: [], privPending: p.status !== 'approved', createdAt: Date.now() });
  b.set(db.doc('reqPriv/' + ref.id), { ...priv, createdBy: me.uid, orgName: '', driverIds: [] });
  await b.commit();
  res.json({ ok: true, id: ref.id });
};

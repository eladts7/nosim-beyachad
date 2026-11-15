// Creates an in-app notification and a phone push, after checking that the sender
// is allowed to notify this recipient. Clients can no longer write notifications directly.
const { admin, init, caller, rateLimit, push } = require('./_lib');

const clean = s => String(s || '').replace(/https?:\/\/\S+/gi, '').replace(/\s+/g, ' ').trim().slice(0, 300);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  if (!init()) return res.status(503).json({ ok: false, error: 'not configured' });
  let me;
  try { me = await caller(req); } catch (e) { return res.status(401).json({ ok: false }); }
  const b = req.body || {};
  const to = String(b.to || ''), text = clean(b.text), link = /^#[a-z]+$/.test(b.link || '') ? b.link : '#home';
  const rid = /^[A-Za-z0-9]{10,40}$/.test(b.rid || '') ? b.rid : '';
  if (!text || !/^(admin|drv:[A-Za-z0-9]{10,40}|req:[A-Za-z0-9]{10,40})$/.test(to)) return res.status(400).json({ ok: false });
  const db = admin.firestore();

  let allowed = me.isAdmin || to === 'admin';
  if (!allowed && rid) {
    const s = await db.doc('requests/' + rid).get();
    if (s.exists) {
      const r = s.data(), x = to.slice(4), ids = r.driverIds || [];
      // A driver on the ride updates its requester.
      if (to.startsWith('req:') && x === r.createdBy && ids.includes(me.uid)) allowed = true;
      // The requester of a new ride alerts verified drivers, within 15 minutes of posting.
      if (to.startsWith('drv:') && me.uid === r.createdBy && Date.now() - (r.createdAt || 0) < 15 * 60000) {
        const d = await db.doc('drivers/' + x).get();
        if (d.exists && (d.data().verification || {}).status === 'approved' && d.data().active !== false) allowed = true;
      }
    }
  }
  if (!allowed && b.kind === 'thanks' && to.startsWith('drv:')) {
    const d = await db.doc('drivers/' + to.slice(4)).get();
    if (d.exists) allowed = true;
  }
  if (!allowed) return res.status(403).json({ ok: false });
  if (!me.isAdmin && !(await rateLimit(me.uid, 'notify', 60))) return res.status(429).json({ ok: false });

  const ref = await db.collection('notifs').add({ to, text, link, at: Date.now(), read: false, by: me.uid });
  let sent = 0;
  try { sent = await push(to, text, link); } catch (e) {}
  res.json({ ok: true, id: ref.id, sent });
};

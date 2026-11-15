// Sends a phone push for an in-app notification that was just created.
// The caller passes only the notification's id; the text and recipient are read from Firestore,
// so the push never says more than the in-app notice the security rules already allowed.
const admin = require('firebase-admin');
const webpush = require('web-push');

function init() {
  if (admin.apps.length) return true;
  if (!process.env.FIREBASE_SA || !process.env.VAPID_PRIVATE || !process.env.VAPID_PUBLIC) return false;
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SA)) });
  webpush.setVapidDetails('https://nosim-beyachad.vercel.app', process.env.VAPID_PUBLIC, process.env.VAPID_PRIVATE);
  return true;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  if (!init()) return res.status(503).json({ ok: false, error: 'not configured' });
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    await admin.auth().verifyIdToken(token);
    const id = String((req.body && req.body.id) || '');
    if (!/^[A-Za-z0-9]{10,40}$/.test(id)) return res.status(400).end();
    const db = admin.firestore();
    const ref = db.doc('notifs/' + id);
    const n = await db.runTransaction(async t => {
      const s = await t.get(ref);
      if (!s.exists) return null;
      const d = s.data();
      if (d.pushed || Date.now() - (d.at || 0) > 10 * 60 * 1000) return null;
      t.update(ref, { pushed: true });
      return d;
    });
    if (!n) return res.json({ ok: true, sent: 0 });
    const to = String(n.to || '');
    let q;
    if (to === 'admin') q = db.collection('pushSubs').where('admin', '==', true);
    else if (/^(drv|req):/.test(to)) q = db.collection('pushSubs').where('uid', '==', to.slice(4));
    else return res.json({ ok: true, sent: 0 });
    const subs = await q.get();
    const payload = JSON.stringify({ title: 'נוסעים ביחד', body: String(n.text || '').slice(0, 300), url: '/' + String(n.link || '#home').replace(/^\//, '') });
    let sent = 0;
    await Promise.all(subs.docs.map(async s => {
      try { await webpush.sendNotification(s.data().sub, payload, { TTL: 86400, urgency: 'high' }); sent++; }
      catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await s.ref.delete(); }
    }));
    res.json({ ok: true, sent });
  } catch (e) {
    res.status(401).json({ ok: false });
  }
};

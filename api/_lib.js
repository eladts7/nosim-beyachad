// Shared server helpers: Firebase Admin, web push, caller identity.
const admin = require('firebase-admin');
const webpush = require('web-push');

function init() {
  if (admin.apps.length) return true;
  if (!process.env.FIREBASE_SA) return false;
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SA)) });
  if (process.env.VAPID_PRIVATE && process.env.VAPID_PUBLIC)
    webpush.setVapidDetails('https://nosim-beyachad.vercel.app', process.env.VAPID_PUBLIC, process.env.VAPID_PRIVATE);
  return true;
}

// App Check: records whether the request came from our real app. Set APPCHECK_ENFORCE=1 to reject requests without it.
async function appCheckOk(req) {
  const t = req.headers['x-firebase-appcheck'];
  if (!t) return false;
  try { await admin.appCheck().verifyToken(t); return true; } catch (e) { return false; }
}

async function caller(req) {
  if (process.env.APPCHECK_ENFORCE === '1' && !(await appCheckOk(req))) { const e = new Error('app check'); e.code = 'appcheck'; throw e; }
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  const u = await admin.auth().verifyIdToken(token);
  const email = String(u.email || '').toLowerCase();
  let isAdmin = false;
  if (email && u.email_verified) {
    const a = await admin.firestore().doc('admins/' + email).get();
    isAdmin = a.exists;
  }
  return { uid: u.uid, email, isAdmin };
}

// At most `max` calls per hour per user and action.
async function rateLimit(uid, action, max) {
  const db = admin.firestore();
  const ref = db.doc('rate/' + action + '_' + uid);
  const hour = Math.floor(Date.now() / 3600000);
  return db.runTransaction(async t => {
    const s = await t.get(ref);
    const d = s.exists ? s.data() : {};
    const n = d.hour === hour ? (d.n || 0) : 0;
    if (n >= max) return false;
    t.set(ref, { hour, n: n + 1 });
    return true;
  });
}

async function push(to, text, link) {
  const db = admin.firestore();
  let q;
  if (to === 'admin') q = db.collection('pushSubs').where('admin', '==', true);
  else if (/^(drv|req):/.test(to)) q = db.collection('pushSubs').where('uid', '==', to.slice(4));
  else return 0;
  const subs = await q.get();
  const title = 'נוסעים ביחד', body = String(text || '').slice(0, 300), url = '/' + String(link || '#home').replace(/^\//, '');
  const payload = JSON.stringify({ title, body, url });
  let sent = 0;
  await Promise.all(subs.docs.map(async s => {
    const d = s.data();
    try {
      if (d.fcm) {
        await admin.messaging().send({ token: d.fcm, notification: { title, body }, data: { url },
          android: { priority: 'high', notification: { sound: 'default' } }, apns: { payload: { aps: { sound: 'default' } } } });
      } else {
        await webpush.sendNotification(d.sub, payload, { TTL: 86400, urgency: 'high' });
      }
      sent++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410 || /registration-token-not-registered|invalid-registration-token/.test(e.code || '')) await s.ref.delete();
    }
  }));
  return sent;
}

function israelMonth() { return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jerusalem' }).slice(0, 7); }

module.exports = { admin, init, appCheckOk, caller, rateLimit, push, israelMonth };

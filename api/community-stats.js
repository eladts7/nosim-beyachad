// Computes each driver's community numbers from all rides, and stores them on the driver.
// Runs daily from Vercel Cron, and on demand for staff.
const { admin, init, caller } = require('./_lib');

const ACCESS = ['wheelchair', 'cognitive', 'escort', 'guideDog'];
const ts = (date, time) => new Date(`${date}T${time || '00:00'}:00+02:00`).getTime();

module.exports = async (req, res) => {
  if (!init()) return res.status(503).json({ ok: false });
  const cron = process.env.CRON_SECRET && req.headers.authorization === 'Bearer ' + process.env.CRON_SECRET;
  if (!cron) {
    try { const me = await caller(req); if (!me.isAdmin) return res.status(403).json({ ok: false }); }
    catch (e) { return res.status(401).json({ ok: false }); }
  }
  const db = admin.firestore();
  const snap = await db.collection('requests').where('status', 'in', ['done', 'taken', 'open']).get();
  const st = {};
  const get = id => (st[id] = st[id] || { access: 0, lastMinute: 0, streak: 0, rides: 0 });
  snap.forEach(doc => {
    const r = doc.data();
    const runs = [];
    if (r.driverId && (r.status === 'done' || r.schedule === 'weekly')) runs.push({ id: r.driverId, at: r.takenAt, date: r.date });
    for (const [dt, c] of Object.entries(r.covers || {})) if (c && c.driverId) runs.push({ id: c.driverId, at: c.at, date: dt });
    for (const x of runs) {
      const s = get(x.id);
      s.rides++;
      if ((r.needs || []).some(k => ACCESS.includes(k))) s.access++;
      if (x.at && x.date && ts(x.date, r.time) - x.at < 864e5) s.lastMinute++;
    }
    if (r.driverId && r.schedule === 'weekly' && r.status === 'taken') {
      const s = get(r.driverId);
      s.streak = Math.max(s.streak, Math.floor((Date.now() - (r.takenAt || Date.now())) / 6048e5));
    }
  });
  const drivers = await db.collection('drivers').get();
  const now = Date.now();
  let batch = db.batch(), n = 0;
  const writes = [];
  drivers.forEach(d => {
    const s = st[d.id] || { access: 0, lastMinute: 0, streak: 0, rides: 0 };
    batch.set(d.ref, { stats: { ...s, at: now } }, { merge: true });
    if (++n % 400 === 0) { writes.push(batch.commit()); batch = db.batch(); }
  });
  writes.push(batch.commit());
  await Promise.all(writes);
  res.json({ ok: true, drivers: n });
};

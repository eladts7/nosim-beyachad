// Deletes the caller's account and personal data. Past rides stay for statistics, without personal details.
const { admin, init, caller } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  if (!init()) return res.status(503).json({ ok: false });
  let me;
  try { me = await caller(req); } catch (e) { return res.status(401).json({ ok: false }); }
  const db = admin.firestore(), uid = me.uid, FV = admin.firestore.FieldValue;
  const ops = [];
  const del = path => ops.push(db.doc(path).delete());
  ['users', 'drivers', 'driverPriv', 'driverDocs', 'pvts'].forEach(c => del(c + '/' + uid));
  (await db.collection('pushSubs').where('uid', '==', uid).get()).forEach(d => ops.push(d.ref.delete()));
  (await db.collection('notifs').where('to', 'in', ['drv:' + uid, 'req:' + uid]).get()).forEach(d => ops.push(d.ref.delete()));
  (await db.collection('orgs').where('ownerUid', '==', uid).get()).forEach(d => ops.push(d.ref.delete()));
  // Requests this person created: open ones are cancelled; personal details are removed from all.
  (await db.collection('requests').where('createdBy', '==', uid).get()).forEach(d => {
    const r = d.data();
    ops.push(d.ref.update({ createdBy: 'deleted', status: r.status === 'done' ? 'done' : 'cancelled', fromPlace: '', toPlace: '' }));
    ops.push(db.doc('reqPriv/' + d.id).delete());
  });
  // Rides this person drove: keep the ride, drop the name and phone.
  (await db.collection('requests').where('driverIds', 'array-contains', uid).get()).forEach(d => {
    const r = d.data(), upd = { driverIds: FV.arrayRemove(uid) };
    if (r.driverId === uid) Object.assign(upd, { driverName: 'נהג/ת שמחק/ה חשבון', driverPhone: '', driverCar: '' });
    ops.push(d.ref.update(upd));
  });
  ops.push(admin.storage().bucket('nosim-beyachad.firebasestorage.app').deleteFiles({ prefix: 'driverDocs/' + uid + '/' }).catch(() => {}));
  await Promise.all(ops);
  await db.collection('notifs').add({ to: 'admin', text: 'משתמש/ת מחק/ה את החשבון והמידע האישי נמחק.', link: '#admin', at: Date.now(), read: false });
  await admin.auth().deleteUser(uid);
  res.json({ ok: true });
};

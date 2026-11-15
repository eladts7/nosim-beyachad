// Organization staff: several people per organization, each seeing only that organization.
// join: a signed-in person with a pending invite becomes a member. list/invite/remove: org admins and staff.
const { admin, init, caller, rateLimit } = require('./_lib');

const validEmail = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  if (!init()) return res.status(503).json({ ok: false });
  let me;
  try { me = await caller(req); } catch (e) { return res.status(401).json({ ok: false }); }
  if (!(await rateLimit(me.uid, 'orgteam', 120))) return res.status(429).json({ ok: false, error: 'נסו שוב בעוד כמה דקות' });
  const db = admin.firestore(), b = req.body || {}, action = b.action;

  if (action === 'join') {
    if (!me.email) return res.json({ ok: true, joined: false });
    const inv = await db.doc('orgInvites/' + me.email).get();
    if (!inv.exists) return res.json({ ok: true, joined: false });
    const d = inv.data();
    await db.doc('users/' + me.uid).set({ orgApproved: true, orgName: d.orgName, orgRole: d.role === 'admin' ? 'admin' : 'staff', email: me.email, updatedAt: Date.now() }, { merge: true });
    await inv.ref.delete();
    return res.json({ ok: true, joined: true, orgName: d.orgName });
  }

  // Which organization the caller manages.
  let orgName = '';
  if (me.isAdmin && b.orgName) orgName = String(b.orgName);
  else {
    const u = await db.doc('users/' + me.uid).get();
    const p = u.exists ? u.data() : {};
    if (p.orgApproved && p.orgRole === 'admin') orgName = p.orgName;
  }
  if (!orgName) return res.status(403).json({ ok: false, error: 'רק מנהל/ת הארגון יכול/ה לנהל את הצוות' });

  if (action === 'list') {
    const [mem, inv] = await Promise.all([
      db.collection('users').where('orgName', '==', orgName).where('orgApproved', '==', true).get(),
      db.collection('orgInvites').where('orgName', '==', orgName).get()]);
    return res.json({ ok: true, orgName,
      members: mem.docs.map(d => ({ email: d.data().email || '', name: d.data().name || '', role: d.data().orgRole || 'staff', me: d.id === me.uid })),
      invites: inv.docs.map(d => ({ email: d.id, role: d.data().role || 'staff' })) });
  }
  if (action === 'invite') {
    const email = String(b.email || '').trim().toLowerCase();
    if (!validEmail(email)) return res.status(400).json({ ok: false, error: 'כתובת מייל לא תקינה' });
    await db.doc('orgInvites/' + email).set({ orgName, role: b.role === 'admin' ? 'admin' : 'staff', by: me.email, at: Date.now() });
    return res.json({ ok: true });
  }
  if (action === 'remove') {
    const email = String(b.email || '').trim().toLowerCase();
    if (email === me.email) return res.status(400).json({ ok: false, error: 'אי אפשר להסיר את עצמך' });
    await db.doc('orgInvites/' + email).delete().catch(() => {});
    const us = await db.collection('users').where('email', '==', email).where('orgName', '==', orgName).get();
    await Promise.all(us.docs.map(d => d.ref.update({ orgApproved: false, orgName: '', orgRole: '' })));
    return res.json({ ok: true });
  }
  res.status(400).json({ ok: false });
};

/*
 * YogaFlow prototype, Sprint 2: user interface.
 * Views call the domain controllers in domain.js; they hold no business rules.
 */
const STORAGE_KEY = 'yogaflow-prototype-v2';
const { seed, Studio, CATEGORY, iso, addDays } = window.YogaDomain;
const app = document.getElementById('app');
const nav = document.getElementById('navigation');
const modalRoot = document.getElementById('modal-root');
const toastRoot = document.getElementById('toast-root');

const todayDate = new Date();
todayDate.setHours(12, 0, 0, 0);
const todayIso = iso(todayDate);

// Who each preview role is (sample identities).
const ME = { instructor: 'i1', customer: 'c1' };
const ROLE_NAME = { manager: 'Studio Manager', staff: 'Front desk (Studio Staff)', instructor: 'Maya Chen (Instructor)', customer: 'Alex Morgan (Customer)' };

const pages = [
  { id: 'overview', label: 'Overview', icon: '◫', group: 'Workspace', roles: ['manager'] },
  { id: 'schedule', label: 'Class schedule', icon: '▦', group: 'Workspace', roles: ['manager', 'staff', 'instructor', 'customer'] },
  { id: 'passes', label: 'Passes & purchases', customerLabel: 'My passes', icon: '▤', group: 'Workspace', roles: ['manager', 'staff', 'customer'] },
  { id: 'checkin', label: 'Class check-in', icon: '◉', group: 'Workspace', roles: ['manager', 'staff', 'instructor'] },
  { id: 'reports', label: 'Reports', icon: '▥', group: 'Workspace', roles: ['manager', 'staff', 'instructor', 'customer'] },
  { id: 'customers', label: 'Customers', icon: '♧', group: 'Management', roles: ['manager', 'staff'] },
  { id: 'manage', label: 'Manage schedule', icon: '✎', group: 'Management', roles: ['manager'] },
  { id: 'settings', label: 'Pass settings', icon: '⚙', group: 'Management', roles: ['manager'] },
  { id: 'corrections', label: 'Corrections', icon: '↶', group: 'Management', roles: ['manager'] }
];

// ---------- State ----------
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (s && s.seededOn === todayIso && Array.isArray(s.customers)) return s;
  } catch (e) { /* fall through to a fresh seed */ }
  return { ...seed(todayIso), seededOn: todayIso };
}
let state = load();
let studio = Studio(state, todayIso);
const freshUi = () => ({
  role: 'manager', page: 'overview',
  passCustomer: 'c1', passQuery: '', notDup: false, passType: 'pt10', passStart: todayIso, payStatus: 'confirmed', payRef: '', passMode: 'buy', paperType: 'pt10', paperStart: addDays(todayIso, -14), paperUses: 6,
  checkSession: 's1', checkCustomer: 'c1', checkQuery: '', arrival: 20, overrides: [], overrideReason: '',
  scheduleType: 'all', scheduleQuery: '', selectedCustomer: 'c1', customerQuery: '', reportTab: 0, salesRange: 30
});
let ui = freshUi();
function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ } }

// ---------- Small view helpers ----------
const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const fmtDate = v => v ? (v.length > 10 ? new Date(v) : new Date(`${v}T12:00:00`)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const weekday = v => new Date(`${v}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
const money = n => `$${Number(n).toFixed(2)}`;
const timeOf = v => new Date(v).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const byTime = (a, b) => (a.date + a.time).localeCompare(b.date + b.time);
const canStaff = () => ui.role === 'staff' || ui.role === 'manager';
const label = c => c ? `${c.name}${state.customers.filter(x => x.name === c.name).length > 1 ? ` · ${c.phone}` : ''}` : 'Unknown customer';

function toast(message) {
  toastRoot.innerHTML = `<div class="toast">${esc(message)}</div>`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { toastRoot.innerHTML = ''; }, 3800);
}
function pageHead(title, subtitle, actions = '') {
  return `<div class="page-head"><div><p class="eyebrow">Yoga H’om studio</p><h1>${title}</h1><p>${subtitle}</p></div>${actions ? `<div class="head-actions">${actions}</div>` : ''}</div>`;
}
function notice(text) { return `<div class="notice"><strong>Prototype 2.0.</strong> Sample data only. ${text || ''}</div>`; }
function button(text, action, kind = '', attrs = '') { return `<button class="button ${kind}" data-action="${action}" ${attrs}>${text}</button>`; }
function tag(category) { return `<span class="tag ${category === 'special' ? 'special' : category === 'workshop' ? 'workshop' : ''}">${CATEGORY[category] || esc(category)}</span>`; }
function statusTag(st) {
  const cls = { active: 'active', future: 'warning', expired: 'expired', depleted: 'expired', voided: 'cancelled' }[st.code] || '';
  return `<span class="tag ${cls}">${esc(st.label)}</span>`;
}
function payTag(status) { return status === 'confirmed' ? '<span class="tag active">Paid</span>' : status === 'pending' ? '<span class="tag warning">Payment pending</span>' : '<span class="tag">Paid on paper card</span>'; }

// Schedule icons (Sprint 1 validation question 1).
function sessionBadges(s) {
  const out = [];
  const roster = studio.rosterOf(s.id);
  if (s.status === 'cancelled') return '<span class="icon-badge full" title="Cancelled">✕ Cancelled</span>';
  if (ui.role === 'customer' && roster.some(a => a.customerId === ME.customer)) out.push('<span class="icon-badge ok" title="You are on this class roster">✓ Registered</span>');
  const left = s.capacity - roster.length;
  if (left <= 0) out.push('<span class="icon-badge full" title="Class is full. A waiting list comes with booking in Release 2">⛔ Full · waitlist (R2)</span>');
  else if (left <= 3) out.push(`<span class="icon-badge few" title="Few spots left">▲ ${left} spot${left === 1 ? '' : 's'} left</span>`);
  else out.push(`<span class="icon-badge" title="Spots left">● ${left} of ${s.capacity} open</span>`);
  if (s.freeCheckIn) out.push('<span class="icon-badge free" title="Free class for registered customers">★ Free class</span>');
  return out.join('');
}
function legend() {
  return `<div class="legend"><span class="icon-badge ok">✓ Registered</span><span class="icon-badge">● Spots open</span><span class="icon-badge few">▲ Few spots left</span><span class="icon-badge full">⛔ Full · waitlist (Release 2)</span><span class="icon-badge free">★ Free class</span><span class="icon-badge full">✕ Cancelled</span></div>`;
}
function sessionRow(s) {
  const ins = studio.instructor(s.instructorId); const room = studio.room(s.roomId);
  return `<div class="session-row"><div class="session-time"><small>${weekday(s.date)}</small>${esc(s.time)}</div><div><div class="session-name">${esc(s.name)}</div><div class="session-meta">${fmtDate(s.date)} · ${esc(ins.name)} · ${esc(room.name)} · ${s.durationMinutes} min</div><div class="badge-row">${sessionBadges(s)}</div></div>${tag(s.category)}</div>`;
}
function customerPicker(id, query, selected, list) {
  return `<label class="form-field"><span class="small-note">Find customer (name or phone)</span><input class="search" id="${id}-query" placeholder="Type a name" value="${esc(query)}" autocomplete="off"></label><label class="form-field"><span class="small-note">${list.length} match${list.length === 1 ? '' : 'es'}</span><select class="field" id="${id}">${list.map(c => `<option value="${c.id}" ${selected === c.id ? 'selected' : ''}>${esc(c.name)}${c.duplicateName ? ` · ${esc(c.phone)}` : ''}</option>`).join('') || '<option value="">No match: register the customer</option>'}</select></label>`;
}

// ---------- Navigation ----------
function navRender() {
  const allowed = pages.filter(p => p.roles.includes(ui.role));
  if (!allowed.some(p => p.id === ui.page)) ui.page = allowed[0].id;
  let group = '';
  nav.innerHTML = allowed.map(p => {
    let head = '';
    if (p.group !== group) { group = p.group; head = `<div class="nav-group-label">${group}</div>`; }
    const text = ui.role === 'customer' && p.customerLabel ? p.customerLabel : p.label;
    return `${head}<button class="nav-item ${ui.page === p.id ? 'active' : ''}" data-page="${p.id}"><span class="nav-icon">${p.icon}</span>${text}</button>`;
  }).join('');
  const current = pages.find(p => p.id === ui.page);
  document.getElementById('crumb-page').textContent = ui.role === 'customer' && current.customerLabel ? current.customerLabel : current.label;
  document.getElementById('role-identity').textContent = ROLE_NAME[ui.role];
}
function render() {
  navRender();
  const views = { overview: renderOverview, schedule: renderSchedule, passes: renderPasses, checkin: renderCheckin, customers: renderCustomers, manage: renderManage, settings: renderSettings, corrections: renderCorrections, reports: renderReports };
  app.innerHTML = views[ui.page]();
  document.getElementById('role-select').value = ui.role;
}

// ---------- Overview (manager) ----------
function renderOverview() {
  const upcoming = state.sessions.filter(s => s.status !== 'cancelled' && s.date >= todayIso).sort(byTime);
  const todays = upcoming.filter(s => s.date === todayIso);
  const pending = state.purchases.filter(p => !p.voided && p.paymentStatus === 'pending');
  const expiring = state.passes.filter(p => studio.passStatus(p).code === 'active' && p.expiryDate <= addDays(todayIso, 14));
  const activity = [
    ...state.purchases.filter(p => !p.voided).map(p => ({ when: p.recordedAt, text: `${label(studio.customer(p.customerId))} bought a ${studio.passType(p.passTypeId).name}` })),
    ...state.attendance.filter(a => !a.voided && !a.id.startsWith('ba')).map(a => ({ when: a.recordedAt, text: `${label(studio.customer(a.customerId))} checked in to ${studio.session(a.sessionId).name}` })),
    ...state.corrections.map(c => ({ when: c.at, text: c.action }))
  ].sort((a, b) => b.when.localeCompare(a.when)).slice(0, 5);
  return `${pageHead('Studio overview', 'Today’s classes, payments to follow up, and recent activity.', button('Open check-in', 'go-checkin', 'primary'))}${notice('Rules follow the studio’s answers from the Sprint 1 review.')}
  <div class="grid stats-grid">
    <div class="stat-card"><div class="label">Classes today</div><div class="value accent">${todays.length}</div><div class="hint">${upcoming.length} upcoming in total</div></div>
    <div class="stat-card"><div class="label">Registered customers</div><div class="value">${state.customers.length}</div><div class="hint">Name, phone, email, address, birth date</div></div>
    <div class="stat-card"><div class="label">Payments pending</div><div class="value">${pending.length}</div><div class="hint">Confirm before class</div></div>
    <div class="stat-card"><div class="label">Passes expiring ≤ 14 days</div><div class="value">${expiring.length}</div><div class="hint">Earliest-expiring used first</div></div>
  </div>
  <div class="grid two-col"><section class="panel"><div class="panel-head"><h2>Upcoming classes</h2><button class="text-link" data-action="go-schedule">View schedule →</button></div><div class="session-list">${upcoming.slice(0, 4).map(sessionRow).join('') || '<div class="empty">No upcoming sessions.</div>'}</div></section>
  <section class="panel"><div class="panel-head"><h2>Recent activity</h2><span class="panel-sub">This browser’s records</span></div>${activity.map(a => `<div class="activity-item"><div class="activity-marker"></div><div><strong>${esc(a.text)}</strong><p>${fmtDate(a.when)}</p></div></div>`).join('') || '<div class="empty">Purchases and check-ins appear here.</div>'}</section></div>`;
}

// ---------- UC-01 View Class Schedule ----------
function renderSchedule() {
  const mine = ui.role === 'instructor';
  const list = state.sessions.filter(s => s.date >= todayIso && (ui.scheduleType === 'all' || s.category === ui.scheduleType) && (!mine || s.instructorId === ME.instructor) && `${s.name} ${studio.instructor(s.instructorId).name}`.toLowerCase().includes(ui.scheduleQuery.toLowerCase())).sort(byTime);
  return `${pageHead(mine ? 'My classes' : 'Class schedule', mine ? 'Classes you teach, with how many people have checked in.' : 'Regular classes, workshops, and special programs. Icons show what you need at a glance.')}${notice('Booking and waiting lists are planned for a later release; “full” means 20 check-ins.')}
  <div class="toolbar"><input class="search" id="schedule-search" placeholder="Search class or instructor" value="${esc(ui.scheduleQuery)}" aria-label="Search class or instructor"><select class="field" id="schedule-type"><option value="all">All offering types</option>${Object.entries(CATEGORY).map(([v, l]) => `<option value="${v}" ${ui.scheduleType === v ? 'selected' : ''}>${l}s</option>`).join('')}</select></div>
  ${legend()}
  <section class="panel"><div class="panel-head"><h2>Published sessions</h2><span class="panel-sub">${list.length} session${list.length === 1 ? '' : 's'}</span></div><div class="session-list">${list.map(sessionRow).join('') || '<div class="empty">No classes match these filters.</div>'}</div></section>`;
}

// ---------- UC-02 Record Pass Purchase / UC-03 View Pass Status ----------
function passesTable(customerId) {
  const passes = state.passes.filter(p => p.customerId === customerId).sort((a, b) => b.effectiveStartDate.localeCompare(a.effectiveStartDate));
  return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Pass</th><th>Valid from</th><th>Expires</th><th>Remaining</th><th>Status</th><th>Payment</th><th></th></tr></thead><tbody>${passes.map(p => {
    const t = studio.passType(p.passTypeId); const pur = studio.purchaseOf(p);
    return `<tr><td><strong>${esc(t.name)}</strong><br><span class="muted">${CATEGORY[t.category]}${p.source === 'paper-transfer' ? ' · moved from paper card' : ''}</span></td><td>${fmtDate(p.effectiveStartDate)}</td><td>${fmtDate(p.expiryDate)}</td><td>${p.remainingUses === null ? 'Unlimited' : p.remainingUses}</td><td>${statusTag(studio.passStatus(p))}</td><td>${payTag(pur ? pur.paymentStatus : 'paper')}</td><td><button class="text-link" data-pass-history="${p.id}">History</button>${canStaff() && pur && pur.paymentStatus === 'pending' && !pur.voided ? ` · <button class="text-link" data-confirm-pay="${pur.id}">Confirm payment</button>` : ''}</td></tr>`;
  }).join('') || `<tr><td colspan="7" class="empty">No passes yet.</td></tr>`}</tbody></table></div>`;
}
function renderPasses() {
  if (ui.role === 'customer') {
    const c = studio.customer(ME.customer);
    return `${pageHead('My passes', 'Each pass shows when it starts, when it expires, and what is left.')}${notice('Passes are personal and cannot be shared or transferred.')}<section class="panel"><div class="panel-head"><h2>${esc(c.name)}</h2><span class="panel-sub">The pass that expires first is used at check-in</span></div>${passesTable(c.id)}</section>`;
  }
  const list = studio.findCustomers(ui.passQuery);
  if (!list.some(c => c.id === ui.passCustomer)) ui.passCustomer = list[0]?.id || '';
  const c = studio.customer(ui.passCustomer);
  const groups = [['regular', 'Regular class passes'], ['workshop', 'Workshop passes'], ['special', 'Special program passes']];
  let body = '';
  if (c && ui.passMode === 'buy') {
    const q = studio.quotePurchase(c.id, ui.passType, ui.passStart);
    const dup = studio.possibleDuplicate(c.id, ui.passType);
    body = `<div class="purchase-layout"><section class="panel"><div class="panel-head"><h2>Select a pass</h2><span class="panel-sub">Sample prices · validity set in Pass settings</span></div>
      ${groups.map(([cat, title]) => `<div class="section-label">${title}</div><div class="offering-grid">${state.passTypes.filter(t => t.category === cat).map(t => `<div role="button" tabindex="0" class="offering-card ${ui.passType === t.id ? 'selected' : ''}" data-plan="${t.id}"><h3>${esc(t.name)}</h3><p>${t.uses === null ? 'Unlimited classes' : `${t.uses} class${t.uses === 1 ? '' : 'es'}`} · valid ${t.validityDays} day${t.validityDays === 1 ? '' : 's'}</p><div class="price">${money(t.price)}</div></div>`).join('')}</div>`).join('')}
      <div class="section-label">Purchase details</div><div class="form-grid">
        <div class="form-field"><label for="pass-start">Effective start date</label><input class="field" type="date" id="pass-start" min="${todayIso}" value="${ui.passStart}"><span class="form-help">The pass is valid from this date.</span></div>
        <div class="form-field"><label>Senior discount</label><div class="field readonly">${esc(q.discountReason)}</div><span class="form-help">Applied automatically from the birth date on file.</span></div>
        <div class="form-field"><label for="pay-status">Payment</label><select class="field" id="pay-status"><option value="confirmed" ${ui.payStatus === 'confirmed' ? 'selected' : ''}>Paid at studio terminal</option><option value="pending" ${ui.payStatus === 'pending' ? 'selected' : ''}>Pending confirmation</option></select><span class="form-help">Release 1 records payments taken in the studio’s current system. Online payment comes in Release 2.</span></div>
        <div class="form-field"><label for="pay-ref">Payment reference</label><input class="field" id="pay-ref" placeholder="e.g. POS-1042" value="${esc(ui.payRef)}"><span class="form-help">Receipt number from the terminal.</span></div>
      </div></section>
      <aside class="panel"><div class="panel-head"><h2>Purchase preview</h2></div>
        <div class="summary-line"><span>Customer</span><strong>${esc(label(c))}</strong></div>
        <div class="summary-line"><span>Pass</span><strong>${esc(q.type.name)}</strong></div>
        <div class="summary-line"><span>Valid</span><strong>${fmtDate(q.start)} – ${fmtDate(q.expiry)}</strong></div>
        <div class="summary-line"><span>Uses</span><strong>${q.type.uses === null ? 'Unlimited' : q.type.uses}</strong></div>
        <div class="summary-line"><span>List price</span><strong>${money(q.listPrice)}</strong></div>
        <div class="summary-line"><span>Senior discount</span><strong>${q.discount ? `− ${money(q.discount)}` : '—'}</strong></div>
        <div class="summary-line"><span>Amount due</span><strong>${money(q.amountDue)}</strong></div>
        <p class="small-note">Passes are personal and cannot be shared or transferred.</p>
        ${dup ? `<div class="warning-box" style="margin-top:12px">Possible duplicate: ${esc(c.name)} already bought a ${esc(q.type.name)} today at ${timeOf(dup.recordedAt)}.<label class="override-line" style="margin-top:8px"><input type="checkbox" id="not-dup" ${ui.notDup ? 'checked' : ''}> I checked: this is a separate purchase</label></div>` : ''}
        <div style="margin-top:18px">${button('Record purchase', 'purchase', 'primary', dup && !ui.notDup ? 'disabled' : '')}</div></aside></div>`;
  } else if (c) {
    const regular = state.passTypes.filter(t => t.uses !== 1 || t.category !== 'regular');
    body = `<section class="panel"><div class="panel-head"><h2>Log an existing paper pass</h2><span class="panel-sub">Transition strategy: done once, when the customer first walks in after go-live</span></div>
      <div class="form-grid"><div class="form-field"><label for="paper-type">Pass on the paper card</label><select class="field" id="paper-type">${regular.map(t => `<option value="${t.id}" ${ui.paperType === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></div>
      <div class="form-field"><label for="paper-start">Start date written on the card</label><input class="field" type="date" id="paper-start" value="${ui.paperStart}"></div>
      <div class="form-field"><label for="paper-uses">Classes left on the card</label><input class="field" type="number" min="0" max="10" id="paper-uses" value="${ui.paperUses}"></div>
      <div class="form-field"><label>Payment</label><div class="field readonly">Already paid on paper</div></div></div>
      <p class="small-note">The customer may keep the card, but check-ins are digital from now on.</p><div style="margin-top:14px">${button('Log paper pass', 'paper-pass', 'primary')}</div></section>`;
  }
  return `${pageHead('Passes & purchases', 'Find the customer, choose a pass, and record the payment.', button('Register customer', 'new-customer'))}${notice('Senior discount and pass dates are calculated by the system.')}
  <div class="toolbar">${customerPicker('pass-customer', ui.passQuery, ui.passCustomer, list)}</div>
  <div class="pill-row"><button class="pill-button ${ui.passMode === 'buy' ? 'active' : ''}" data-pass-mode="buy">Sell a pass</button><button class="pill-button ${ui.passMode === 'paper' ? 'active' : ''}" data-pass-mode="paper">Log a paper pass</button></div>
  ${c ? body : '<section class="panel"><div class="empty">No customer found. Register the customer first; everyone needs a record, even for a free class.</div></section>'}
  ${c ? `<div class="section-label">${esc(label(c))}: passes</div><section class="panel">${passesTable(c.id)}</section>` : ''}`;
}

// ---------- UC-04 Record Class Attendance / UC-10 Submit Class Roster ----------
function renderCheckin() {
  const sessions = state.sessions.filter(s => s.status !== 'cancelled' && s.date >= addDays(todayIso, -1) && (ui.role !== 'instructor' || s.instructorId === ME.instructor)).sort(byTime);
  if (!sessions.some(s => s.id === ui.checkSession)) ui.checkSession = sessions[0]?.id;
  const s = studio.session(ui.checkSession);
  const list = studio.findCustomers(ui.checkQuery);
  if (!list.some(c => c.id === ui.checkCustomer)) ui.checkCustomer = list[0]?.id || '';
  const c = studio.customer(ui.checkCustomer);
  const ev = studio.evaluateCheckIn({ sessionId: ui.checkSession, customerId: ui.checkCustomer, minutesBeforeStart: Number(ui.arrival) });
  const roster = s ? studio.rosterOf(s.id) : [];
  const isMine = ui.role === 'instructor' && s && s.instructorId === ME.instructor;
  const locked = s && s.roster.status === 'submitted';
  const ruleLine = (ok, text, kind) => `<div class="rule-line ${kind}"><span>${kind === 'ok' ? '✓' : kind === 'warn' ? '!' : '✕'}</span><div>${text}</div></div>`;
  const okRules = [];
  if (!ev.blockers.some(b => b.code === 'locked')) okRules.push('Roster is open');
  if (!ev.blockers.some(b => b.code === 'duplicate')) okRules.push('Not already checked in');
  if (!ev.overridable.some(o => o.code === 'early')) okRules.push(`Inside the check-in window (opens ${state.settings.checkInWindowMinutes} min before)`);
  if (s && !ev.overridable.some(o => o.code === 'capacity')) okRules.push(`Space in class (${roster.length} of ${s.capacity})`);
  if (ev.pass && !ev.overridable.some(o => o.code === 'payment')) okRules.push('Payment confirmed');
  if (ev.coverage === 'free') okRules.push('Free class: no pass needed for registered customers');
  const canConfirm = !ev.blockers.length && (!ev.overridable.length || (canStaff() && ev.overridable.every(o => ui.overrides.includes(o.code)) && ui.overrideReason.trim().length >= 3));
  const passBox = ev.pass ? `<div class="check-option selected"><div><strong>${esc(studio.passType(ev.pass.passTypeId).name)}</strong><small>Expires ${fmtDate(ev.pass.expiryDate)} · ${ev.pass.remainingUses === null ? 'unlimited' : `${ev.pass.remainingUses} left`} · chosen automatically: expires first</small></div><span class="tag active">Will be used</span></div>${ev.otherPasses.map(p => `<div class="check-option disabled"><div><strong>${esc(studio.passType(p.passTypeId).name)}</strong><small>Expires ${fmtDate(p.expiryDate)} · kept for later</small></div><span class="tag">Not used</span></div>`).join('')}` : ev.coverage === 'free' ? '<div class="check-option selected"><div><strong>Free class</strong><small>Class policy allows free check-in for registered customers</small></div><span class="tag active">No pass use</span></div>' : '';
  const nopass = ev.blockers.some(b => b.code === 'nopass');
  return `${pageHead('Class check-in', ui.role === 'instructor' ? 'Check in your students, then submit the roster.' : 'Check in a customer. Staff can override some rules with a reason.')}${notice('Instructors run check-in (Sprint 1 review). Arrival time is simulated for the demo.')}
  <div class="toolbar"><label class="form-field"><span class="small-note">Class session</span><select class="field" id="check-session">${sessions.map(x => `<option value="${x.id}" ${ui.checkSession === x.id ? 'selected' : ''}>${fmtDate(x.date)} · ${esc(x.time)} · ${esc(x.name)}${x.roster.status === 'submitted' ? ' (submitted)' : ''}</option>`).join('')}</select></label>
  ${customerPicker('check-customer', ui.checkQuery, ui.checkCustomer, list)}
  <label class="form-field"><span class="small-note">Arrival (simulated)</span><select class="field" id="arrival">${[[45, '45 min before class'], [20, '20 min before class'], [5, '5 min before class'], [-10, '10 min after start']].map(([v, l]) => `<option value="${v}" ${Number(ui.arrival) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
  <div class="grid two-col"><section class="panel"><div class="panel-head"><h2>Check-in rules</h2><span class="panel-sub">${s ? `${esc(s.name)} · ${fmtDate(s.date)} ${esc(s.time)} · ${tag(s.category)}` : ''}</span></div>
    <div class="rule-list">${ev.blockers.map(b => ruleLine(false, esc(b.text), 'stop')).join('')}${ev.overridable.map(o => ruleLine(false, esc(o.text), 'warn')).join('')}${okRules.map(t => ruleLine(true, esc(t), 'ok')).join('')}</div>
    ${passBox ? `<div class="section-label">Pass to use</div><div class="check-options">${passBox}</div>` : ''}
    ${nopass ? `<div class="warning-box" style="margin-top:14px">${canStaff() ? `The customer must buy a pass before class. <button class="text-link" data-action="sell-from-checkin">Sell a pass →</button>` : 'Please send the customer to the front desk to buy a pass.'}</div>` : ''}
    ${ev.overridable.length && canStaff() && !ev.blockers.length ? `<div class="section-label">Staff override</div><div class="override-box">${ev.overridable.map(o => `<label class="override-line"><input type="checkbox" data-override="${o.code}" ${ui.overrides.includes(o.code) ? 'checked' : ''}> Override: ${{ early: 'early check-in', capacity: 'class limit', payment: 'unconfirmed payment' }[o.code]}</label>`).join('')}<textarea class="field" id="override-reason" rows="2" placeholder="Reason (kept with the check-in)">${esc(ui.overrideReason)}</textarea></div>` : ''}
    ${ev.overridable.length && !canStaff() && !ev.blockers.length ? '<div class="warning-box" style="margin-top:14px">Ask front-desk staff to review this check-in. Only staff can override.</div>' : ''}
  </section>
  <aside class="panel"><div class="panel-head"><h2>Check-in preview</h2></div>
    <div class="summary-line"><span>Customer</span><strong>${esc(label(c))}</strong></div>
    <div class="summary-line"><span>Class</span><strong>${s ? esc(s.name) : '—'}</strong></div>
    <div class="summary-line"><span>Covered by</span><strong>${ev.pass ? esc(studio.passType(ev.pass.passTypeId).name) : ev.coverage === 'free' ? 'Free class' : '—'}</strong></div>
    <div class="summary-line"><span>After check-in</span><strong>${ev.blockers.some(b => b.code === 'duplicate') ? 'Already recorded' : ev.pass ? (ev.pass.remainingUses === null ? 'Unlimited' : `${ev.pass.remainingUses - 1} left`) : 'No pass use'}</strong></div>
    ${c && c.medicalNotes ? `<p class="small-note">⚕ Medical note on file: ${esc(c.medicalNotes)}</p>` : ''}
    <div style="margin-top:18px">${button(ev.blockers.some(b => b.code === 'duplicate') ? 'Already checked in' : 'Confirm check-in', 'confirm-checkin', 'primary', canConfirm ? '' : 'disabled')}</div></aside></div>
  <div class="section-label">Class roster</div>
  <section class="panel"><div class="panel-head"><h2>${s ? esc(s.name) : 'Roster'} · ${roster.length} of ${s ? s.capacity : 0}</h2><span class="panel-sub">${locked ? `<span class="tag cancelled">Submitted ${fmtDate(s.roster.submittedAt)} · locked</span>` : '<span class="tag active">Open</span>'} ${isMine ? (locked ? button('Reopen roster', 'reopen-roster', 'ghost') : button('Submit roster', 'submit-roster', 'ghost')) : locked ? '<span class="muted">Only the instructor can reopen</span>' : ''}</span></div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Customer</th><th>Covered by</th><th>Overrides</th><th>Recorded by</th><th>Time</th></tr></thead><tbody>${roster.map(a => { const cu = studio.customer(a.customerId); const p = studio.byId('passes', a.passId); return `<tr><td><strong>${esc(label(cu))}</strong>${cu.medicalNotes ? ' <span title="Medical note on file">⚕</span>' : ''}</td><td>${p ? esc(studio.passType(p.passTypeId).name) : a.coverage === 'free' ? 'Free class' : '—'}</td><td>${a.overrides.length ? a.overrides.map(o => `<span class="tag warning">${o.code}</span>`).join(' ') : '—'}</td><td>${esc(a.recordedBy)}</td><td>${timeOf(a.recordedAt)}</td></tr>`; }).join('') || '<tr><td colspan="5" class="empty">No one has checked in yet.</td></tr>'}</tbody></table></div></section>`;
}

// ---------- UC-08 Register Customer / UC-09 Find Customer ----------
function renderCustomers() {
  const list = studio.findCustomers(ui.customerQuery);
  if (!list.some(c => c.id === ui.selectedCustomer)) ui.selectedCustomer = list[0]?.id || '';
  const c = studio.customer(ui.selectedCustomer);
  const visits = c ? studio.state.attendance.filter(a => !a.voided && a.customerId === c.id) : [];
  return `${pageHead('Customers', 'Find a customer by name; the phone number tells people with the same name apart.', button('Register customer', 'new-customer', 'primary'))}${notice('Everyone who attends needs a record, including free-class visitors.')}
  <div class="customer-grid"><section class="panel"><div class="panel-head"><h2>Customer list</h2><span class="panel-sub">${list.length} of ${state.customers.length}</span></div><input class="search" id="customer-query" placeholder="Search name or phone" value="${esc(ui.customerQuery)}" style="width:100%;margin-bottom:12px"><div class="customer-list">${list.map(x => `<button class="customer-choice ${c && c.id === x.id ? 'active' : ''}" data-customer="${x.id}">${esc(x.name)}${x.duplicateName ? ' <span class="tag warning">same name</span>' : ''}<small>${esc(x.phone)}</small></button>`).join('') || '<div class="empty">No match. Register a new customer.</div>'}</div></section>
  ${c ? `<section class="panel"><div class="detail-hero"><div class="person-avatar">${esc(c.name.split(' ').map(n => n[0]).slice(0, 2).join(''))}</div><div><h2>${esc(c.name)}</h2><p>${esc(c.phone)} · ${esc(c.email)}</p></div></div>
    <div class="summary-line"><span>Home address</span><strong>${esc(c.homeAddress)}</strong></div>
    <div class="summary-line"><span>Date of birth</span><strong>${fmtDate(c.dateOfBirth)} (age ${studio.ageOn(c.dateOfBirth, todayIso)})${studio.ageOn(c.dateOfBirth, todayIso) >= state.settings.seniorAge ? ' · senior rate' : ''}</strong></div>
    <div class="summary-line"><span>Medical notes</span><strong>${esc(c.medicalNotes || 'None given (optional)')}</strong></div>
    <div class="summary-line"><span>Registered</span><strong>${fmtDate(c.registeredOn)}</strong></div>
    <div class="section-label">Passes</div>${passesTable(c.id)}
    <div class="section-label">Attendance history</div><div class="table-wrap"><table class="data-table"><thead><tr><th>Class</th><th>Date</th><th>Covered by</th></tr></thead><tbody>${visits.map(a => `<tr><td>${esc(studio.session(a.sessionId).name)}</td><td>${fmtDate(studio.session(a.sessionId).date)}</td><td>${a.passId ? esc(studio.passType(studio.byId('passes', a.passId).passTypeId).name) : 'Free class'}</td></tr>`).join('') || '<tr><td colspan="3" class="empty">No check-ins yet.</td></tr>'}</tbody></table></div></section>` : '<section class="panel"><div class="empty">Select a customer.</div></section>'}</div>`;
}

// ---------- UC-05.1–5.4 Manage Class Schedule ----------
function renderManage() {
  const sorted = state.sessions.filter(s => s.date >= addDays(todayIso, -1)).sort(byTime);
  return `${pageHead('Manage schedule', 'Create, change, or cancel classes. Every save checks the instructor, the room, and the studio calendar.', button('Create class', 'new-session', 'primary'))}${notice('Cancelling a class gives back any pass uses already taken.')}
  <section class="panel"><div class="panel-head"><h2>Class sessions</h2><span class="panel-sub">${sorted.length} sessions</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Class</th><th>Date & time</th><th>Instructor</th><th>Room</th><th>Check-ins</th><th>Status</th><th>Actions</th></tr></thead><tbody>${sorted.map(s => `<tr><td><strong>${esc(s.name)}</strong><br>${tag(s.category)}${s.freeCheckIn ? ' <span class="icon-badge free">★ Free</span>' : ''}</td><td>${fmtDate(s.date)} · ${esc(s.time)}<br><span class="muted">${s.durationMinutes} min</span></td><td>${esc(studio.instructor(s.instructorId).name)}</td><td>${esc(studio.room(s.roomId).name)}</td><td>${studio.rosterOf(s.id).length} / ${s.capacity}</td><td><span class="tag ${s.status === 'cancelled' ? 'cancelled' : 'active'}">${s.status === 'cancelled' ? 'Cancelled' : 'Published'}</span></td><td>${s.status === 'cancelled' ? '—' : `<button class="text-link" data-edit-session="${s.id}">Modify</button> · <button class="text-link danger-text" data-cancel-session="${s.id}">Cancel</button>`}</td></tr>`).join('')}</tbody></table></div></section>
  <div class="section-label">Studio calendar</div><section class="panel"><div class="panel-head"><h2>Closed days</h2>${button('Add closed day', 'new-closure')}</div><div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Reason</th></tr></thead><tbody>${state.closures.slice().sort((a, b) => a.date.localeCompare(b.date)).map(k => `<tr><td>${fmtDate(k.date)}</td><td>${esc(k.reason)}</td></tr>`).join('') || '<tr><td colspan="2" class="empty">No closed days.</td></tr>'}</tbody></table></div></section>`;
}

// ---------- Pass settings (BR-01 customizable validity) ----------
function renderSettings() {
  const st = state.settings;
  return `${pageHead('Pass settings', 'The studio can change pass validity, uses, and prices without a code change.', button('Save settings', 'save-settings', 'primary'))}${notice('Prices are sample values.')}
  <section class="panel"><div class="panel-head"><h2>Pass types</h2><span class="panel-sub">New purchases use these values</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Pass</th><th>Covers</th><th>Classes</th><th>Validity (days)</th><th>Price ($)</th></tr></thead><tbody>${state.passTypes.map(t => `<tr><td><strong>${esc(t.name)}</strong></td><td>${CATEGORY[t.category]}</td><td>${t.uses === null ? 'Unlimited' : `<input class="field mini" type="number" min="1" data-setting="uses" data-type="${t.id}" value="${t.uses}">`}</td><td><input class="field mini" type="number" min="1" data-setting="validityDays" data-type="${t.id}" value="${t.validityDays}"></td><td><input class="field mini" type="number" min="0" step="1" data-setting="price" data-type="${t.id}" value="${t.price}"></td></tr>`).join('')}</tbody></table></div></section>
  <div class="section-label">Studio rules</div><section class="panel"><div class="form-grid">
    <div class="form-field"><label>Senior discount age</label><input class="field" type="number" data-rule="seniorAge" value="${st.seniorAge}"></div>
    <div class="form-field"><label>Senior discount (%)</label><input class="field" type="number" data-rule="seniorRate" value="${st.seniorRate}"><span class="form-help">Sample rate; the studio sets the real one.</span></div>
    <div class="form-field"><label>Check-in opens (minutes before class)</label><input class="field" type="number" data-rule="checkInWindowMinutes" value="${st.checkInWindowMinutes}"></div>
    <div class="form-field"><label>Default class limit</label><input class="field" type="number" data-rule="defaultCapacity" value="${st.defaultCapacity}"></div></div></section>`;
}

// ---------- UC-06 Correct Purchase or Attendance Record ----------
function renderCorrections() {
  const attend = state.attendance.filter(a => !a.id.startsWith('ba')).slice().reverse();
  const purchases = state.purchases.filter(p => !p.id.startsWith('bp')).slice().reverse();
  return `${pageHead('Corrections', 'Reverse a mistaken entry. The original and the reason are kept.')}${notice('A submitted roster must be reopened by its instructor before a check-in can be reversed.')}
  <div class="grid two-col"><section class="panel"><div class="panel-head"><h2>Check-ins</h2><span class="panel-sub">Reversal gives back one pass use</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Customer / class</th><th>Status</th><th>Action</th></tr></thead><tbody>${attend.map(a => `<tr><td><strong>${esc(label(studio.customer(a.customerId)))}</strong><br><span class="muted">${esc(studio.session(a.sessionId).name)} · ${fmtDate(studio.session(a.sessionId).date)}</span></td><td>${a.voided ? '<span class="tag cancelled">Reversed</span>' : '<span class="tag active">Recorded</span>'}</td><td>${a.voided ? '—' : `<button class="text-link danger-text" data-reverse-attendance="${a.id}">Reverse</button>`}</td></tr>`).join('') || '<tr><td colspan="3" class="empty">No check-ins.</td></tr>'}</tbody></table></div></section>
  <section class="panel"><div class="panel-head"><h2>Purchases</h2><span class="panel-sub">Only unused passes can be voided</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Customer / pass</th><th>Status</th><th>Action</th></tr></thead><tbody>${purchases.map(p => `<tr><td><strong>${esc(label(studio.customer(p.customerId)))}</strong><br><span class="muted">${esc(studio.passType(p.passTypeId).name)} · ${money(p.amountDue)}</span></td><td>${p.voided ? '<span class="tag cancelled">Voided</span>' : '<span class="tag active">Recorded</span>'}</td><td>${p.voided ? '—' : `<button class="text-link danger-text" data-void-purchase="${p.id}">Void</button>`}</td></tr>`).join('') || '<tr><td colspan="3" class="empty">No purchases.</td></tr>'}</tbody></table></div></section></div>
  <div class="section-label">Correction log</div><section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>When</th><th>By</th><th>Action</th><th>Reason</th></tr></thead><tbody>${state.corrections.slice().reverse().map(c => `<tr><td>${new Date(c.at).toLocaleString()}</td><td>${esc(c.by)}</td><td>${esc(c.action)}</td><td>${esc(c.reason)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">No corrections yet.</td></tr>'}</tbody></table></div></section>`;
}

// ---------- UC-07.1–7.3 Reports: two per actor ----------
function bar(pct) { return `<div class="util"><div style="width:${Math.min(100, pct)}%"></div></div><span class="muted">${pct}%</span>`; }
function attendanceTable(rows, showInstructor = true) {
  return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Class</th><th>Date</th>${showInstructor ? '<th>Instructor</th>' : ''}<th>Check-ins</th><th>Utilization</th><th>Overrides</th></tr></thead><tbody>${rows.map(r => `<tr><td><strong>${esc(r.session.name)}</strong><br>${tag(r.session.category)}</td><td>${fmtDate(r.session.date)} · ${esc(r.session.time)}</td>${showInstructor ? `<td>${esc(studio.instructor(r.session.instructorId).name)}</td>` : ''}<td>${r.count} / ${r.session.capacity}${r.free ? ` <span class="muted">(${r.free} free)</span>` : ''}</td><td class="util-cell">${bar(r.utilization)}</td><td>${r.overrides || '—'}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">No classes.</td></tr>'}</tbody></table></div>`;
}
function renderReports() {
  const tabs = {
    manager: [['Sales report', 'UC-07.1'], ['Attendance & utilization', 'UC-07.2']],
    staff: [['Today’s check-ins', 'UC-07.2'], ['Payments & expiring passes', 'UC-07.1']],
    instructor: [['My class attendance', 'UC-07.2'], ['My pay summary', 'UC-07.3']],
    customer: [['My passes & purchases', 'UC-03'], ['My attendance', 'UC-03']]
  }[ui.role];
  const k = Math.min(ui.reportTab, 1);
  let body = '';
  if (ui.role === 'manager' && k === 0) {
    const from = ui.salesRange === 'all' ? '0000-01-01' : addDays(todayIso, -Number(ui.salesRange));
    const r = studio.salesReport(from, todayIso);
    const tot = r.byType.reduce((a, x) => ({ c: a.c + x.count, g: a.g + x.gross, d: a.d + x.discounts, n: a.n + x.net }), { c: 0, g: 0, d: 0, n: 0 });
    body = `<div class="toolbar"><label class="form-field"><span class="small-note">Period</span><select class="field" id="sales-range"><option value="7" ${ui.salesRange == 7 ? 'selected' : ''}>Last 7 days</option><option value="30" ${ui.salesRange == 30 ? 'selected' : ''}>Last 30 days</option><option value="all" ${ui.salesRange === 'all' ? 'selected' : ''}>All time</option></select></label></div>
    <div class="grid stats-grid"><div class="stat-card"><div class="label">Passes sold</div><div class="value">${tot.c}</div></div><div class="stat-card"><div class="label">Gross sales</div><div class="value">${money(tot.g)}</div></div><div class="stat-card"><div class="label">Senior discounts</div><div class="value">${money(tot.d)}</div></div><div class="stat-card"><div class="label">Net sales</div><div class="value accent">${money(tot.n)}</div></div></div>
    <section class="panel"><div class="panel-head"><h2>Sales by pass type</h2><span class="panel-sub">${r.pending.length} payment(s) pending</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Pass</th><th>Sold</th><th>Gross</th><th>Discounts</th><th>Net</th></tr></thead><tbody>${r.byType.map(x => `<tr><td><strong>${esc(x.type.name)}</strong></td><td>${x.count}</td><td>${money(x.gross)}</td><td>${money(x.discounts)}</td><td>${money(x.net)}</td></tr>`).join('')}</tbody></table></div></section>`;
  } else if (ui.role === 'manager') {
    body = `<section class="panel"><div class="panel-head"><h2>Attendance by class</h2><span class="panel-sub">Utilization = check-ins ÷ class limit</span></div>${attendanceTable(studio.attendanceReport())}</section>`;
  } else if (ui.role === 'staff' && k === 0) {
    const rows = studio.attendanceReport(x => x.date === todayIso);
    body = `<section class="panel"><div class="panel-head"><h2>Classes today</h2><span class="panel-sub">${fmtDate(todayIso)}</span></div>${attendanceTable(rows)}</section>`;
  } else if (ui.role === 'staff') {
    const pending = state.purchases.filter(p => !p.voided && p.paymentStatus === 'pending');
    const expiring = state.passes.filter(p => studio.passStatus(p).code === 'active' && p.expiryDate <= addDays(todayIso, 14) && !p.customerId.startsWith('b'));
    body = `<div class="grid two-col"><section class="panel"><div class="panel-head"><h2>Payments to confirm</h2></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Customer</th><th>Pass</th><th>Amount</th><th></th></tr></thead><tbody>${pending.map(p => `<tr><td>${esc(label(studio.customer(p.customerId)))}</td><td>${esc(studio.passType(p.passTypeId).name)}</td><td>${money(p.amountDue)}</td><td><button class="text-link" data-confirm-pay="${p.id}">Confirm</button></td></tr>`).join('') || '<tr><td colspan="4" class="empty">Nothing pending.</td></tr>'}</tbody></table></div></section>
    <section class="panel"><div class="panel-head"><h2>Passes expiring in 14 days</h2></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Customer</th><th>Pass</th><th>Expires</th><th>Left</th></tr></thead><tbody>${expiring.map(p => `<tr><td>${esc(label(studio.customer(p.customerId)))}</td><td>${esc(studio.passType(p.passTypeId).name)}</td><td>${fmtDate(p.expiryDate)}</td><td>${p.remainingUses ?? 'Unlimited'}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">None.</td></tr>'}</tbody></table></div></section></div>`;
  } else if (ui.role === 'instructor' && k === 0) {
    body = `<section class="panel"><div class="panel-head"><h2>My classes</h2><span class="panel-sub">Maya Chen</span></div>${attendanceTable(studio.attendanceReport(x => x.instructorId === ME.instructor), false)}</section>`;
  } else if (ui.role === 'instructor') {
    const p = studio.payReport(ME.instructor);
    body = `<div class="grid stats-grid" style="grid-template-columns:repeat(3,1fr)"><div class="stat-card"><div class="label">Classes taught (submitted)</div><div class="value">${p.taught.length}</div></div><div class="stat-card"><div class="label">Rate per class</div><div class="value">${money(p.instructor.payPerClass)}</div></div><div class="stat-card"><div class="label">Earned this period</div><div class="value accent">${money(p.total)}</div></div></div>
    <section class="panel"><div class="panel-head"><h2>Submitted rosters</h2><span class="panel-sub">You see only your own pay</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Class</th><th>Date</th><th>Check-ins</th><th>Pay</th></tr></thead><tbody>${p.taught.map(x => `<tr><td>${esc(x.name)}</td><td>${fmtDate(x.date)}</td><td>${studio.rosterOf(x.id).length}</td><td>${money(p.instructor.payPerClass)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">No submitted rosters yet.</td></tr>'}</tbody></table></div></section>`;
  } else if (k === 0) {
    const mine = state.purchases.filter(p => p.customerId === ME.customer && !p.voided);
    body = `<section class="panel"><div class="panel-head"><h2>My passes</h2></div>${passesTable(ME.customer)}</section><div class="section-label">Purchases</div><section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Pass</th><th>Paid</th></tr></thead><tbody>${mine.map(p => `<tr><td>${fmtDate(p.recordedAt)}</td><td>${esc(studio.passType(p.passTypeId).name)}</td><td>${money(p.amountDue)}</td></tr>`).join('') || '<tr><td colspan="3" class="empty">No purchases.</td></tr>'}</tbody></table></div></section>`;
  } else {
    const visits = state.attendance.filter(a => !a.voided && a.customerId === ME.customer);
    body = `<section class="panel"><div class="panel-head"><h2>Classes attended</h2><span class="panel-sub">${visits.length} visit(s)</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Class</th><th>Date</th><th>Instructor</th><th>Covered by</th></tr></thead><tbody>${visits.map(a => { const x = studio.session(a.sessionId); return `<tr><td>${esc(x.name)}</td><td>${fmtDate(x.date)}</td><td>${esc(studio.instructor(x.instructorId).name)}</td><td>${a.passId ? esc(studio.passType(studio.byId('passes', a.passId).passTypeId).name) : 'Free class'}</td></tr>`; }).join('') || '<tr><td colspan="4" class="empty">No visits yet.</td></tr>'}</tbody></table></div></section>`;
  }
  return `${pageHead('Reports', 'Two reports for each role, each built from recorded purchases and check-ins.')}<div class="pill-row">${tabs.map(([t, uc], i) => `<button class="pill-button ${k === i ? 'active' : ''}" data-report-tab="${i}">${t} <span class="muted">${uc}</span></button>`).join('')}</div>${body}`;
}

// ---------- Modals ----------
function modal(title, description, body, onSubmit, submitLabel = 'Save') {
  modalRoot.innerHTML = `<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h2 id="modal-title">${title}</h2><p>${description}</p><form id="modal-form"><div class="modal-error"></div>${body}<div class="modal-actions"><button type="button" class="button" data-action="close-modal">Cancel</button><button type="submit" class="button primary">${submitLabel}</button></div></form></div></div>`;
  modalRoot._submit = onSubmit;
  modalRoot.querySelector('input,select,textarea')?.focus();
}
function modalError(lines) { modalRoot.querySelector('.modal-error').innerHTML = `<div class="warning-box">${[].concat(lines).map(esc).join('<br>')}</div>`; }
function closeModal() { modalRoot.innerHTML = ''; modalRoot._submit = null; }
function done(message) { save(); closeModal(); render(); toast(message); }

function openCustomerModal() {
  modal('Register customer', 'Required for every visitor, including free classes. Phone numbers must be unique.', `<div class="form-grid">
    <div class="form-field full"><label>Full name *</label><input class="field" name="name" maxlength="80"></div>
    <div class="form-field"><label>Phone *</label><input class="field" name="phone" maxlength="20"></div>
    <div class="form-field"><label>Email *</label><input class="field" type="email" name="email" maxlength="120"></div>
    <div class="form-field full"><label>Home address *</label><input class="field" name="homeAddress" maxlength="160"></div>
    <div class="form-field"><label>Date of birth *</label><input class="field" type="date" name="dateOfBirth" max="${todayIso}"><span class="form-help">Used for the automatic senior discount.</span></div>
    <div class="form-field"><label>Medical notes (optional)</label><input class="field" name="medicalNotes" maxlength="200"><span class="form-help">For emergencies only.</span></div></div>`, fd => {
    const r = studio.registerCustomer(Object.fromEntries(fd));
    if (!r.ok) return modalError(r.error);
    ui.selectedCustomer = ui.passCustomer = ui.checkCustomer = r.customer.id;
    ui.customerQuery = ui.passQuery = ui.checkQuery = '';
    done(r.warning || `${r.customer.name} registered.`);
  }, 'Register');
}
function openSessionModal(id) {
  const s = id ? studio.session(id) : null;
  const opt = (list, val) => list.map(x => `<option value="${x.id}" ${val === x.id ? 'selected' : ''}>${esc(x.name)}${x.capacity ? ` (holds ${x.capacity})` : ''}</option>`).join('');
  modal(s ? 'Modify class' : 'Create class', 'Saving checks the studio calendar, the room, and the instructor (UC-05.4).', `<div class="form-grid">
    <div class="form-field full"><label>Class name</label><input class="field" name="name" value="${esc(s?.name || '')}" required maxlength="80"></div>
    <div class="form-field"><label>Type</label><select class="field" name="category">${Object.entries(CATEGORY).map(([v, l]) => `<option value="${v}" ${s?.category === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="form-field"><label>Date</label><input class="field" type="date" name="date" min="${todayIso}" value="${s?.date || addDays(todayIso, 7)}" required></div>
    <div class="form-field"><label>Start time</label><input class="field" type="time" name="time" value="${s?.time || '09:00'}" required></div>
    <div class="form-field"><label>Length (minutes)</label><input class="field" type="number" name="durationMinutes" min="15" step="15" value="${s?.durationMinutes || 60}" required></div>
    <div class="form-field"><label>Instructor</label><select class="field" name="instructorId">${opt(state.instructors, s?.instructorId)}</select></div>
    <div class="form-field"><label>Room</label><select class="field" name="roomId">${opt(state.rooms, s?.roomId)}</select></div>
    <div class="form-field"><label>Class limit</label><input class="field" type="number" name="capacity" min="1" value="${s?.capacity || state.settings.defaultCapacity}" required></div>
    <div class="form-field"><label><input type="checkbox" name="freeCheckIn" ${s?.freeCheckIn ? 'checked' : ''}> Free class for registered customers</label></div></div>`, fd => {
    const draft = Object.fromEntries(fd); draft.freeCheckIn = fd.has('freeCheckIn');
    const r = studio.saveSession(draft, id);
    if (!r.ok) return modalError(['Cannot save: please resolve these conflicts.', ...r.conflicts]);
    done(s ? 'Class updated.' : 'Class created and published.');
  }, s ? 'Save changes' : 'Create class');
}
function openCancelModal(id) {
  const s = studio.session(id); const n = studio.rosterOf(id).length;
  modal(`Cancel ${esc(s.name)}`, `${fmtDate(s.date)} at ${esc(s.time)}. ${n ? `${n} check-in(s) will be reversed and their pass uses given back.` : 'No one has checked in yet.'}`, '<div class="form-field"><label>Reason</label><textarea class="field" name="reason" rows="3" required minlength="3"></textarea></div>', fd => {
    const r = studio.cancelSession(id, fd.get('reason').trim(), ROLE_NAME[ui.role]);
    done(`Class cancelled; ${r.restored} pass use(s) restored.`);
  }, 'Cancel class');
}
function openClosureModal() {
  modal('Add closed day', 'Classes cannot be scheduled on a closed day.', `<div class="form-grid"><div class="form-field"><label>Date</label><input class="field" type="date" name="date" min="${todayIso}" required></div><div class="form-field"><label>Reason</label><input class="field" name="reason" required maxlength="80"></div></div>`, fd => {
    state.closures.push({ id: YogaDomain.uid('k'), date: fd.get('date'), reason: fd.get('reason').trim() });
    done('Closed day added to the studio calendar.');
  });
}
function openCorrection(kind, id) {
  const pv = studio.correctionPreview(kind, id);
  const preview = `<div class="section-label" style="margin-top:0">${pv.ok ? 'What will change' : 'Cannot correct'}</div><div class="${pv.ok ? 'preview-box' : 'warning-box'}">${pv.lines.map(esc).join('<br>')}</div>`;
  if (!pv.ok) {
    modal(kind === 'attendance' ? 'Reverse check-in' : 'Void purchase', 'This correction cannot be made yet. Nothing has been changed.', preview, () => closeModal(), 'Close');
    modalRoot.querySelector('[data-action="close-modal"]').remove();
    return;
  }
  modal(kind === 'attendance' ? 'Reverse check-in' : 'Void purchase', 'Review the effect first. The original entry, your name, the time, and your reason are kept in the correction log.', preview + '<div class="form-field" style="margin-top:14px"><label>Reason for correction</label><textarea class="field" name="reason" rows="3" required minlength="3" maxlength="300" placeholder="Describe the mistake"></textarea></div>', fd => {
    if (!pv.ok) return modalError(pv.lines[0]);
    const reason = fd.get('reason').trim();
    const r = kind === 'attendance' ? studio.reverseAttendance(id, reason, ROLE_NAME[ui.role]) : studio.voidPurchase(id, reason, ROLE_NAME[ui.role]);
    if (!r.ok) return modalError(r.error);
    done('Correction recorded.');
  }, 'Confirm correction');
}

function openHistory(passId) {
  const h = studio.passHistory(passId);
  const pay = h.purchase ? `${money(h.purchase.amountDue)}${h.purchase.discount ? ` (senior discount ${money(h.purchase.discount)})` : ''} · ${h.purchase.paymentStatus === 'confirmed' ? 'Paid' : 'Payment pending'}${h.payment && h.payment.reference ? ` · ${esc(h.payment.reference)}` : ''}` : 'Paid on paper card; logged at go-live';
  const visits = h.visits.map(a => `<tr><td>${esc(a.session.name)}</td><td>${fmtDate(a.session.date)} ${esc(a.session.time)}</td><td>${esc(a.recordedBy)}</td><td>${a.voided ? '<span class="tag cancelled">Reversed</span>' : '<span class="tag active">Recorded</span>'}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">Not used yet.</td></tr>';
  const corr = h.corrections.map(c => `<tr><td>${new Date(c.at).toLocaleString()}</td><td>${esc(c.by)}</td><td>${esc(c.action)}</td><td>${esc(c.reason)}</td></tr>`).join('');
  modal(`${esc(h.type.name)} · ${esc(label(h.customer))}`, `${statusTag(h.status)} Valid ${fmtDate(h.pass.effectiveStartDate)} – ${fmtDate(h.pass.expiryDate)} · ${h.pass.remainingUses === null ? 'Unlimited' : `${h.pass.remainingUses} class${h.pass.remainingUses === 1 ? '' : 'es'} left`}`, `
    <div class="summary-line"><span>Purchase</span><strong>${h.purchase ? `${fmtDate(h.purchase.recordedAt)} by ${esc(h.purchase.recordedBy)}` : 'Moved from paper card'}</strong></div>
    <div class="summary-line"><span>Payment</span><strong>${pay}</strong></div>
    <div class="section-label">Check-ins with this pass</div><div class="table-wrap"><table class="data-table"><thead><tr><th>Class</th><th>When</th><th>Recorded by</th><th>Status</th></tr></thead><tbody>${visits}</tbody></table></div>
    ${corr ? `<div class="section-label">Corrections</div><div class="table-wrap"><table class="data-table"><thead><tr><th>When</th><th>By</th><th>Action</th><th>Reason</th></tr></thead><tbody>${corr}</tbody></table></div>` : ''}`, () => closeModal(), 'Close');
  modalRoot.querySelector('[data-action="close-modal"]').remove();
}

// ---------- Actions ----------
function purchase() {
  const r = studio.recordPurchase({ customerId: ui.passCustomer, passTypeId: ui.passType, startIso: ui.passStart, paymentStatus: ui.payStatus, paymentReference: ui.payRef, recordedBy: ROLE_NAME[ui.role], confirmedNotDuplicate: ui.notDup });
  if (!r.ok) return toast(r.error);
  ui.payRef = ''; ui.notDup = false;
  save(); render();
  toast(`${r.quote.type.name} recorded for ${r.quote.customer.name}: ${money(r.quote.amountDue)}${r.quote.discount ? ' (senior discount applied)' : ''}.`);
}
function paperPass() {
  const r = studio.logPaperPass({ customerId: ui.passCustomer, passTypeId: ui.paperType, startIso: ui.paperStart, remainingUses: ui.paperUses });
  save(); render(); toast(`Paper pass logged: ${studio.passType(r.pass.passTypeId).name}.`);
}
function checkin() {
  const r = studio.recordCheckIn({ sessionId: ui.checkSession, customerId: ui.checkCustomer, minutesBeforeStart: Number(ui.arrival), overrides: ui.overrides, overrideReason: ui.overrideReason, recordedBy: ROLE_NAME[ui.role], role: ui.role });
  if (!r.ok) return toast(r.error);
  ui.overrides = []; ui.overrideReason = '';
  save(); render();
  toast(`${r.ev.customer.name} checked in${r.record.overrides.length ? ' with an override' : ''}.`);
}

document.addEventListener('click', e => {
  const t = e.target;
  const page = t.closest('[data-page]');
  if (page) { ui.page = page.dataset.page; ui.reportTab = 0; document.getElementById('sidebar').classList.remove('open'); return render(); }
  const plan = t.closest('[data-plan]'); if (plan) { ui.passType = plan.dataset.plan; return render(); }
  const mode = t.closest('[data-pass-mode]'); if (mode) { ui.passMode = mode.dataset.passMode; return render(); }
  const tab = t.closest('[data-report-tab]'); if (tab) { ui.reportTab = Number(tab.dataset.reportTab); return render(); }
  const cu = t.closest('[data-customer]'); if (cu) { ui.selectedCustomer = cu.dataset.customer; return render(); }
  const ed = t.closest('[data-edit-session]'); if (ed) return openSessionModal(ed.dataset.editSession);
  const cs = t.closest('[data-cancel-session]'); if (cs) return openCancelModal(cs.dataset.cancelSession);
  const rv = t.closest('[data-reverse-attendance]'); if (rv) return openCorrection('attendance', rv.dataset.reverseAttendance);
  const vp = t.closest('[data-void-purchase]'); if (vp) return openCorrection('purchase', vp.dataset.voidPurchase);
  const ph = t.closest('[data-pass-history]'); if (ph) return openHistory(ph.dataset.passHistory);
  const cp = t.closest('[data-confirm-pay]'); if (cp) { studio.confirmPayment(cp.dataset.confirmPay, 'Confirmed by staff'); save(); render(); return toast('Payment confirmed.'); }
  const action = t.closest('[data-action]')?.dataset.action;
  if (!action) return;
  switch (action) {
    case 'go-checkin': ui.page = 'checkin'; render(); break;
    case 'go-schedule': ui.page = 'schedule'; render(); break;
    case 'purchase': purchase(); break;
    case 'paper-pass': paperPass(); break;
    case 'confirm-checkin': checkin(); break;
    case 'sell-from-checkin': ui.page = 'passes'; ui.passMode = 'buy'; ui.passCustomer = ui.checkCustomer; ui.passQuery = ''; ui.passType = studio.state.passTypes.find(p => p.category === studio.session(ui.checkSession).category).id; render(); break;
    case 'submit-roster': { const r = studio.submitRoster(ui.checkSession, ME.instructor); if (!r.ok) return toast(r.error); save(); render(); toast('Roster submitted and locked.'); break; }
    case 'reopen-roster': { const r = studio.reopenRoster(ui.checkSession, ME.instructor); if (!r.ok) return toast(r.error); save(); render(); toast('Roster reopened.'); break; }
    case 'new-session': openSessionModal(); break;
    case 'new-closure': openClosureModal(); break;
    case 'new-customer': openCustomerModal(); break;
    case 'save-settings': {
      app.querySelectorAll('[data-setting]').forEach(inp => { const pt = studio.passType(inp.dataset.type); pt[inp.dataset.setting] = Math.max(Number(inp.min || 0), Number(inp.value)); });
      app.querySelectorAll('[data-rule]').forEach(inp => { state.settings[inp.dataset.rule] = Number(inp.value); });
      save(); render(); toast('Settings saved. New purchases use these values.'); break;
    }
    case 'close-modal': closeModal(); break;
  }
});
document.addEventListener('change', e => {
  const t = e.target; const v = t.value;
  if (t.id === 'role-select') { ui.role = v; ui.reportTab = 0; ui.overrides = []; render(); }
  else if (t.id === 'schedule-type') { ui.scheduleType = v; render(); }
  else if (t.id === 'pass-customer') { ui.passCustomer = v; render(); }
  else if (t.id === 'pass-start') { ui.passStart = v < todayIso ? todayIso : v; render(); }
  else if (t.id === 'pay-status') { ui.payStatus = v; render(); }
  else if (t.id === 'pay-ref') { ui.payRef = v; }
  else if (t.id === 'not-dup') { ui.notDup = t.checked; render(); }
  else if (t.id === 'paper-type') { ui.paperType = v; }
  else if (t.id === 'paper-start') { ui.paperStart = v; }
  else if (t.id === 'paper-uses') { ui.paperUses = v; }
  else if (t.id === 'check-session') { ui.checkSession = v; ui.overrides = []; render(); }
  else if (t.id === 'check-customer') { ui.checkCustomer = v; ui.overrides = []; render(); }
  else if (t.id === 'arrival') { ui.arrival = Number(v); ui.overrides = []; render(); }
  else if (t.id === 'sales-range') { ui.salesRange = v === 'all' ? 'all' : Number(v); render(); }
  else if (t.dataset && t.dataset.override) { ui.overrides = t.checked ? [...ui.overrides, t.dataset.override] : ui.overrides.filter(x => x !== t.dataset.override); render(); }
});
document.addEventListener('input', e => {
  const t = e.target;
  const keep = () => { const pos = t.selectionStart; const id = t.id; render(); const n = document.getElementById(id); if (n) { n.focus(); n.setSelectionRange(pos, pos); } };
  if (t.id === 'schedule-search') { ui.scheduleQuery = t.value; keep(); }
  else if (t.id === 'pass-customer-query') { ui.passQuery = t.value; keep(); }
  else if (t.id === 'check-customer-query') { ui.checkQuery = t.value; ui.overrides = []; keep(); }
  else if (t.id === 'customer-query') { ui.customerQuery = t.value; keep(); }
  else if (t.id === 'override-reason') {
    ui.overrideReason = t.value;
    const btn = app.querySelector('[data-action="confirm-checkin"]');
    const ev = studio.evaluateCheckIn({ sessionId: ui.checkSession, customerId: ui.checkCustomer, minutesBeforeStart: Number(ui.arrival) });
    if (btn) btn.disabled = !(!ev.blockers.length && ev.overridable.every(o => ui.overrides.includes(o.code)) && ui.overrideReason.trim().length >= 3);
  }
});
document.addEventListener('submit', e => { if (e.target.id === 'modal-form') { e.preventDefault(); modalRoot._submit?.(new FormData(e.target)); } });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-plan]')) { e.preventDefault(); ui.passType = e.target.dataset.plan; render(); }
});
document.getElementById('menu-button').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
document.getElementById('today-label').textContent = todayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
document.getElementById('reset-demo').addEventListener('click', () => {
  if (!window.confirm('Reset all local demo changes?')) return;
  state = { ...seed(todayIso), seededOn: todayIso }; studio = Studio(state, todayIso); save(); ui = freshUi(); render(); toast('Sample data reset.');
});
render();

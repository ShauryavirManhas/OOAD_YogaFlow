/*
 * YogaFlow prototype, Sprint 2: domain layer.
 *
 * This file follows Design Class Diagram 1.0 (Section 6) and Interaction
 * Diagram 1.0 (Section 7) of the Sprint 2 report. The UI in app.js only calls the
 * controllers at the bottom of this file (GRASP Controller); business rules
 * live with the objects that hold the data (GRASP Information Expert), and
 * rules the studio may change sit behind small policy objects
 * (Protected Variation / Strategy).
 *
 * Business rule codes (BR-xx) in comments map to the studio’s Sprint 1 review answers (see README).
 */
(function (global) {
  'use strict';

  // ---------- Date helpers ----------
  const DAY = 24 * 60 * 60 * 1000;
  function iso(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function addDays(isoDate, n) {
    const d = new Date(`${isoDate}T12:00:00`);
    d.setDate(d.getDate() + n);
    return iso(d);
  }
  function ageOn(dob, onIso) {
    if (!dob) return null;
    const b = new Date(`${dob}T12:00:00`);
    const t = new Date(`${onIso}T12:00:00`);
    let age = t.getFullYear() - b.getFullYear();
    const m = t.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age -= 1;
    return age;
  }
  function minutes(time) {
    const [h, m] = String(time).split(':').map(Number);
    return h * 60 + m;
  }
  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  // ---------- Reference data (description classes) ----------
  const CATEGORY = { regular: 'Regular class', workshop: 'Workshop', special: 'Special program' };

  // ---------- Policies (Protected Variation) ----------
  // BR-03: when several passes are eligible, use the one that expires first.
  const EarliestExpiryPolicy = {
    name: 'Earliest expiry first',
    select(passes) {
      return passes.slice().sort((a, b) =>
        a.expiryDate.localeCompare(b.expiryDate) ||
        (a.remainingUses ?? Infinity) - (b.remainingUses ?? Infinity))[0] || null;
    }
  };

  // BR-04: senior discount applied automatically from the date of birth on file.
  function seniorDiscountPolicy(settings) {
    return {
      name: 'Senior discount',
      appliesTo(customer, onIso) {
        const age = ageOn(customer && customer.dateOfBirth, onIso);
        return age !== null && age >= settings.seniorAge;
      },
      rate() { return settings.seniorRate / 100; }
    };
  }

  // BR-15: Release 1 records payments taken in the studio's existing system.
  // A third-party platform can replace this adapter in Release 2 without
  // changing the purchase controller (Dependency Inversion).
  const ManualPaymentRecorder = {
    name: 'Recorded by staff (Release 1)',
    record(purchase, { status, reference }) {
      return { id: uid('pay'), purchaseId: purchase.id, amount: purchase.amountDue, method: 'Studio terminal / legacy system', status, reference: reference || '', recordedAt: new Date().toISOString() };
    }
  };

  // ---------- Seed data ----------
  const FIRST = ['Avery', 'Blake', 'Casey', 'Devon', 'Elliot', 'Frankie', 'Harper', 'Indie', 'Jamie', 'Kai', 'Logan', 'Marley', 'Noel', 'Oakley', 'Parker', 'Quinn', 'Rowan', 'Sage', 'Tatum', 'Wren'];
  const LAST = ['Adams', 'Brooks', 'Carter', 'Diaz', 'Evans', 'Foster', 'Gray', 'Hayes', 'Irwin', 'James', 'Kim', 'Lopez', 'Mills', 'Nash', 'Owens', 'Price', 'Reyes', 'Shaw', 'Tran', 'Vega'];

  function seed(todayIso) {
    const t = todayIso;
    const customer = (id, name, phone, dob, extra = {}) => ({
      id, name, phone, email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`,
      homeAddress: `${100 + id.length * 7} Forbes Ave, Pittsburgh, PA`, dateOfBirth: dob,
      medicalNotes: '', registeredOn: addDays(t, -200), ...extra
    });
    const state = {
      settings: { checkInWindowMinutes: 30, seniorAge: 62, seniorRate: 10, defaultCapacity: 20 },
      passTypes: [
        { id: 'pt4', name: '4-Class Pass', category: 'regular', uses: 4, validityDays: 60, price: 72 },
        { id: 'pt10', name: '10-Class Pass', category: 'regular', uses: 10, validityDays: 120, price: 160 },
        { id: 'ptU', name: '3-Month Unlimited', category: 'regular', uses: null, validityDays: 90, price: 300 },
        { id: 'ptD', name: 'Drop-in', category: 'regular', uses: 1, validityDays: 1, price: 20 },
        { id: 'ptW', name: 'Workshop Pass', category: 'workshop', uses: 1, validityDays: 60, price: 35 },
        { id: 'ptP', name: 'Prenatal Program Pass', category: 'special', uses: 6, validityDays: 60, price: 120 }
      ],
      instructors: [
        { id: 'i1', name: 'Maya Chen', payPerClass: 45 },
        { id: 'i2', name: 'Nina Patel', payPerClass: 45 },
        { id: 'i3', name: 'Daniel Ortiz', payPerClass: 60 }
      ],
      rooms: [
        { id: 'r1', name: 'Main Studio', capacity: 20 },
        { id: 'r2', name: 'Garden Room', capacity: 12 }
      ],
      closures: [{ id: 'k1', date: addDays(t, 4), reason: 'Studio maintenance' }],
      customers: [
        customer('c1', 'Alex Morgan', '412-555-0101', '1990-04-12'),
        customer('c2', 'Jordan Lee', '412-555-0102', '1958-07-03', { medicalNotes: 'Knee replacement (2023); avoid deep kneeling.' }),
        customer('c3', 'Jordan Lee', '412-555-0177', '1995-02-20'),
        customer('c4', 'Taylor Reed', '412-555-0104', '1988-11-30'),
        customer('c5', 'Sam Patel', '412-555-0105', '1979-01-15'),
        customer('c6', 'Priya Shah', '412-555-0106', '1993-06-08')
      ],
      sessions: [
        { id: 's0', date: addDays(t, -1), time: '09:00', durationMinutes: 60, name: 'Gentle Yoga', category: 'regular', instructorId: 'i1', roomId: 'r1', capacity: 20, freeCheckIn: false, status: 'scheduled', roster: { status: 'submitted', submittedAt: `${addDays(t, -1)}T10:05:00` } },
        { id: 's1', date: t, time: '18:00', durationMinutes: 60, name: 'Gentle Yoga', category: 'regular', instructorId: 'i1', roomId: 'r1', capacity: 20, freeCheckIn: false, status: 'scheduled', roster: { status: 'open' } },
        { id: 's2', date: addDays(t, 1), time: '11:00', durationMinutes: 60, name: 'Chair Yoga', category: 'regular', instructorId: 'i2', roomId: 'r1', capacity: 20, freeCheckIn: false, status: 'scheduled', roster: { status: 'open' } },
        { id: 's3', date: addDays(t, 2), time: '17:30', durationMinutes: 75, name: 'Vinyasa Flow', category: 'regular', instructorId: 'i1', roomId: 'r1', capacity: 20, freeCheckIn: false, status: 'scheduled', roster: { status: 'open' } },
        { id: 's4', date: addDays(t, 3), time: '08:00', durationMinutes: 45, name: 'Community Free Class', category: 'regular', instructorId: 'i3', roomId: 'r2', capacity: 12, freeCheckIn: true, status: 'scheduled', roster: { status: 'open' } },
        { id: 's5', date: addDays(t, 5), time: '10:00', durationMinutes: 120, name: 'Yoga & Breathwork', category: 'workshop', instructorId: 'i3', roomId: 'r1', capacity: 20, freeCheckIn: false, status: 'scheduled', roster: { status: 'open' } },
        { id: 's6', date: addDays(t, 6), time: '14:00', durationMinutes: 60, name: 'Prenatal Yoga', category: 'special', instructorId: 'i2', roomId: 'r2', capacity: 12, freeCheckIn: false, status: 'scheduled', roster: { status: 'open' } },
        { id: 's7', date: addDays(t, 2), time: '09:00', durationMinutes: 60, name: 'Morning Flow', category: 'regular', instructorId: 'i2', roomId: 'r1', capacity: 20, freeCheckIn: false, status: 'cancelled', roster: { status: 'open' } }
      ],
      passes: [], purchases: [], payments: [], attendance: [], corrections: []
    };

    const addPass = (id, customerId, passTypeId, start, remaining, opts = {}) => {
      const type = state.passTypes.find(p => p.id === passTypeId);
      const pass = { id, customerId, passTypeId, effectiveStartDate: start, expiryDate: addDays(start, type.validityDays - 1), remainingUses: remaining, source: opts.source || 'purchase', purchaseId: null, voided: false };
      state.passes.push(pass);
      if (pass.source === 'purchase') {
        const c = state.customers.find(x => x.id === customerId);
        const senior = seniorDiscountPolicy(state.settings).appliesTo(c, start);
        const discount = senior ? Math.round(type.price * state.settings.seniorRate) / 100 : 0;
        const purchase = { id: `${id}-buy`, customerId, passTypeId, listPrice: type.price, discount, discountReason: senior ? 'Senior discount (automatic)' : '', amountDue: type.price - discount, paymentStatus: opts.payment || 'confirmed', recordedBy: 'Studio Staff', recordedAt: `${start}T09:30:00`, voided: false };
        state.purchases.push(purchase);
        state.payments.push({ id: `${id}-pay`, purchaseId: purchase.id, amount: purchase.amountDue, method: 'Studio terminal / legacy system', status: purchase.paymentStatus, reference: purchase.paymentStatus === 'confirmed' ? `POS-${1000 + state.payments.length}` : '', recordedAt: purchase.recordedAt });
        pass.purchaseId = purchase.id;
      }
      return pass;
    };

    addPass('p1', 'c1', 'pt4', addDays(t, -20), 2);
    addPass('p2', 'c1', 'pt10', addDays(t, -2), 10);
    addPass('p3', 'c2', 'pt10', addDays(t, -30), 7, { source: 'paper-transfer' });
    addPass('p4', 'c4', 'ptU', addDays(t, -10), null);
    addPass('p5', 'c5', 'pt4', addDays(t, -40), 0);
    addPass('p6', 'c6', 'pt10', t, 10, { payment: 'pending' });
    addPass('p7', 'c4', 'ptW', addDays(t, -3), 1);

    // Twenty sample registrations fill Chair Yoga so the "full" rule can be shown.
    for (let i = 0; i < 20; i += 1) {
      const id = `b${i + 1}`;
      state.customers.push(customer(id, `${FIRST[i]} ${LAST[i]}`, `412-555-${String(2000 + i)}`, `${1970 + i}-0${(i % 9) + 1}-1${i % 9}`, { sample: 'bulk' }));
      const pass = addPass(`bp${i + 1}`, id, 'ptU', addDays(t, -5), null);
      state.attendance.push({ id: `ba${i + 1}`, sessionId: 's2', customerId: id, passId: pass.id, coverage: 'pass', overrides: [], recordedBy: 'Nina Patel (Instructor)', recordedAt: `${addDays(t, 1)}T10:40:00`, voided: false });
    }

    // Yesterday's submitted roster (used by the attendance and pay reports).
    [['c1', 'p1'], ['c2', 'p3'], ['c4', 'p4']].forEach(([cid, pid], k) => state.attendance.push({ id: `a0${k}`, sessionId: 's0', customerId: cid, passId: pid, coverage: 'pass', overrides: [], recordedBy: 'Maya Chen (Instructor)', recordedAt: `${addDays(t, -1)}T08:4${k}:00`, voided: false }));
    return state;
  }

  // ---------- Domain service: the studio model ----------
  function Studio(state, todayIso) {
    const s = state;
    const today = todayIso;
    const discount = seniorDiscountPolicy(s.settings);
    const passPolicy = EarliestExpiryPolicy;
    const paymentRecorder = ManualPaymentRecorder;

    const byId = (list, id) => s[list].find(x => x.id === id);
    const customer = id => byId('customers', id);
    const session = id => byId('sessions', id);
    const passType = id => byId('passTypes', id);
    const instructor = id => byId('instructors', id);
    const room = id => byId('rooms', id);
    const activeAttendance = () => s.attendance.filter(a => !a.voided);
    const rosterOf = sessionId => activeAttendance().filter(a => a.sessionId === sessionId);
    const purchaseOf = pass => pass && pass.purchaseId ? byId('purchases', pass.purchaseId) : null;

    // Pass (Information Expert for its own validity).
    function passStatus(pass, onIso = today) {
      if (pass.voided) return { code: 'voided', label: 'Voided' };
      if (onIso < pass.effectiveStartDate) return { code: 'future', label: `Starts ${pass.effectiveStartDate}` };
      if (onIso > pass.expiryDate) return { code: 'expired', label: 'Expired' };
      if (pass.remainingUses === 0) return { code: 'depleted', label: 'Depleted' };
      return { code: 'active', label: 'Active' };
    }

    // BR-02: a pass covers only its own category on dates inside its validity period.
    function eligiblePasses(customerId, sess) {
      return s.passes.filter(p => p.customerId === customerId &&
        passType(p.passTypeId).category === sess.category &&
        passStatus(p, sess.date).code === 'active');
    }

    // UC-09 Find Customer (BR-09): name lookup; duplicates are told apart by phone.
    function findCustomers(query) {
      const q = String(query || '').trim().toLowerCase();
      const list = s.customers.filter(c => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q));
      return list.map(c => ({ ...c, duplicateName: s.customers.filter(x => x.name.toLowerCase() === c.name.toLowerCase()).length > 1 }));
    }

    // UC-08 Register Customer (BR-10, BR-12).
    function registerCustomer(data) {
      const required = ['name', 'phone', 'email', 'homeAddress', 'dateOfBirth'];
      const missing = required.filter(k => !String(data[k] || '').trim());
      if (missing.length) return { ok: false, error: `Required: ${missing.join(', ')}.` };
      const samePhone = s.customers.find(c => c.phone.replace(/\D/g, '') === String(data.phone).replace(/\D/g, ''));
      if (samePhone) return { ok: false, error: `A customer with phone ${samePhone.phone} already exists (${samePhone.name}).`, existing: samePhone };
      const sameName = s.customers.filter(c => c.name.toLowerCase() === data.name.trim().toLowerCase());
      const c = { id: uid('c'), name: data.name.trim(), phone: data.phone.trim(), email: data.email.trim(), homeAddress: data.homeAddress.trim(), dateOfBirth: data.dateOfBirth, medicalNotes: (data.medicalNotes || '').trim(), registeredOn: today };
      s.customers.push(c);
      return { ok: true, customer: c, warning: sameName.length ? `Another customer is named ${c.name}; use the phone number to tell them apart.` : '' };
    }

    // UC-02 Record Pass Purchase: preview then confirm.
    function quotePurchase(customerId, passTypeId, startIso) {
      const c = customer(customerId); const type = passType(passTypeId);
      const senior = discount.appliesTo(c, startIso || today);
      const amount = senior ? Math.round(type.price * discount.rate() * 100) / 100 : 0;
      return { customer: c, type, start: startIso || today, expiry: addDays(startIso || today, type.validityDays - 1), listPrice: type.price, discount: amount, discountReason: senior ? `Senior discount ${s.settings.seniorRate}% (age ${ageOn(c.dateOfBirth, startIso || today)}, automatic)` : 'No discount', amountDue: Math.round((type.price - amount) * 100) / 100 };
    }

    // UC-02 A: a purchase of the same pass type for the same customer today may be a duplicate.
    function possibleDuplicate(customerId, passTypeId) {
      return s.purchases.find(p => !p.voided && p.customerId === customerId && p.passTypeId === passTypeId && iso(p.recordedAt) === today) || null;
    }

    function recordPurchase({ customerId, passTypeId, startIso, paymentStatus, paymentReference, recordedBy, confirmedNotDuplicate = false }) {
      const q = quotePurchase(customerId, passTypeId, startIso);
      if (q.start < today) return { ok: false, error: 'The effective start date cannot be in the past.' };
      if (possibleDuplicate(customerId, passTypeId) && !confirmedNotDuplicate) return { ok: false, error: `${q.customer.name} already bought a ${q.type.name} today. Check it is not a duplicate, then tick the confirmation.` };
      const purchase = { id: uid('buy'), customerId, passTypeId, listPrice: q.listPrice, discount: q.discount, discountReason: q.discount ? q.discountReason : '', amountDue: q.amountDue, paymentStatus, recordedBy, recordedAt: new Date().toISOString(), voided: false };
      const pass = { id: uid('p'), customerId, passTypeId, effectiveStartDate: q.start, expiryDate: q.expiry, remainingUses: q.type.uses, source: 'purchase', purchaseId: purchase.id, voided: false };
      s.purchases.push(purchase); s.passes.push(pass);
      s.payments.push(paymentRecorder.record(purchase, { status: paymentStatus, reference: paymentReference }));
      return { ok: true, purchase, pass, quote: q };
    }

    // Transition strategy (BR-16): log an active paper pass when the customer walks in.
    function logPaperPass({ customerId, passTypeId, startIso, remainingUses }) {
      const type = passType(passTypeId);
      const pass = { id: uid('p'), customerId, passTypeId, effectiveStartDate: startIso, expiryDate: addDays(startIso, type.validityDays - 1), remainingUses: type.uses === null ? null : Number(remainingUses), source: 'paper-transfer', purchaseId: null, voided: false };
      s.passes.push(pass);
      return { ok: true, pass };
    }

    function confirmPayment(purchaseId, reference) {
      const p = byId('purchases', purchaseId); if (!p) return;
      p.paymentStatus = 'confirmed';
      const pay = s.payments.find(x => x.purchaseId === purchaseId);
      if (pay) { pay.status = 'confirmed'; pay.reference = reference || pay.reference || 'Confirmed'; }
    }

    // UC-04 Record Class Attendance: evaluate every rule before anything is saved.
    // overrides: the rule codes a staff member has chosen to override.
    function evaluateCheckIn({ sessionId, customerId, minutesBeforeStart = 20 }) {
      const sess = session(sessionId); const c = customer(customerId);
      const result = { session: sess, customer: c, blockers: [], overridable: [], pass: null, otherPasses: [], coverage: null };
      if (!sess || !c) { result.blockers.push({ code: 'missing', text: 'Choose a class and a customer.' }); return result; }
      if (sess.status === 'cancelled') result.blockers.push({ code: 'cancelled', text: 'This class is cancelled.' });
      if (sess.roster.status === 'submitted') result.blockers.push({ code: 'locked', text: 'The roster was submitted and is locked. Only the instructor can reopen it.' });
      if (rosterOf(sessionId).some(a => a.customerId === customerId)) result.blockers.push({ code: 'duplicate', text: `${c.name} is already on this roster. No second pass use is recorded.` });
      if (minutesBeforeStart > s.settings.checkInWindowMinutes) result.overridable.push({ code: 'early', text: `Check-in opens ${s.settings.checkInWindowMinutes} minutes before class. Staff may check in an early arrival.` });
      if (rosterOf(sessionId).length >= sess.capacity) result.overridable.push({ code: 'capacity', text: `The class is full (${sess.capacity} of ${sess.capacity}). Staff may override the limit.` });

      if (sess.freeCheckIn) {
        result.coverage = 'free';
      } else {
        const eligible = eligiblePasses(customerId, sess);
        result.pass = passPolicy.select(eligible);
        result.otherPasses = eligible.filter(p => p !== result.pass);
        result.coverage = result.pass ? 'pass' : null;
        if (!result.pass) {
          const wrongCategory = s.passes.some(p => p.customerId === customerId && passStatus(p, sess.date).code === 'active' && passType(p.passTypeId).category !== sess.category);
          result.blockers.push({ code: 'nopass', text: wrongCategory ? `${c.name}'s active passes do not cover a ${CATEGORY[sess.category].toLowerCase()}. A matching pass must be bought before class.` : `${c.name} has no eligible pass. A pass must be bought before attending.` });
        } else {
          const purchase = purchaseOf(result.pass);
          if (purchase && purchase.paymentStatus !== 'confirmed') result.overridable.push({ code: 'payment', text: 'Payment for this pass is not confirmed. Staff may override if the payment system had a problem.' });
        }
      }
      return result;
    }

    function recordCheckIn({ sessionId, customerId, minutesBeforeStart, overrides = [], overrideReason = '', recordedBy, role }) {
      const ev = evaluateCheckIn({ sessionId, customerId, minutesBeforeStart });
      if (ev.blockers.length) return { ok: false, error: ev.blockers[0].text, ev };
      const canOverride = role === 'staff' || role === 'manager';
      const pending = ev.overridable.filter(o => !overrides.includes(o.code));
      if (pending.length) return { ok: false, error: canOverride ? pending[0].text : `${pending[0].text.split(' Staff may')[0]} Ask front-desk staff for help.`, ev };
      if (ev.overridable.length && !canOverride) return { ok: false, error: 'Only staff can override these rules.', ev };
      if (ev.overridable.length && overrideReason.trim().length < 3) return { ok: false, error: 'Enter a reason for the override.', ev };
      if (ev.pass && ev.pass.remainingUses !== null) ev.pass.remainingUses -= 1;
      const rec = { id: uid('a'), sessionId, customerId, passId: ev.pass ? ev.pass.id : null, coverage: ev.coverage, overrides: ev.overridable.map(o => ({ code: o.code, reason: overrideReason.trim() })), recordedBy, recordedAt: new Date().toISOString(), voided: false };
      s.attendance.push(rec);
      return { ok: true, record: rec, ev };
    }

    // UC-10 Submit Class Roster (BR-08).
    function submitRoster(sessionId, instructorId) {
      const sess = session(sessionId);
      if (sess.instructorId !== instructorId) return { ok: false, error: 'Only the class instructor can submit this roster.' };
      sess.roster = { status: 'submitted', submittedAt: new Date().toISOString() };
      return { ok: true };
    }
    function reopenRoster(sessionId, instructorId) {
      const sess = session(sessionId);
      if (sess.instructorId !== instructorId) return { ok: false, error: 'Only the class instructor can reopen this roster.' };
      sess.roster = { status: 'open', reopenedAt: new Date().toISOString() };
      return { ok: true };
    }

    // UC-05.4 Check Instructor and Room Availability (included by UC-05.1 and UC-05.2).
    function checkAvailability(draft, ignoreId) {
      const conflicts = [];
      const closure = s.closures.find(k => k.date === draft.date);
      if (closure) conflicts.push(`The studio calendar shows ${draft.date} as closed (${closure.reason}).`);
      const start = minutes(draft.time); const end = start + Number(draft.durationMinutes);
      const overlapping = s.sessions.filter(x => x.id !== ignoreId && x.status !== 'cancelled' && x.date === draft.date && minutes(x.time) < end && start < minutes(x.time) + x.durationMinutes);
      overlapping.filter(x => x.roomId === draft.roomId).forEach(x => conflicts.push(`${room(draft.roomId).name} is booked for ${x.name} at ${x.time}.`));
      overlapping.filter(x => x.instructorId === draft.instructorId).forEach(x => conflicts.push(`${instructor(draft.instructorId).name} is teaching ${x.name} at ${x.time}.`));
      if (Number(draft.capacity) > room(draft.roomId).capacity) conflicts.push(`${room(draft.roomId).name} holds ${room(draft.roomId).capacity} people; capacity ${draft.capacity} is too high.`);
      return conflicts;
    }

    // UC-05.1 Create / UC-05.2 Modify Class Session.
    function saveSession(draft, id) {
      const conflicts = checkAvailability(draft, id);
      if (conflicts.length) return { ok: false, conflicts };
      if (id) {
        const sess = session(id);
        const rosterSize = rosterOf(id).length;
        if (Number(draft.capacity) < rosterSize) return { ok: false, conflicts: [`${rosterSize} customers are already checked in; capacity cannot be lower.`] };
        if (sess.category !== draft.category && rosterSize) return { ok: false, conflicts: ['The class type cannot change after check-ins are recorded.'] };
        Object.assign(sess, draft, { capacity: Number(draft.capacity), durationMinutes: Number(draft.durationMinutes) });
        return { ok: true, session: sess };
      }
      const sess = { id: uid('s'), ...draft, capacity: Number(draft.capacity), durationMinutes: Number(draft.durationMinutes), status: 'scheduled', roster: { status: 'open' } };
      s.sessions.push(sess);
      return { ok: true, session: sess };
    }

    // UC-05.3 Cancel Class Session: pass uses already taken are restored.
    function cancelSession(id, reason, by) {
      const sess = session(id);
      const roster = rosterOf(id);
      roster.forEach(a => {
        const p = byId('passes', a.passId);
        if (p && p.remainingUses !== null) p.remainingUses += 1;
        a.voided = true;
      });
      sess.status = 'cancelled';
      s.corrections.push({ id: uid('corr'), at: new Date().toISOString(), by, action: `Cancelled ${sess.name} (${sess.date} ${sess.time}); ${roster.length} pass use(s) restored`, reason });
      return { ok: true, restored: roster.length };
    }

    // UC-06 Correct Purchase or Attendance Record.
    function reverseAttendance(id, reason, by) {
      const a = byId('attendance', id);
      if (!a || a.voided) return { ok: false, error: 'Record not found.' };
      if (session(a.sessionId).roster.status === 'submitted') return { ok: false, error: 'This roster is locked. Ask the instructor to reopen it first.' };
      const p = byId('passes', a.passId);
      if (p && p.remainingUses !== null) p.remainingUses += 1;
      a.voided = true;
      s.corrections.push({ id: uid('corr'), at: new Date().toISOString(), by, action: `Reversed check-in: ${customer(a.customerId).name}, ${session(a.sessionId).name}`, reason, attendanceId: a.id, passId: a.passId, previous: p && p.remainingUses !== null ? `${p.remainingUses - 1} left` : 'Recorded', next: p && p.remainingUses !== null ? `${p.remainingUses} left` : 'Reversed' });
      return { ok: true };
    }
    function voidPurchase(id, reason, by) {
      const purchase = byId('purchases', id);
      const pass = s.passes.find(p => p.purchaseId === id);
      if (!purchase || purchase.voided) return { ok: false, error: 'Record not found.' };
      if (activeAttendance().some(a => a.passId === pass.id)) return { ok: false, error: 'This pass has been used. Reverse those check-ins first.' };
      purchase.voided = true; pass.voided = true;
      s.corrections.push({ id: uid('corr'), at: new Date().toISOString(), by, action: `Voided ${passType(pass.passTypeId).name} for ${customer(pass.customerId).name}`, reason, purchaseId: id, passId: pass.id, previous: 'Recorded', next: 'Voided' });
      return { ok: true };
    }

    // UC-06 step 4: preview what a correction will change before it is saved.
    function correctionPreview(kind, id) {
      if (kind === 'attendance') {
        const a = byId('attendance', id); if (!a) return { ok: false, lines: ['Record not found.'] };
        if (a.voided) return { ok: false, lines: ['This check-in was already reversed. A second reversal would restore the same pass use twice.'] };
        if (session(a.sessionId).roster.status === 'submitted') return { ok: false, lines: ['This roster is locked. Ask the instructor to reopen it first.'] };
        const p = byId('passes', a.passId);
        const lines = [`Check-in: ${customer(a.customerId).name}, ${session(a.sessionId).name} on ${session(a.sessionId).date}`, 'Attendance: Recorded → Reversed (kept in history)'];
        if (!p) lines.push('Pass: none used (free class); no balance changes');
        else if (p.remainingUses === null) lines.push(`Pass: ${passType(p.passTypeId).name} is unlimited; no balance changes`);
        else lines.push(`Pass balance: ${passType(p.passTypeId).name} ${p.remainingUses} → ${p.remainingUses + 1} classes left`);
        return { ok: true, lines };
      }
      const purchase = byId('purchases', id); if (!purchase) return { ok: false, lines: ['Record not found.'] };
      if (purchase.voided) return { ok: false, lines: ['This purchase was already voided.'] };
      const pass = s.passes.find(p => p.purchaseId === id);
      const used = activeAttendance().filter(a => a.passId === pass.id).length;
      if (used) return { ok: false, lines: [`This pass has ${used} check-in(s). Reverse them before voiding the purchase.`] };
      return { ok: true, lines: [`Purchase: ${passType(pass.passTypeId).name} for ${customer(pass.customerId).name}, ${purchase.amountDue.toFixed(2)} USD`, 'Purchase: Recorded → Voided (kept in history)', 'Pass: Active → Voided; it can no longer be used to check in'] };
    }

    // UC-03 step 4: the purchase and attendance history of one pass.
    function passHistory(passId) {
      const pass = byId('passes', passId);
      const purchase = purchaseOf(pass);
      return {
        pass, type: passType(pass.passTypeId), customer: customer(pass.customerId), status: passStatus(pass), purchase,
        payment: purchase ? s.payments.find(x => x.purchaseId === purchase.id) : null,
        visits: s.attendance.filter(a => a.passId === passId).map(a => ({ ...a, session: session(a.sessionId) })).sort((x, y) => (x.session.date + x.session.time).localeCompare(y.session.date + y.session.time)),
        corrections: s.corrections.filter(c => c.passId === passId)
      };
    }

    // Reports (UC-07.1, UC-07.2, UC-07.3, UC-03).
    function salesReport(fromIso, toIso) {
      const rows = s.purchases.filter(p => !p.voided && iso(p.recordedAt) >= fromIso && iso(p.recordedAt) <= toIso);
      const byType = s.passTypes.map(t => {
        const r = rows.filter(p => p.passTypeId === t.id);
        return { type: t, count: r.length, gross: r.reduce((a, p) => a + p.listPrice, 0), discounts: r.reduce((a, p) => a + p.discount, 0), net: r.reduce((a, p) => a + p.amountDue, 0) };
      });
      return { rows, byType, pending: rows.filter(p => p.paymentStatus !== 'confirmed') };
    }
    function attendanceReport(filter = () => true) {
      return s.sessions.filter(x => x.status !== 'cancelled' && filter(x)).map(x => {
        const r = rosterOf(x.id);
        return { session: x, count: r.length, utilization: Math.round(r.length / x.capacity * 100), overrides: r.filter(a => a.overrides.length).length, free: r.filter(a => a.coverage === 'free').length };
      }).sort((a, b) => (a.session.date + a.session.time).localeCompare(b.session.date + b.session.time));
    }
    function payReport(instructorId) {
      const ins = instructor(instructorId);
      const taught = s.sessions.filter(x => x.instructorId === instructorId && x.status !== 'cancelled' && x.roster.status === 'submitted');
      return { instructor: ins, taught, total: taught.length * ins.payPerClass };
    }

    return { state: s, today, byId, customer, session, passType, instructor, room, rosterOf, purchaseOf, passStatus, eligiblePasses, findCustomers, registerCustomer, quotePurchase, recordPurchase, logPaperPass, confirmPayment, evaluateCheckIn, recordCheckIn, submitRoster, reopenRoster, checkAvailability, saveSession, cancelSession, reverseAttendance, voidPurchase, possibleDuplicate, correctionPreview, passHistory, salesReport, attendanceReport, payReport, passPolicy, ageOn };
  }

  const api = { seed, Studio, CATEGORY, iso, addDays, ageOn, uid, EarliestExpiryPolicy };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.YogaDomain = api;
})(typeof window !== 'undefined' ? window : globalThis);

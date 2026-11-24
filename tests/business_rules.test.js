const D = require(process.argv[2] || '../domain.js');
const assert = require('assert');
const today = D.iso(new Date());
let st = D.seed(today); let m = D.Studio(st, today);
const ev = (s,c,min=20)=>m.evaluateCheckIn({sessionId:s,customerId:c,minutesBeforeStart:min});
// BR-03 earliest expiry: Alex has p1 (4-class, older) and p2; p1 expires first
let e=ev('s1','c1'); assert.equal(e.pass.id,'p1'); assert.equal(e.blockers.length,0); assert.equal(e.overridable.length,0);
// BR-06 window
e=ev('s1','c1',45); assert.deepEqual(e.overridable.map(o=>o.code),['early']);
let r=m.recordCheckIn({sessionId:'s1',customerId:'c1',minutesBeforeStart:45,role:'instructor',recordedBy:'x'}); assert(!r.ok && /front-desk/.test(r.error));
r=m.recordCheckIn({sessionId:'s1',customerId:'c1',minutesBeforeStart:45,role:'staff',overrides:['early'],overrideReason:'Arrived early',recordedBy:'x'}); assert(r.ok);
assert.equal(m.byId('passes','p1').remainingUses,1);
// duplicate
e=ev('s1','c1'); assert(e.blockers.some(b=>b.code==='duplicate'));
// BR-14 no pass (c3 Jordan Lee #2)
e=ev('s1','c3'); assert(e.blockers.some(b=>b.code==='nopass'));
// BR-02 workshop not covered by regular pass: c1 at s5
e=ev('s5','c1'); assert(e.blockers.some(b=>b.code==='nopass' && /do not cover/.test(b.text)));
// c4 has workshop pass for s5
e=ev('s5','c4'); assert.equal(e.pass.id,'p7');
// BR-05 payment pending c6
e=ev('s1','c6'); assert.deepEqual(e.overridable.map(o=>o.code),['payment']);
// BR-07 capacity s2 full
e=ev('s2','c4'); assert(e.overridable.some(o=>o.code==='capacity'));
// free class
e=ev('s4','c3'); assert.equal(e.coverage,'free'); assert.equal(e.blockers.length,0);
// BR-08 locked roster s0
e=ev('s0','c5'); assert(e.blockers.some(b=>b.code==='locked'));
assert(!m.reopenRoster('s0','i2').ok); assert(m.reopenRoster('s0','i1').ok); assert(m.submitRoster('s0','i1').ok);
// BR-04 senior discount automatic c2 born 1958
let q=m.quotePurchase('c2','pt10',today); assert.equal(q.discount,16); assert.equal(q.amountDue,144);
q=m.quotePurchase('c1','pt10',today); assert.equal(q.discount,0);
// BR-01 future start => not active
let pr=m.recordPurchase({customerId:'c3',passTypeId:'pt4',startIso:D.addDays(today,10),paymentStatus:'confirmed',recordedBy:'s'}); assert(pr.ok);
assert.equal(m.passStatus(pr.pass).code,'future'); e=ev('s1','c3'); assert(e.blockers.some(b=>b.code==='nopass'));
assert(!m.recordPurchase({customerId:'c3',passTypeId:'pt4',startIso:D.addDays(today,-1),paymentStatus:'confirmed'}).ok);
// registration
assert(!m.registerCustomer({name:'X'}).ok);
let reg=m.registerCustomer({name:'Alex Morgan',phone:'412-555-9999',email:'a@b.c',homeAddress:'1 Main',dateOfBirth:'2000-01-01'}); assert(reg.ok && reg.warning);
assert(!m.registerCustomer({name:'Y',phone:'(412) 555-0101',email:'a',homeAddress:'b',dateOfBirth:'2000-01-01'}).ok);
assert.equal(m.findCustomers('jordan').filter(c=>c.duplicateName).length,2);
// availability: closure + room + instructor conflicts
let conf=m.checkAvailability({date:D.addDays(today,4),time:'09:00',durationMinutes:60,roomId:'r1',instructorId:'i1',capacity:20}); assert(conf.length===1 && /closed/.test(conf[0]));
conf=m.checkAvailability({date:D.addDays(today,2),time:'17:00',durationMinutes:60,roomId:'r1',instructorId:'i1',capacity:20}); assert.equal(conf.length,2);
conf=m.checkAvailability({date:D.addDays(today,2),time:'17:00',durationMinutes:60,roomId:'r2',instructorId:'i3',capacity:20}); assert(/holds 12/.test(conf[0]));
// cancel restores uses
let before=m.byId('passes','p1').remainingUses; m.cancelSession('s1','Instructor ill','mgr'); assert.equal(m.byId('passes','p1').remainingUses,before+1);
// reports
assert(m.attendanceReport().length>0); assert.equal(m.payReport('i1').taught.length,1); assert.equal(m.payReport('i1').total,45);
console.log('all domain tests passed');
// Part C additions: duplicate purchase, correction preview, pass history
{ const st2=D.seed(today); const m2=D.Studio(st2,today);
  let a=m2.recordPurchase({customerId:'c1',passTypeId:'pt4',startIso:today,paymentStatus:'confirmed',recordedBy:'s'}); assert(a.ok);
  let b=m2.recordPurchase({customerId:'c1',passTypeId:'pt4',startIso:today,paymentStatus:'confirmed',recordedBy:'s'}); assert(!b.ok && /duplicate/.test(b.error));
  b=m2.recordPurchase({customerId:'c1',passTypeId:'pt4',startIso:today,paymentStatus:'confirmed',recordedBy:'s',confirmedNotDuplicate:true}); assert(b.ok);
  let pv=m2.correctionPreview('attendance','a00'); assert(!pv.ok && /locked/.test(pv.lines[0]));
  m2.reopenRoster('s0','i1'); pv=m2.correctionPreview('attendance','a00'); assert(pv.ok && /2 → 3/.test(pv.lines[2]));
  assert(m2.reverseAttendance('a00','wrong person','mgr').ok); pv=m2.correctionPreview('attendance','a00'); assert(!pv.ok && /already reversed/.test(pv.lines[0]));
  assert.equal(m2.byId('passes','p1').remainingUses,3);
  assert(!m2.reverseAttendance('a00','again','mgr').ok); assert.equal(m2.byId('passes','p1').remainingUses,3);
  let h=m2.passHistory('p1'); assert.equal(h.visits.length,1); assert(h.visits[0].voided); assert.equal(h.corrections.length,1);
  pv=m2.correctionPreview('purchase','p4-buy'); assert(!pv.ok && /check-in/.test(pv.lines[0]));
  pv=m2.correctionPreview('purchase',a.purchase.id); assert(pv.ok);
  console.log('part C tests passed'); }

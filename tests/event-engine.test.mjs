import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {checkSchema} from './schema-check.mjs';
import {createState,validateBundle,evaluate,resolveEvent,advanceYear,finalizeLife,rebirth,serialize,restore} from '../src/events/engine.js';
const b=JSON.parse(fs.readFileSync(new URL('../src/events/events.json',import.meta.url),'utf8'));
const clone=structuredClone;
test('supplied JSON Schema validates full bundle and rejects malformed effects',()=>{
  const schema=JSON.parse(fs.readFileSync(new URL('../src/events/event-bundle.schema.json',import.meta.url),'utf8'));
  assert.equal(checkSchema(b,schema),true);
  const bad=clone(b);bad.events[0].outcomes[0].effects=[{op:'runCode',value:'bad'}];
  assert.throws(()=>checkSchema(bad,schema));
});
const record=(outcome='canonical',canonical=true)=>({outcome,canonical,age:0,life:1});
function scene(id,options={}){
  const s=createState(b,options),e=b.events.find(e=>e.id===id);s.life.age=Math.max(e.age.min,100);s.world.year=s.life.age;
  for(const p of e.requires)s.history[p]=record();
  s.actor.company=true;s.actor.wealth=100;s.actor.education='university';s.actor.relationship='married';
  s.world.anomaly=20;
  for(const person of Object.values(s.people)){person.present=true;person.alive=true;person.bornAge=20;}
  return s;
}
function token(s,kind,subject='self',remaining=1,life=1){s.causality.ledger.push({id:'test:'+s.causality.serial++,eventId:'E0004',life,age:4,kind,subject,amount:remaining,remaining});}

test('1000 source IDs retained, hard dependency graph valid, 5010 outcomes',()=>{
  assert.deepEqual(validateBundle(b),{events:1000,outcomes:5010,rules:11,hardGraphAcyclic:true});
  const source=fs.readFileSync(new URL('../src/events/source.md',import.meta.url),'utf8');
  for(const line of source.split('\n')){
    if(!/^\| E\d{4} \|/.test(line))continue;
    const p=line.split('|').slice(1,-1).map(x=>x.trim()),e=b.events.find(e=>e.id===p[0]);
    assert.equal(e.source.text,p[3]);assert.equal(e.source.prerequisite,p[2]);assert.equal(e.source.branch,p[6]);
  }
});
test('exact seven integer attributes with sum 30 enforced',()=>{
  assert.throws(()=>createState(b,{stats:{strength:30}}));
  const s=createState(b);assert.equal(s.activeRules.length,0);assert.equal(s.life.index,1);
});
test('high and low attributes decide E0064 result without random selection',()=>{
  const high=scene('E0064'),low=clone(high);high.actor.stats.strength=10;low.actor.stats.strength=1;
  assert.equal(resolveEvent(high,b,'E0064').outcome,'canonical');
  assert.equal(resolveEvent(low,b,'E0064').outcome,'setback');
  assert.equal(low.actor.health,85);
});
test('missing hard prerequisite cannot be bypassed by a foreshadow link',()=>{
  const s=scene('E0160');s.history={E0133:record()};const before=serialize(s);
  assert.equal(resolveEvent(s,b,'E0160'),null);assert.equal(serialize(s),before);
});
test('execution budget yields within the same age instead of adding extra years',()=>{
  const s=createState(b);const first=advanceYear(s,b,{budget:1});assert.equal(s.life.age,0);assert.equal(first.pending,true);
  advanceYear(s,b,{budget:1});assert.equal(s.life.age,0);assert.equal(Object.keys(s.history).length,2);
  advanceYear(s,b,{budget:1});assert.equal(s.life.age,1);
});
test('failed previous event cannot show original success continuation',()=>{
  const s=scene('E0065');s.actor.stats.charm=10;s.history.E0064=record('setback',false);
  const result=resolveEvent(s,b,'E0065');assert.equal(result.outcome,'adapted_success');assert.ok(!result.text.includes('校长在台上表扬'));
});
test('no partner means no marriage invented',()=>{
  const s=scene('E0360');s.actor.relationship='single';s.people.partner.present=false;s.actor.stats.charm=10;
  assert.equal(resolveEvent(s,b,'E0360').outcome,'unavailable');assert.equal(s.actor.relationship,'single');
});
test('child has a real birth age; kindergarten waits until age three',()=>{
  const s=scene('E0369',{ruleIds:['fortunate']});s.people.child.present=false;s.life.age=27;s.world.year=27;s.actor.stats.constitution=10;
  resolveEvent(s,b,'E0369');assert.equal(s.people.child.bornAge,27);
  s.life.age=28;assert.equal(resolveEvent(s,b,'E0401'),null);
  s.life.age=30;assert.ok(resolveEvent(s,b,'E0401'));
});
test('dead friend does not reappear as a living participant',()=>{
  const s=scene('E0673');s.people.friend.alive=false;s.actor.stats.constitution=10;
  assert.equal(resolveEvent(s,b,'E0673').outcome,'unavailable');
});
test('E0852 cannot invent past kindness',()=>{
  const s=scene('E0852');s.actor.stats.spirit=10;
  assert.equal(resolveEvent(s,b,'E0852').outcome,'unavailable');
});
test('kindness pays once, keeps source, survives save, cannot be claimed twice',()=>{
  const s=scene('E0852');s.actor.stats.spirit=10;token(s,'kindness','beneficiary');
  const result=resolveEvent(s,b,'E0852');assert.notEqual(result.outcome,'unavailable');
  assert.equal(evaluate({op:'balance',args:['kindness','beneficiary']},s),0);
  assert.equal(s.causality.settlements[0].allocations[0].ledgerId,'test:0');
  const snapshot=serialize(s);assert.equal(resolveEvent(s,b,'E0852'),null);assert.equal(serialize(s),snapshot);
  assert.equal(serialize(restore(snapshot,b)),snapshot);
});
test('cross-life ledger is actual cause, not just a reincarnation counter',()=>{
  const s=scene('E0852');token(s,'kindness','beneficiary');s.life.status='dead';s.life.deathCause='fixture';
  rebirth(s,b,{awakenedRuleId:'memory_carry'});s.life.age=40;s.history.E0851=record();s.actor.stats.spirit=10;
  const result=resolveEvent(s,b,'E0852');assert.notEqual(result.outcome,'unavailable');
  assert.equal(s.causality.settlements.at(-1).allocations[0].ledgerId,'test:0');
  assert.equal(s.causality.ledger.find(e=>e.id==='test:0').life,1);
});
test('having processed unavailable event is not a successful past memory',()=>{
  const s=scene('E0064');s.life.index=2;s.actor.stats.strength=10;s.past.events.E0064={count:1,outcomes:{unavailable:1}};
  assert.equal(resolveEvent(s,b,'E0064').outcome,'canonical');
});
test('a successful previous-life memory changes the same scene',()=>{
  const s=scene('E0064');s.life.index=2;s.actor.stats.strength=10;s.past.events.E0064={count:1,outcomes:{canonical:1}};
  assert.equal(resolveEvent(s,b,'E0064').outcome,'past_resonance');
});
test('duel alone cannot defeat ten thousand; count-one then duel can',()=>{
  const one=scene('E0992',{ruleIds:['duel_invincible','never_lie']});one.actor.stats.strength=1;
  const many=scene('E0992',{ruleIds:['duel_invincible','count_only_one']});many.actor.stats.strength=1;
  assert.equal(resolveEvent(one,b,'E0992').outcome,'setback');
  const result=resolveEvent(many,b,'E0992');assert.equal(result.outcome,'rule_victory');
  assert.equal(result.rules.find(r=>r.ruleId==='count_only_one').changes[0].after,1);
  assert.equal(b.events.find(e=>e.id==='E0992').facts.actualOpponents,10000);
});
test('rule execution order is semantic stage, not input order',()=>{
  const a=scene('E0992',{ruleIds:['count_only_one','duel_invincible']}),s=scene('E0992',{ruleIds:['duel_invincible','count_only_one']});
  assert.equal(resolveEvent(a,b,'E0992').outcome,resolveEvent(s,b,'E0992').outcome);
});
test('renaming rule IDs preserves behavior (no hardcoded talent pair)',()=>{
  const copy=clone(b);for(const r of copy.ruleExamples)r.id='renamed_'+r.id;
  const s=scene('E0992');s.activeRules=['renamed_count_only_one','renamed_duel_invincible'];
  assert.equal(resolveEvent(s,copy,'E0992').outcome,'rule_victory');
});
test('truth and belief are separate facts; lying is prevented',()=>{
  const s=scene('E0040',{ruleIds:['never_lie','nobody_believes']});
  const result=resolveEvent(s,b,'E0040');assert.equal(result.outcome,'truth_enforced');assert.ok(!result.text.includes('暂时取得信任'));
  const t=scene('E0510',{ruleIds:['never_lie','nobody_believes']});t.actor.stats.spirit=10;
  assert.equal(resolveEvent(t,b,'E0510').outcome,'setback');
});
test('incompatible rule writes leave conflict evidence, without Infinity',()=>{
  const s=scene('E0994',{ruleIds:['death_required','death_delayed']});
  const result=resolveEvent(s,b,'E0994');assert.ok(result.conflicts.some(c=>c.path==='facts.deathAllowed'));
  assert.ok(!serialize(s).includes('Infinity'));
});
test('high age never forces death under death-forbidden rule',()=>{
  const s=createState(b,{ruleIds:['death_forbidden']});s.life.age=500;s.actor.health=1;
  advanceYear(s,b);assert.equal(s.life.age,501);assert.equal(s.life.status,'alive');
});
test('real death triggers one report, and first-life epilogue does not invent old talents',()=>{
  const s=createState(b);s.actor.health=0;advanceYear(s,b);assert.equal(s.life.status,'dead');assert.equal(s.archives.length,1);
  finalizeLife(s,b);assert.equal(s.archives.length,1);assert.equal(s.log.find(e=>e.eventId==='E0963').outcome,'unavailable');
  assert.throws(()=>{const a=createState(b);finalizeLife(a,b);});
});
test('repeat rebirth cannot duplicate archive or increment life twice',()=>{
  const s=createState(b);s.actor.health=0;advanceYear(s,b);rebirth(s,b,{awakenedRuleId:'fortunate'});
  assert.equal(s.life.index,2);assert.equal(s.archives.length,1);assert.throws(()=>rebirth(s,b));
});
test('failed effect rolls back entire event including ledger changes',()=>{
  const copy=clone(b),e=copy.events.find(e=>e.id==='E0001');e.outcomes=[{id:'bad',priority:0,when:true,text:'bad',canonical:false,effects:[{op:'grant',kind:'test',subject:'self',amount:1},{op:'settle',kind:'missing',subject:'self',amount:1}]}];
  const s=createState(copy);s.life.age=0;const before=serialize(s);assert.throws(()=>resolveEvent(s,copy,'E0001'));assert.equal(serialize(s),before);
});
test('unsafe paths, unknown expressions, cycles and non-finite values rejected',()=>{
  assert.throws(()=>evaluate({ref:'actor.__proto__.x'},createState(b)));
  assert.throws(()=>evaluate({op:'eval',args:['1+1']},createState(b)));
  assert.throws(()=>evaluate({op:'div',args:[1,0]},createState(b)));
  const copy=clone(b);copy.events[0].requires=['E0002'];assert.throws(()=>validateBundle(copy));
  const s=createState(b);s.actor.wealth=Infinity;assert.throws(()=>serialize(s));
});
test('malformed save and unknown outcomes rejected',()=>{
  const s=createState(b);s.actor.health=null;assert.throws(()=>restore(JSON.stringify(s),b));
  const t=createState(b);t.history.E0001=record('invented');assert.throws(()=>restore(JSON.stringify(t),b));
});
test('same initial state produces identical complete transcript after refresh',()=>{
  const a=createState(b),s=createState(b);for(let i=0;i<12;i++)advanceYear(a,b);
  const resumed=restore(serialize(a),b);for(let i=0;i<12;i++)advanceYear(s,b);
  for(let i=0;i<10;i++){advanceYear(resumed,b);advanceYear(s,b);}
  assert.equal(serialize(resumed),serialize(s));
});
test('all 1000 nodes reachable as real resolutions or explicit non-realizations',()=>{
  const s=createState(b,{ruleIds:['fortunate','duel_invincible','count_only_one','death_forbidden']});
  for(const k in s.actor.stats)s.actor.stats[k]=10;
  for(let year=0;year<=105;year++)advanceYear(s,b);
  const missing=b.events.filter(e=>e.phase==='alive'&&!s.history[e.id]);assert.deepEqual(missing,[]);
  s.activeRules=[];s.actor.health=0;advanceYear(s,b);assert.equal(Object.keys(s.history).length,1000);
  assert.equal(s.archives.length,1);
});

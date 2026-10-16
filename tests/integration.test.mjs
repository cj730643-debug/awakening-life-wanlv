import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createState,resolveEvent} from '../src/events/engine.js';
const bundle=JSON.parse(fs.readFileSync(new URL('../src/events/events.json',import.meta.url),'utf8'));
vm.runInThisContext(fs.readFileSync(new URL('../dist/runtime.js',import.meta.url),'utf8'));
const W=globalThis.Wanlv;
let count=0;function test(name,fn){fn();count++;console.log('PASS V2',name);}
function runWith(ids=[]){const r=W.createRun('因果测试',W.defaults,'integration');r.owned=ids;r.catalog=ids.map(id=>W.talents.find(t=>t.id===id));r.current.talents=new Set(ids);for(const id of ids)r.stacks[id]=1;W.reveal(r);r.currentDerived=W.factors(r);return r;}
test('默认入口真正执行JSON事件，并通过原core.next更新状态',()=>{
 const r=runWith();W.advance(r);assert.equal(r.version,'wanlv-html-2.0');assert.equal(r.eventState.life.age,0);assert.ok(r.eventState.history.E0001);assert.ok(r.current.events.has('E0001'));assert.equal(r.eventState.activeRules.length,0);
});
test('新人生三选一与完整事件、前世账本同步继承',()=>{
 const r=runWith();W.simulateToEnd(r);assert.equal(r.phase,'dead');const firstAge=r.report.age;
 const ledger=r.eventState.causality.ledger.map(e=>e.id);const history=Object.keys(r.eventState.history).length;
 W.offer(r);const ids=[...r.candidates];const copy=W.restore(W.encode(r));assert.deepEqual(copy.candidates,ids);
 const id=ids.find(id=>id!=='death_refusal'&&id!=='death_delayed');W.choose(copy,id);
 assert.equal(copy.lifeIndex,2);assert.equal(copy.eventState.life.index,2);assert.equal(copy.eventState.past.total,history);
 assert.ok(copy.eventState.causality.ledger.some(e=>ledger.includes(e.id)));assert.equal(copy.archive[0].age,firstAge);
 assert.throws(()=>W.choose(copy,id));W.advance(copy);assert.equal(copy.current.props.current.age,0);
});
test('刷新后结果、世界年份和报告与未刷新的新版人生一致',()=>{
 const a=runWith(['minor_salary','minor_immune']);for(let i=0;i<35;i++){a.phase='running';W.advance(a);}
 const b=W.restore(W.encode(a));W.simulateToEnd(a);W.simulateToEnd(b);
 assert.deepEqual(a.report,b.report);assert.equal(a.world.year,b.world.year);assert.deepEqual(a.eventState.history,b.eventState.history);
});
test('旧版进行中存档保留年龄、天赋与存档，确认下一世才切换',()=>{
 const old=W.createRun('旧角色',W.defaults,'old',undefined,{legacy:true});delete old.legacyTestMode;
 // Build a real classic snapshot, as old browsers saved it before deployment.
 for(let i=0;i<15;i++){old.phase='running';W.advance(old);}const age=old.current.props.current.age;
 const restored=W.restore(W.encode(old));assert.equal(restored.version,'wanlv-html-1.0');assert.equal(restored.current.props.current.age,age);assert.equal(restored.eventState,undefined);
 W.simulateToEnd(restored);const report=structuredClone(restored.report);W.offer(restored);W.choose(restored,restored.candidates.find(id=>id!=='death_refusal'));
 assert.equal(restored.version,W.VERSION);assert.equal(restored.lifeIndex,2);assert.deepEqual(restored.archive[0],report);assert.equal(restored.eventState.life.age,-1);
});
test('新天赋进入候选池，两个声明式人数规则可被真实宿主运行',()=>{
 assert.ok(W.talents.some(t=>t.id==='count_only_one'));assert.ok(W.talents.some(t=>t.id==='duel_invincible'));
 const r=runWith(['count_only_one','duel_invincible','death_refusal']);for(const key in r.current.props.current)if(key!=='age')r.current.props.current[key]=10;
 while(r.current.props.current.age<86){r.phase='running';W.advance(r);}
 while(r.eventState.life.pending){r.phase='running';W.advance(r);}
 assert.equal(r.eventState.history.E0992.outcome,'rule_victory');assert.ok(r.eventState.activeRules.some(id=>id.startsWith('duel_invincible:')));
});
test('健康与死亡保护统一，不死角色仍可进入200岁观察节点',()=>{
 const r=runWith(['death_refusal']);W.simulateToEnd(r);assert.equal(r.phase,'horizon');assert.equal(r.report,null);assert.equal(r.eventState.life.status,'alive');assert.equal(r.current.props.current.age,200);
});
test('旧100个天赋也影响新版事件规则、成长与收入',()=>{
 const r=runWith(['minor_learning','minor_salary','minor_immune']);W.advance(r);
 assert.equal(r.eventState.activeRules.length,3);let applied=false;while(r.current.props.current.age<7){r.phase='running';W.advance(r);applied ||= r.eventEvidence.some(e=>e.rules.some(rule=>rule.ruleId==='minor_learning:0'&&rule.changes.some(c=>c.path==='facts.bonus'&&c.after>c.before)));}assert.ok(applied);assert.ok(r.eventState.history.E0051);
 assert.ok(W.factors(r).learning>1);assert.ok(W.factors(r).income>1);assert.ok(W.factors(r).health>1);
});
test('首世不存在前世天赋，终章不生成假死亡，存档保持在5MiB内',()=>{
 const r=runWith();W.simulateToEnd(r);assert.equal(r.eventState.history.E0963.outcome,'unavailable');assert.ok(r.report.cause);assert.equal(r.profile.times,1);
 const n=r.archive.length;W.advance(r);assert.equal(r.archive.length,n);assert.ok(Buffer.byteLength(W.encode(r))<5*1024*1024);
});
test('空快照或属性与事件年龄不一致的存档被拒绝',()=>{
 const r=runWith();delete r.eventState;assert.throws(()=>W.restore(W.encode(r)));
 const s=runWith();W.advance(s);s.eventState.life.age=99;assert.throws(()=>W.restore(W.encode(s)));
});
console.log('All',count,'V2 integration tests passed.');

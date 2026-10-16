import {bundle} from './events/data.js';
import {createState,advanceYear,rebirth,restore,serialize} from './events/engine.js';
import {propsEffect} from '../packages/core/src/state.ts';
import {factors} from './rules.js';
export const EVENT_VERSION=bundle.version;
export const EVENT_COUNT=bundle.events.length;
const ref=ref=>({ref}),op=(op,...args)=>({op,args});
const set=(path,value)=>({op:'set',path,value});
const add=(path,value)=>({op:'add',path,value});
const kind=(...values)=>op('any',...values.map(v=>op('eq',ref('facts.kind'),v)));
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function eventBundleFor(run){
 const rules=[];
 for(const talent of run.catalog||[]){
  const condition=op('any',...(talent.conditions?.length?talent.conditions:[{}]).map(c=>op('all',op('gte',ref('life.age'),c.minAge??0),...(c.maxAge===undefined?[]:[op('lte',ref('life.age'),c.maxAge)]))));
  for(const [index,r] of talent.rules.entries()){
   let when=true,effects=[],stage=10;
   if(r.op==='event'){when=r.when;effects=r.effects;stage=r.stage;}
   else if(['require','forbid'].includes(r.op)&&r.left==='death'){
    when=op('eq',ref('facts.deathRequested'),true);stage=r.op==='forbid'?20:10;effects=[set('facts.deathAllowed',r.op==='require')];
   }else if(r.op==='multiply'){
    const domains={learning:['learn'],research:['research','observe','anomaly'],social:['social','romance','marriage','truth'],combat:['combat','rescue'],fortune:['invest','income','danger','choice'],health:['health','danger','rescue'],recovery:['health'],stress:['conflict','anomaly','choice'],income:['work','enterprise','invest','income'],spending:['loss','repay'],lifespan:['health']};
    when=kind(...(domains[r.target]||[]));
    const value=Math.log2(r.value)*(r.target==='stress'||r.target==='spending'?-1:1)*(run.stacks[talent.id]||1);
    effects=[add('facts.bonus',clamp(value*3,-8,8))];
    if(['health','recovery'].includes(r.target))effects.push(add('facts.protection',clamp(value*10,0,10)));
   }else{
    // Existing relation talents continue to feed factors(), growth and economy;
    // their bounded event contribution is also attached to the originating rule.
    when=kind('research','observe','anomaly','combat','enterprise');
    effects=[add('facts.bonus',0.15)];
   }
   rules.push({id:talent.id+':'+index,stage,priority:0,description:talent.description,when:op('all',condition,when),effects});
  }
 }
 const f=factors(run);
 if(f.attack===Infinity)rules.push({id:'derived:unbounded-combat',stage:40,priority:0,description:'已发现的无界攻击规则',when:kind('combat'),effects:[set('facts.forcedSuccess',true)]});
 if(run.hidden.some(h=>h.kind==='negation'&&h.signature==='death'))rules.push({id:'derived:death-negation',stage:40,priority:0,description:'已发现的死亡否定',when:true,effects:[set('facts.deathAllowed',false)]});
 return {...bundle,ruleExamples:rules};
}
export function startEvents(run,previous){
 const data=eventBundleFor(run);
 let s;
 if(previous?.life.status==='dead'){
  s=structuredClone(previous);s.activeRules=[];
  rebirth(s,data);
 }else{
  s=createState(data,{seed:run.seed,stats:{...Object.fromEntries(Object.entries(run.base).filter(([k])=>k!=='money')),family:run.base.money}});
  s.life.index=run.lifeIndex;
  s.world.birthYear=run.world.year+1;s.world.year=run.world.year;
 }
 s.activeRules=data.ruleExamples.map(r=>r.id);
 s.archives=s.archives.slice(-1);s.log=[];
 return s;
}
export function validateEvents(run){
 if(!run.eventState)throw Error('新版事件存档不完整。');
 // Persisted IDs refer to last tick's active catalog, not transient derived
 // factors. Rebuild derived rules before validating this exact snapshot.
 const data=eventBundleFor(run);
 run.eventState.activeRules=data.ruleExamples.map(r=>r.id);
 run.eventState=restore(serialize(run.eventState),data);
 return run.eventState;
}
export function resolveEvents(run,coreState){
 const s=run.eventState,data=eventBundleFor(run),f=factors(run);
 s.activeRules=data.ruleExamples.map(r=>r.id);
 const startingLog=s.log.length;
 const result=advanceYear(s,data,{budget:8,agingScale:f.immortal?0:clamp(1/(f.lifespan*f.health),0.001,5)});
 const records=s.log.slice(startingLog);
 // Bound debug history to protect localStorage. Event outcomes and the causal
 // ledger remain complete; reports keep a separate compact life timeline.
 s.log=s.log.slice(-80);s.archives=s.archives.slice(-1);
 const mapped={...s.actor.stats,money:s.actor.stats.family,age:s.life.age};delete mapped.family;
 coreState.props=propsEffect(coreState.props,Object.fromEntries(Object.entries(mapped).map(([k,v])=>[k,v-coreState.props.current[k]])));
 coreState.life=s.life.status==='dead'?0:1;
 for(const entry of result.entries)coreState.events.add(entry.eventId);
 run.eventEvidence=records.filter(e=>e.eventId).slice(-12);
 run.bio={...run.bio,
  role:({child:s.life.age<6?'幼儿':s.life.age<18?'学生':'待业',employee:'职员',founder:'创业者',ceo:'企业负责人',retired:'退休人士'})[s.actor.occupation]||s.actor.occupation,
  education:({none:'尚未入学',school:'基础教育',university:'大学'})[s.actor.education]||s.actor.education,
  relationship:({single:'未婚',dating:'恋爱',married:'已婚'})[s.actor.relationship]||s.actor.relationship,
  children:s.people.child.present?1:0,wealth:s.actor.wealth,research:s.actor.research,institute:s.actor.research>=5,health:s.actor.health};
 run.world['天律研究进度']=s.world.research;run.world['社会稳定度']=s.world.stability;
 return {state:coreState,triggers:result.entries.map(e=>e.eventId),records,pending:result.pending};
}
export function causalTotals(run){
 const ledger=run.eventState?.causality.ledger||[];
 return ledger.reduce((out,e)=>{if(e.remaining>0)out[e.kind]=(out[e.kind]||0)+e.remaining;return out;},{});
}

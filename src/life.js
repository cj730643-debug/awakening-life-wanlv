import * as legacy from './legacy-life.js';
import * as core from '../packages/core/src/game.ts';
import {propsEffect} from '../packages/core/src/state.ts';
import {startEvents,resolveEvents,validateEvents,causalTotals,EVENT_VERSION,EVENT_COUNT} from './event-bridge.js';
export const VERSION='wanlv-html-2.0';
export const labels=legacy.labels;
export const defaults=legacy.defaults;
export const categories=legacy.categories;
export const rarityLabels=legacy.rarityLabels;
export const talents=legacy.talents;
export const hiddenPatterns=legacy.hiddenPatterns;
export const detectRules=legacy.detectRules;
export const factors=legacy.factors;
export const emptyProfile=legacy.emptyProfile;
export const random=legacy.random;
export const validateAllocation=legacy.validateAllocation;
export const reveal=legacy.reveal;
export const offer=legacy.offer;
export const encode=legacy.encode;
export const decode=legacy.decode;
export {causalTotals,EVENT_VERSION,EVENT_COUNT};
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export function createRun(name,base,seed,account,options={}){
 const run=legacy.createRun(name,base,seed,account);
 if(options.legacy){run.legacyTestMode=true;return run;}
 run.version=VERSION;run.eventMode='causal';run.eventState=startEvents(run);
 return run;
}
export function choose(run,id){
 if(run.legacyTestMode)return legacy.choose(run,id);
 const next=structuredClone(run),previous=next.eventState;
 const fresh=legacy.choose(next,id);
 next.version=VERSION;next.eventMode='causal';next.eventState=startEvents(next,previous);
 next.eventEvidence=[];Object.assign(run,next);return fresh;
}
function grow(run){
 const s=run.eventState,age=s.life.age+1,f=factors(run),change={};
 if(age>=4&&age<=24){change.intelligence=Math.min(0.3,0.035*f.learning);change.constitution=Math.min(0.08,0.015*f.health);}
 if(age>=18&&age<=55){change.strength=Math.min(0.1,0.018*f.combat);change.spirit=Math.min(0.08,0.015/f.stress);}
 run.current.props=propsEffect(run.current.props,change);
 const q=run.current.props.current;
 s.actor.stats={...Object.fromEntries(Object.entries(q).filter(([k])=>k!=='money'&&k!=='age')),family:q.money};
 if(age>=22){
  const salary={employee:2,founder:3,ceo:4,retired:0.7}[s.actor.occupation]||0;
  s.actor.wealth=Math.max(0,s.actor.wealth+salary*clamp(f.income,0,100)-0.5*clamp(f.spending,0,100));
 }
 if(age>=6&&s.actor.education==='none')s.actor.education='school';
}
function worldStep(run){
 const age=run.eventState.life.age+1;
 run.world.year=run.eventState.world.birthYear+age;
 if(run.world.year%10===0&&run.world.year>0){
  const entry={year:run.world.year,text:'天律院更新因果档案，公开新的规则观测记录。'};
  run.worldHistory.push(entry);run.worldHistory=run.worldHistory.slice(-200);return entry;
 }
 return null;
}
export function advance(run){
 if(run.version!==VERSION||!run.eventState)return legacy.advance(run);
 if(['dead','awakening','horizon'].includes(run.phase))return null;
 const newYear=!run.eventState.life.pending;
 let worldEvent=null;
 if(newYear){grow(run);worldEvent=worldStep(run);}
 const freshBefore=reveal(run);let output;
 const result=core.next(run.current,run.profile,random(run),state=>{
  output=resolveEvents(run,state);return output;
 },newYear);
 run.current=result.state;
 const s=run.eventState,age=s.life.age;
 const visible=output.records.filter(e=>e.eventId&&e.outcome!=='unavailable');
 const texts=visible.map(e=>e.text);
 if(age===0&&run.log.length===0)texts.unshift('你在白塔城出生。这一世，因果从这里开始。');
 if(worldEvent)texts.push('【世界】'+worldEvent.text);
 const fresh=[...freshBefore,...reveal(run)];
 if(fresh.length)texts.push(...fresh.map(h=>'发现隐藏天赋：'+h.name));
 run.currentDerived=factors(run);
 const death=result.end?s.life.deathCause:null;
 if(death)texts.push('【本世终章】'+death);
 const importance=death||fresh.length?3:visible.some(e=>['rule_victory','past_resonance'].includes(e.outcome))||visible.some(e=>e.changes.some(c=>c.op==='birth'))?2:1;
 if(texts.length===0&&newYear)texts.push('这一年，你沿着已有经历继续生活。');
 const entry={age,year:run.world.year,text:texts.join('\n'),importance,role:run.bio.role,death,
  eventIds:visible.map(e=>e.eventId),outcomes:visible.map(e=>e.outcome)};
 if(texts.length){
  const previous=run.log.at(-1);
  if(previous&&previous.age===age&&!previous.death){previous.text+='\n'+entry.text;previous.importance=Math.max(previous.importance,importance);previous.eventIds=[...(previous.eventIds||[]),...entry.eventIds];previous.outcomes=[...(previous.outcomes||[]),...entry.outcomes];previous.death=death;}
  else run.log.push(entry);
  run.log=run.log.slice(-140);
 }
 if(result.end)finish(run,death);
 else if(age>=(run.horizonAge||200)&&!s.life.pending)run.phase='horizon';
 else if(run.autoPause&&importance>=2&&age>0)run.phase='paused';
 return entry;
}
function finish(run,cause){
 if(run.report)return;
 const score=core.summary(run.current,run.profile).summary,power=run.currentDerived.attack;
 const grade=power===Infinity?'SSS':run.bio.research>=6?'SS':score>190?'S':score>140?'A':score>100?'B':'C';
 const title=run.hidden.length?'天律的见证者':run.bio.research>2?'求知者':run.current.props.current.age>=85?'长夜守望者':'尘世旅人';
 const report={id:run.seed+'-'+run.birthYear,seed:run.seed,name:run.name,life:run.lifeIndex,age:run.current.props.current.age,cause,
  role:run.bio.role,grade,title,score,props:{...run.current.props.current},wealth:run.bio.wealth,relationship:run.bio.relationship,
  children:run.bio.children,education:run.bio.education,attack:power,talents:[...run.owned],hidden:run.hidden.map(h=>h.name),
  log:structuredClone(run.log),worldYear:run.world.year,research:run.bio.research,
  impact:Math.round((run.bio.research+run.hidden.length*2)*12500),worldResearch:Math.min(25,run.bio.research+run.hidden.length),
  eventVersion:EVENT_VERSION,eventCount:Object.keys(run.eventState.history).length,causalBalances:causalTotals(run)};
 run.report=report;run.archive.push(report);
 if(run.archive.length>30)for(let i=0;i<run.archive.length-30;i++)run.archive[i]={...run.archive[i],log:[]};
 run.archive=run.archive.slice(-1000);run.profile=core.end(run.current,run.profile).profile;run.phase='dead';
}
export function simulateToEnd(run,maxSteps=2400){
 let n=0;
 while(!['dead','horizon','awakening'].includes(run.phase)&&n++<maxSteps){run.phase='running';advance(run);}
 return run.report;
}
export function restore(str){
 const parsed=decode(str);
 if(parsed?.version===legacy.VERSION)return legacy.restore(str);
 if(parsed?.version!==VERSION)throw Error('存档版本不正确。');
 const run=legacy.restore(encode({...parsed,version:legacy.VERSION}));run.version=VERSION;
 validateEvents(run);
 if(run.current.props.current.age!==run.eventState.life.age||run.lifeIndex!==run.eventState.life.index||run.lifeIndex<1)throw Error('人生与事件存档不同步。');
 return run;
}

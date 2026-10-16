// Browser-compatible JSON AST interpreter. No eval, Function, dynamic imports,
// network calls, talent-name dispatch, random text choice or non-finite numbers.
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);
const statNames=['strength','intelligence','constitution','spirit','charm','luck','family'];
const safePath = p => typeof p==='string' && /^[a-zA-Z][a-zA-Z0-9_.]*$/.test(p) && p.split('.').every(k=>!FORBIDDEN.has(k));
const mutable=/^(actor\.(stats\.(strength|intelligence|constitution|spirit|charm|luck|family)|wealth|health|trust|reputation|pressure|research|education|occupation|relationship|company)|world\.(anomaly|research|stability)|people\.(parents|friend|partner|child|grandchild|rival|professor)\.(present|alive|trust)|flags\.[A-Za-z][A-Za-z0-9_]*)$/;
const factKeys=['kind','actualOpponents','perceivedOpponents','bonus','memoryBonus','historySupport','canonicalParent','forcedSuccess','numeracy','truthful','credible','protection','deathRequested','deathAllowed','choice'];
const factsPath=p=>/^facts\./.test(p) && factKeys.includes(p.slice(6));
const finite=n=>{if(typeof n!=='number'||!Number.isFinite(n))throw Error('Expected finite number');return n;};
const boolean=b=>{if(typeof b!=='boolean')throw Error('Expected boolean condition');return b;};
const clone=x=>structuredClone(x);
export function read(state,path){
  if(!safePath(path))throw Error('Unsafe path: '+path);
  let value=state;
  for(const key of path.split('.')){
    if(!value||typeof value!=='object'||!Object.hasOwn(value,key))throw Error('Unknown reference: '+path);
    value=value[key];
  }
  return value;
}
function write(state,path,value,isRule=false){
  if(!safePath(path)||!(isRule?factsPath(path):mutable.test(path)))throw Error('Illegal write: '+path);
  if(typeof value==='number')finite(value);
  const parts=path.split('.');let parent=state;
  for(const part of parts.slice(0,-1)){
    if(!Object.hasOwn(parent,part))parent[part]={};
    parent=parent[part];
  }
  const key=parts.at(-1);
  if(Object.hasOwn(parent,key)&&typeof parent[key]!==typeof value)throw Error('Effect type mismatch: '+path);
  parent[key]=value;
}
function ledgerBalance(s,kind,subject){
  return s.causality.ledger.filter(e=>e.kind===kind&&(subject==='*'||e.subject===subject)).reduce((v,e)=>v+e.remaining,0);
}
export function evaluate(expr,state){
  if(expr===null||['number','boolean','string'].includes(typeof expr))return expr;
  if(!expr||Array.isArray(expr))throw Error('Invalid expression');
  if(Object.hasOwn(expr,'ref'))return read(state,expr.ref);
  const args=expr.args||[],v=i=>evaluate(args[i],state),n=i=>finite(v(i));
  switch(expr.op){
    case 'all':return args.every(x=>boolean(evaluate(x,state)));
    case 'any':return args.some(x=>boolean(evaluate(x,state)));
    case 'not':return !boolean(v(0));
    case 'eq':return v(0)===v(1);
    case 'ne':return v(0)!==v(1);
    case 'gt':return n(0)>n(1);case 'gte':return n(0)>=n(1);
    case 'lt':return n(0)<n(1);case 'lte':return n(0)<=n(1);
    case 'add':return finite(n(0)+n(1));case 'sub':return finite(n(0)-n(1));
    case 'mul':return finite(n(0)*n(1));
    case 'div':{const d=n(1);if(d===0)throw Error('Division by zero');return finite(n(0)/d);}
    case 'min':return Math.min(n(0),n(1));case 'max':return Math.max(n(0),n(1));
    case 'neg':return -n(0);
    case 'history':{
      const [id,scope,outcome]=args;
      const current=state.history[id];
      if(scope==='current')return !!current&&(outcome==='*'||current.outcome===outcome);
      const past=state.past.events[id];
      if(scope==='past')return !!past&&(outcome==='*'?past.count>0:(past.outcomes[outcome]||0)>0);
      throw Error('Unknown history scope');
    }
    case 'balance':return ledgerBalance(state,args[0],args[1]);
    default:throw Error('Unknown operator: '+expr.op);
  }
}
function effect(state,e,source,isRule=false){
  if(e.op==='set'||e.op==='add'){
    const value=evaluate(e.value,state);
    write(state,e.path,e.op==='set'?value:finite(finite(read(state,e.path))+finite(value)),isRule);
    return;
  }
  if(isRule)throw Error('Rules can only modify event facts');
  if(e.op==='grant'){
    const amount=finite(e.amount);if(amount<=0)throw Error('Invalid grant');
    state.causality.ledger.push({id:`L${state.life.index}:${source}:${state.causality.serial++}`,
      eventId:source,life:state.life.index,age:state.life.age,kind:e.kind,subject:e.subject,amount,remaining:amount});return;
  }
  if(e.op==='settle'){
    if(ledgerBalance(state,e.kind,e.subject)<e.amount)throw Error('Insufficient causal balance');
    let left=e.amount;const allocations=[];
    for(const entry of state.causality.ledger){
      if(entry.kind!==e.kind||(e.subject!=='*'&&entry.subject!==e.subject)||left<=0)continue;
      const used=Math.min(left,entry.remaining);entry.remaining-=used;left-=used;
      if(used)allocations.push({ledgerId:entry.id,amount:used});
    }
    state.causality.settlements.push({life:state.life.index,age:state.life.age,eventId:source,kind:e.kind,subject:e.subject,allocations});return;
  }
  if(e.op==='birth'){
    const person=state.people[e.person];
    if(person.present)throw Error('Duplicate birth: '+e.person);
    person.present=true;person.alive=true;person.bornAge=state.life.age;person.bornYear=state.world.year;return;
  }
  throw Error('Unknown effect: '+e.op);
}
function bound(s){
  for(const key of ['wealth','pressure','reputation','research','trust'])s.actor[key]=Math.max(0,finite(s.actor[key]));
  s.actor.health=Math.max(0,Math.min(100,finite(s.actor.health)));
  for(const key of statNames)s.actor.stats[key]=Math.max(0,finite(s.actor.stats[key]));
  for(const key of ['anomaly','research','stability'])s.world[key]=Math.max(0,Math.min(100,finite(s.world[key])));
}
function finiteTree(v){if(typeof v==='number')finite(v);else if(v&&typeof v==='object')for(const x of Object.values(v))finiteTree(x);}
const sortRules=(a,b)=>a.stage-b.stage||b.priority-a.priority||a.id.localeCompare(b.id,'en');
function context(state,event,bundle){
  const ctx={...state,facts:clone(event.facts)};
  const parents=event.requires.map(id=>state.history[id]);
  ctx.facts.historySupport=parents.filter(e=>e&&e.outcome!=='unavailable'&&e.outcome!=='setback').length;
  ctx.facts.canonicalParent=parents.every(e=>e?.canonical===true);
  ctx.rules={count:state.activeRules.length,conflictCount:0};
  const trace=[],conflicts=[],writes=new Map();
  for(const rule of bundle.ruleExamples.filter(r=>state.activeRules.includes(r.id)).sort(sortRules)){
    if(!boolean(evaluate(rule.when,ctx)))continue;
    const changes=[];
    for(const e of rule.effects){
      const before=read(ctx,e.path);effect(ctx,e,rule.id,true);const after=read(ctx,e.path);
      if(e.op==='set'){
        const prior=writes.get(e.path);
        if(prior&&prior.value!==after)conflicts.push({path:e.path,sources:[prior.rule,rule.id],values:[prior.value,after],resolution:'later_stage_wins'});
        writes.set(e.path,{rule:rule.id,value:after});
      }
      changes.push({path:e.path,before,after});
    }
    trace.push({ruleId:rule.id,changes});
  }
  ctx.rules.conflictCount=conflicts.length;
  return {ctx,trace,conflicts};
}
export function createState(bundle,{stats,seed='wanlv',ruleIds=[]}={}){
  const base=stats||{strength:4,intelligence:5,constitution:5,spirit:5,charm:4,luck:4,family:3};
  if(Object.keys(base).length!==7||!statNames.every(k=>Number.isInteger(base[k])&&base[k]>=1&&base[k]<=10)||Object.values(base).reduce((a,b)=>a+b,0)!==30)throw Error('Seven integer attributes, 1..10, sum 30 required');
  if(new Set(ruleIds).size!==ruleIds.length||ruleIds.some(id=>!bundle.ruleExamples.some(r=>r.id===id)))throw Error('Unknown/duplicate rule');
  const people={};
  for(const name of ['parents','friend','partner','child','grandchild','rival','professor'])people[name]={present:name==='parents',alive:true,trust:50,bornAge:-1,bornYear:-1};
  return {version:bundle.version,seed:String(seed),base:clone(base),life:{index:1,age:-1,status:'alive',deathCause:'',archived:false,epilogueComplete:false,pending:false},
    actor:{stats:clone(base),wealth:base.family*3,health:100,pressure:0,reputation:0,research:0,trust:50,education:'none',occupation:'child',relationship:'single',company:false},
    world:{year:-1,birthYear:0,anomaly:0,research:0,stability:80},people,flags:{deathPrevented:false},history:{},past:{total:0,events:{}},
    causality:{serial:0,ledger:[],settlements:[]},activeRules:[...ruleIds],log:[],archives:[]};
}
function eligibility(state,event,bundle){
  if(state.version!==bundle.version)throw Error('Data version mismatch');
  if(state.history[event.id])return false;
  if(event.phase==='alive'&&state.life.status!=='alive')return false;
  if(event.phase==='epilogue'&&state.life.status!=='dead')return false;
  if(event.age.anchor==='birth'&&(state.life.age<event.age.min||(event.age.max!==null&&state.life.age>event.age.max)))return false;
  if(event.requires.some(id=>!state.history[id]))return false;
  return boolean(evaluate(event.when,context(state,event,bundle).ctx));
}
function collectEvidence(expr,state,out=[]){
  if(!expr||typeof expr!=='object')return out;
  if(expr.ref)out.push({ref:expr.ref,value:clone(read(state,expr.ref))});
  if(expr.op==='history'||expr.op==='balance')out.push({op:expr.op,args:expr.args,value:evaluate(expr,state)});
  for(const arg of expr.args||[])collectEvidence(arg,state,out);
  return out;
}
function resolveUnsafe(state,event,bundle){
  if(!eligibility(state,event,bundle))return null;
  const {ctx,trace,conflicts}=context(state,event,bundle);
  const sorted=[...event.outcomes].sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));
  const considered=[];let chosen;
  for(const o of sorted){const matched=boolean(evaluate(o.when,ctx));considered.push({id:o.id,matched,evidence:collectEvidence(o.when,ctx)});if(matched){chosen=o;break;}}
  if(!chosen)throw Error('No outcome: '+event.id);
  // All edits, including ledger settlement, are atomic to callers.
  const next=state;const changes=[];
  for(const e of chosen.effects){
    const before=e.path?(e.path.startsWith('flags.')&&!Object.hasOwn(next.flags,e.path.slice(6))?null:clone(read(next,e.path))):null;
    // Outcome expressions may read rule-adjusted facts, but cannot write facts.
    if(e.op==='set'||e.op==='add'){
      const value=evaluate(e.value,{...next,facts:ctx.facts,rules:ctx.rules});
      effect(next,{...e,value},event.id);
    }else effect(next,e,event.id);
    bound(next);
    changes.push({op:e.op,...(e.path?{path:e.path,before,after:clone(read(next,e.path))}:{kind:e.kind||e.person})});
  }
  bound(next);finiteTree(next);
  const entry={eventId:event.id,life:state.life.index,age:state.life.age,year:state.world.year,outcome:chosen.id,
    canonical:chosen.canonical,text:chosen.text,parents:event.requires.map(id=>({eventId:id,outcome:state.history[id].outcome})),
    score:evaluate(event.calculation.score,ctx),threshold:event.calculation.threshold,
    rules:trace,conflicts,considered,changes};
  next.history[event.id]={outcome:chosen.id,canonical:chosen.canonical,age:state.life.age,life:state.life.index};
  next.log.push(entry);Object.assign(state,next);return entry;
}
export function resolveEvent(state,bundle,id){
  const event=bundle.events.find(e=>e.id===id);if(!event)throw Error('Unknown event: '+id);
  const next=clone(state),entry=resolveUnsafe(next,event,bundle);
  if(entry){checkDeath(next,bundle);if(next.life.status==='dead')finalizeLife(next,bundle);Object.assign(state,next);}return entry;
}
function checkDeath(state,bundle){
  if(state.life.status==='dead'||state.actor.health>0)return;
  const sample={facts:{...bundle.events[0].facts,kind:'death',deathRequested:true},requires:[]};
  const {ctx,trace,conflicts}=context(state,sample,bundle);
  const prevented=!ctx.facts.deathAllowed;
  state.log.push({system:'death_check',life:state.life.index,age:state.life.age,prevented,rules:trace,conflicts,cause:'健康耗尽'});
  if(prevented){state.actor.health=1;state.flags.deathPrevented=true;return;}
  state.life.status='dead';state.life.deathCause='健康耗尽（衰老、疾病或事件伤害累计）';
}
export function advanceYear(state,bundle,{budget=64,agingScale=1}={}){
  if(!Number.isInteger(budget)||budget<1||budget>1000)throw Error('Invalid execution budget');
  if(!Number.isFinite(agingScale)||agingScale<0)throw Error('Invalid ageing scale');
  const next=clone(state),newEntries=[];
  if(state.life.status==='dead')return {entries:[],pending:false,dead:true};
  if(!next.life.pending){
  next.life.age++;next.world.year=next.world.birthYear+next.life.age;
  // No arbitrary maximum age. Age changes health, and the same death gate is
  // used for ageing and events, so absolute death protection is respected.
  if(next.life.age>=60)next.actor.health-=agingScale*Math.max(0.1,(next.life.age-59)*0.08/(1+next.actor.stats.constitution/10));
  bound(next);checkDeath(next,bundle);
  }
  for(let i=0;i<budget&&next.life.status==='alive';i++){
    const candidates=bundle.events.filter(e=>e.phase==='alive'&&eligibility(next,e,bundle));
    candidates.sort((a,b)=>b.priority-a.priority||a.age.min-b.age.min||a.id.localeCompare(b.id,'en'));
    if(!candidates.length)break;
    newEntries.push(resolveUnsafe(next,candidates[0],bundle));checkDeath(next,bundle);
  }
  const pending=next.life.status==='alive'&&bundle.events.some(e=>e.phase==='alive'&&eligibility(next,e,bundle));
  next.life.pending=pending;
  if(next.life.status==='dead')finalizeLife(next,bundle);
  finiteTree(next);Object.assign(state,next);return {entries:newEntries,pending,dead:next.life.status==='dead'};
}
export function finalizeLife(state,bundle){
  if(state.life.status!=='dead')throw Error('Cannot finalize a living character');
  if(state.life.archived)return state.archives.at(-1);
  const next=clone(state);
  // Bounded, iterative epilogue; no recursive link execution or clock change.
  for(const e of bundle.events.filter(e=>e.phase==='epilogue').sort((a,b)=>a.id.localeCompare(b.id)))resolveUnsafe(next,e,bundle);
  next.life.epilogueComplete=true;
  const report={life:next.life.index,age:next.life.age,cause:next.life.deathCause,year:next.world.year,
    stats:clone(next.actor.stats),actor:clone(next.actor),eventCount:Object.keys(next.history).length,
    eventOutcomes:clone(next.history),unspentCausality:clone(next.causality.ledger.filter(e=>e.remaining>0)),rules:[...next.activeRules]};
  next.archives.push(report);next.life.archived=true;Object.assign(state,next);return report;
}
export function rebirth(state,bundle,{awakenedRuleId}={}){
  if(state.life.status!=='dead')throw Error('Rebirth requires actual death');
  if(awakenedRuleId&&!bundle.ruleExamples.some(r=>r.id===awakenedRuleId))throw Error('Unknown awakening rule');
  const archived=clone(state);finalizeLife(archived,bundle);
  const next=createState(bundle,{stats:state.base,seed:state.seed,ruleIds:[...new Set([...state.activeRules,...(awakenedRuleId?[awakenedRuleId]:[])])]});
  next.life.index=state.life.index+1;next.past=clone(state.past);
  for(const [id,record] of Object.entries(archived.history)){
    const p=next.past.events[id]||{count:0,outcomes:{}};p.count++;p.outcomes[record.outcome]=(p.outcomes[record.outcome]||0)+1;next.past.events[id]=p;next.past.total++;
  }
  next.world={...clone(state.world),year:state.world.year,birthYear:state.world.year+1};
  next.causality=clone(archived.causality);next.archives=clone(archived.archives);
  // Mutating the supplied state makes repeated rebirth calls fail after the
  // first commit; UI should persist this transaction with its awakening choice.
  Object.assign(state,next);return state;
}

const arities={all:[0,100],any:[0,100],not:[1,1],eq:[2,2],ne:[2,2],gt:[2,2],gte:[2,2],lt:[2,2],lte:[2,2],add:[2,2],sub:[2,2],mul:[2,2],div:[2,2],min:[2,2],max:[2,2],neg:[1,1],history:[3,3],balance:[2,2]};
export function validateBundle(bundle){
  if(bundle.version!=='wanlv-events/2.0.0'||!Array.isArray(bundle.events)||bundle.events.length!==1000)throw Error('Unsupported bundle/count');
  const ids=new Set(bundle.events.map(e=>e.id));if(ids.size!==1000)throw Error('Duplicate IDs');
  if(Array.from({length:1000},(_,i)=>'E'+String(i+1).padStart(4,'0')).some(id=>!ids.has(id)))throw Error('Missing source ID');
  const ruleIds=new Set(bundle.ruleExamples.map(e=>e.id));if(ruleIds.size!==bundle.ruleExamples.length)throw Error('Duplicate rule ID');
  const sample=createState(bundle);sample.facts=clone(bundle.events[0].facts);sample.rules={count:0,conflictCount:0};
  const walk=(node,depth=0)=>{
    if(depth>40)throw Error('AST too deep');
    if(node===null||['boolean','string'].includes(typeof node))return;
    if(typeof node==='number'){finite(node);return;}
    if(!node||Array.isArray(node))throw Error('Invalid expression node');
    if(node.ref){if(Object.keys(node).length!==1)throw Error('Invalid ref');read(sample,node.ref);return;}
    const a=arities[node.op];if(!a||!Array.isArray(node.args)||node.args.length<a[0]||node.args.length>a[1])throw Error('Invalid expression arity');
    if(node.op==='history'&&(!ids.has(node.args[0])||!['current','past'].includes(node.args[1])))throw Error('Invalid history reference');
    for(const v of node.args)walk(v,depth+1);
  };
  const effects=(list,rule=false)=>{
    if(!Array.isArray(list))throw Error('Effects must be an array');
    for(const e of list){
      if(e.op==='set'||e.op==='add'){
        if(!safePath(e.path)||!(rule?factsPath(e.path):mutable.test(e.path)))throw Error('Illegal effect path');
        if(!e.path.startsWith('flags.'))read(sample,e.path);walk(e.value);
      }else if(rule)throw Error('Invalid rule effect');
      else if(e.op==='grant'||e.op==='settle'){
        if(typeof e.kind!=='string'||typeof e.subject!=='string'||!Number.isFinite(e.amount)||e.amount<=0)throw Error('Invalid causal effect');
      }else if(e.op==='birth'){if(!['child','grandchild'].includes(e.person))throw Error('Invalid birth');}
      else throw Error('Unknown effect operator');
    }
  };
  const graph=new Map();
  for(const e of bundle.events){
    if(!['alive','epilogue'].includes(e.phase)||!Number.isInteger(e.age.min)||e.age.min<0||e.age.max!==null&&e.age.max<e.age.min)throw Error('Invalid age/phase');
    if(e.repeat.maxPerLife!==1||e.requires.some(id=>!ids.has(id))||e.links.some(l=>!ids.has(l.target)||l.enqueue!==false))throw Error('Invalid links/repetition');
    if(new Set(e.outcomes.map(o=>o.id)).size!==e.outcomes.length||new Set(e.outcomes.map(o=>o.priority)).size!==e.outcomes.length)throw Error('Duplicate outcomes/priorities');
    const sorted=[...e.outcomes].sort((a,b)=>b.priority-a.priority);
    if(sorted.at(-1).when!==true||sorted.slice(0,-1).some(o=>o.when===true))throw Error('Last fallback required');
    graph.set(e.id,e.requires);walk(e.when);walk(e.calculation.score);
    for(const o of e.outcomes){walk(o.when);effects(o.effects);}
    for(const l of e.links)walk(l.when);
    if(Object.keys(e.facts).some(k=>!factKeys.includes(k)))throw Error('Unknown event fact');
  }
  const done=new Set(),active=new Set();
  function visit(id){if(active.has(id))throw Error('Hard prerequisite cycle');if(done.has(id))return;active.add(id);for(const p of graph.get(id))visit(p);active.delete(id);done.add(id);}
  for(const id of ids)visit(id);
  for(const r of bundle.ruleExamples){walk(r.when);effects(r.effects,true);}
  finiteTree(bundle);return {events:ids.size,outcomes:bundle.events.reduce((n,e)=>n+e.outcomes.length,0),rules:ruleIds.size,hardGraphAcyclic:true};
}
export function serialize(state){finiteTree(state);return JSON.stringify(state);}
export function restore(text,bundle){
  const parsed=JSON.parse(text,(key,value)=>{if(FORBIDDEN.has(key))throw Error('Unsafe save key');return value;});
  if(parsed.version!==bundle.version)throw Error('Data version mismatch');
  finiteTree(parsed);
  const model=createState(bundle,{stats:parsed.base,seed:parsed.seed,ruleIds:parsed.activeRules});
  function shape(template,v){
    if(template===null)return;
    if(Array.isArray(template)){if(!Array.isArray(v))throw Error('Invalid save array');return;}
    if(typeof template==='object'){if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid save object');for(const k of Object.keys(template))shape(template[k],v[k]);return;}
    if(typeof v!==typeof template)throw Error('Invalid save scalar');
  }
  shape(model,parsed);
  if(!Number.isInteger(parsed.life.age)||parsed.life.age<-1||!Number.isInteger(parsed.life.index)||parsed.life.index<1||!['alive','dead'].includes(parsed.life.status))throw Error('Invalid life state');
  if(parsed.actor.health<0||parsed.actor.health>100||parsed.actor.wealth<0)throw Error('Invalid bounded state');
  for(const [id,r]of Object.entries(parsed.history)){const e=bundle.events.find(e=>e.id===id);if(!e||!e.outcomes.some(o=>o.id===r.outcome))throw Error('Invalid save history');}
  const ledgerIds=new Set();
  for(const l of parsed.causality.ledger){if(ledgerIds.has(l.id)||typeof l.id!=='string'||!Number.isFinite(l.amount)||!Number.isFinite(l.remaining)||l.remaining<0||l.remaining>l.amount)throw Error('Invalid causal ledger');ledgerIds.add(l.id);}
  return parsed;
}

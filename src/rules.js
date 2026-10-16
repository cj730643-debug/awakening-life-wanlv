import {hiddenPatterns} from './data.js';
function components(edges) {
 const graph=new Map();for(const [a,b]of edges){if(!graph.has(a))graph.set(a,[]);if(!graph.has(b))graph.set(b,[]);graph.get(a).push(b);}
 let cursor=0;const ids=new Map(),low=new Map(),stack=[],active=new Set(),out=[];
 function visit(v){ids.set(v,cursor);low.set(v,cursor++);stack.push(v);active.add(v);for(const w of graph.get(v)){if(!ids.has(w)){visit(w);low.set(v,Math.min(low.get(v),low.get(w)));}else if(active.has(w))low.set(v,Math.min(low.get(v),ids.get(w)));}if(low.get(v)===ids.get(v)){const group=[];let w;do{w=stack.pop();active.delete(w);group.push(w);}while(w!==v);if(group.length>1||graph.get(v).includes(v))out.push(group.sort());}}
 for(const v of graph.keys())if(!ids.has(v))visit(v);return out;
}
export function detectRules(items,context={age:0}){
 const rules=items.flatMap(t=>(t.conditions||[]).every(c=>(c.minAge??0)<=context.age&&(c.maxAge??Infinity)>=context.age)?t.rules.map(r=>({...r,source:t.id})):[]);
 const found=[];const emit=(kind,nodes,evidence)=>{const signature=[...new Set(nodes)].sort().join(',');const pattern=hiddenPatterns.find(p=>p.kind===kind&&p.signature===signature);found.push({id:pattern?.id||kind+':'+signature,kind,signature,name:pattern?.name||({strict:'关系悖论',positive:'因果闭环',negative:'负反馈共鸣',fixed:'恒变悖论',bound:'边界悖论',negation:'因果否定'}[kind]||'规则共鸣'),description:pattern?.description||'这些规则在相同条件下产生了可识别的结构。',effect:pattern?.effect||'stability',rarity:pattern?.rarity||'paradox',sources:[...new Set(evidence.map(r=>r.source))]});};
 const parent=new Map();const root=x=>parent.has(x)?root(parent.get(x)):x;
 for(const r of rules.filter(r=>r.op==='eq')){const a=root(r.left),b=root(r.right);if(a!==b)parent.set(a,b);}
 const strict=rules.filter(r=>r.op==='gt'||r.op==='lt');const edges=strict.map(r=>r.op==='gt'?[root(r.left),root(r.right)]:[root(r.right),root(r.left)]);
 for(const group of components(edges))emit('strict',strict.filter(r=>group.includes(root(r.left))&&group.includes(root(r.right))).flatMap(r=>[r.left,r.right]),strict.filter(r=>group.includes(root(r.left))&&group.includes(root(r.right))));
 for(const fixed of rules.filter(r=>r.op==='fixed'))for(const change of rules.filter(r=>r.op==='change'&&r.left===fixed.left))emit('fixed',[fixed.left],[fixed,change]);
 for(const cap of rules.filter(r=>r.op==='cap'))for(const breaker of rules.filter(r=>r.op==='break'&&r.left===cap.left&&r.right>=cap.right))emit('bound',[cap.left],[cap,breaker]);
 const flows=rules.filter(r=>r.op==='grow'||r.op==='decrease');
 for(const group of components(flows.map(r=>[r.left,r.right]))){const inside=flows.filter(r=>group.includes(r.left)&&group.includes(r.right));const negative=inside.filter(r=>r.op==='decrease').length%2===1;const gain=inside.reduce((v,r)=>v*(r.gain??1),1);if(negative)emit('negative',group,inside);else if(gain>1)emit('positive',group,inside);}
 for(const a of rules.filter(r=>r.op==='require'))for(const b of rules.filter(r=>r.op==='forbid'&&r.left===a.left))emit('negation',[a.left],[a,b]);
 for(const a of rules.filter(r=>r.op==='reflect'))for(const b of rules.filter(r=>r.op==='reduce'&&r.left===a.left))emit('reflection',[a.left],[a,b]);
 for(const a of rules.filter(r=>r.op==='proportional'))for(const b of rules.filter(r=>r.op==='inverse'&&r.left===a.left))emit('compensation',[a.left],[a,b]);
 return [...new Map(found.map(p=>[p.id,p])).values()];
}
export function factors(run){
 const props=run.current.props.current;const f={learning:1,research:1,health:1,recovery:1,stress:1,social:1,income:1,spending:1,fortune:1,lifespan:1,combat:1,attack:props.strength*10,speed:props.constitution};
 for(const t of run.catalog){const stacks=run.stacks[t.id]||1;f.recovery*=1+0.02*(stacks-1);for(const r of t.rules){if(r.op==='multiply')f[r.target]*=Math.pow(r.value,stacks);if(r.op==='proportional')f.income*=1+Math.min(run.bio.wealth,1000)/2000;if(r.op==='inverse')f.income*=1+20/(run.bio.wealth+20);if(r.op==='gt'&&r.left.endsWith('damage'))f.attack*=1.1;if(r.op==='reflect')f.combat*=1.1;if(r.op==='reduce')f.health*=1.1;}}
 const values={power:props.strength,speed:props.constitution,constitution:props.constitution,lifespan:70,education:props.intelligence,wealth:run.bio.wealth,trust:props.charm,status:props.charm,fortune:props.luck,opportunity:props.luck,memory:props.intelligence,focus:props.spirit,pain:Math.max(0,10-props.constitution)};
 const channel={power:'combat',speed:'combat',constitution:'health',lifespan:'lifespan',education:'learning',wealth:'income',trust:'social',status:'social',fortune:'fortune',opportunity:'fortune',memory:'learning',focus:'research',pain:'stress'};
 for(const t of run.catalog)for(const r of t.rules){if(r.op==='grow'||r.op==='decrease'){const k=channel[r.right];if(k)f[k]*=Math.max(0.1,1+(r.op==='decrease'?-1:1)*Math.min(100,Math.abs(values[r.left]||1))*0.003*(r.gain||1));}if(r.op==='fixed')f.recovery*=1.01;if(r.op==='change')f.learning*=1.01;if(r.op==='gt'&&!r.left.endsWith('damage'))f.fortune*=1.02;if(r.op==='cap'&&r.left==='power')f.attack=Math.min(f.attack,r.right*10);if(r.op==='break'&&r.left==='power')f.attack=Math.max(f.attack,(r.right+0.1)*10);if(r.op==='cap'&&r.left==='speed')f.speed=Math.min(f.speed,r.right);if(r.op==='break'&&r.left==='speed')f.speed=Math.max(f.speed,r.right+0.1);if(r.op==='forbid'&&r.left==='death'){f.immortal=true;f.absoluteImmortal=true;}}
 for(const p of run.hidden){if(['attack','power'].includes(p.effect))f.attack=Infinity;else if(p.effect==='speed')f.speed=Infinity;else if(p.effect==='immortality')f.immortal=true;else if(p.effect==='perception')f.fortune*=1.3;else if(p.effect==='stability')f.stress*=0.5;else if(p.effect==='defense'){f.health*=3;f.combat*=2;}else if(p.effect in f)f[p.effect]*=3;}
 return f;
}

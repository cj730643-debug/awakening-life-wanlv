import * as core from '../packages/core/src/game.ts';
import {propsEffect} from '../packages/core/src/state.ts';
import {pickWeight} from '../packages/vitex/index.ts';
import {talents as registry,events,ages} from './registry.js';
import {talents,hiddenPatterns} from './data.js';
import {detectRules,factors} from './rules.js';
for(const t of talents)registry.set(t.id,t);
export const VERSION='wanlv-html-1.0';
export const labels={strength:'力量',intelligence:'智慧',constitution:'体质',spirit:'精神',charm:'魅力',luck:'幸运',money:'家境'};
export const defaults={strength:5,intelligence:5,constitution:5,spirit:5,charm:4,luck:3,money:3};
export const categories={body:'身体',cognition:'智慧',spirit:'精神',social:'社交',wealth:'财富',luck:'幸运',longevity:'寿命',causality:'因果'};
export const rarityLabels={common:'普通',rare:'稀有',unusual:'罕见',special:'特殊',paradox:'悖论',epic:'史诗',myth:'神话',world:'世界级'};
const E=(id,event,effect={},include='',importance=0,extra={})=>events.set(id,{id,event,effect,include,importance,grade:0,...extra});
E(1,'这一年平静流逝，生活留下细小而真实的痕迹。');
E(10,'你在白塔城出生。初始属性之外，命运仍是一张白纸。',{},'AGE=0',2);
E(11,'你开始辨认家人的声音，世界有了最初的轮廓。',{},'AGE=1',1);
E(13,'你学会表达自己的想法，开始好奇窗外的世界。',{INT:0.2},'AGE=3',1);
E(21,'你进入社区学校，第一次在课本上读到「天律」。',{INT:0.4},'AGE=6',2);
E(22,'你在学校表现优异，老师开始为你提供额外指导。',{INT:0.6},'AGE=12&INT>=6',1);
E(23,'你和同学一起成长，慢慢找到自己擅长的事情。',{CHR:0.3},'AGE=12',1);
E(25,'你开始为升学做准备，家庭资源影响着能走多远。',{INT:0.3},'AGE=15',1);
E(101,'你考入白塔大学，系统学习自然科学与天律基础。',{INT:0.8},'AGE=18&INT>=6&MNY>=3',2,{role:'大学生',education:'大学'});
E(102,'凭借优异成绩，你获得助学金，继续接受高等教育。',{INT:0.9},'AGE=18&INT>=8&MNY<3',2,{role:'受资助的大学生',education:'大学'});
E(103,'你进入职业学校，在实践中学习谋生的本领。',{STR:0.3,CON:0.3},'AGE=18',2,{role:'职校学生',education:'职业教育'});
E(201,'你完成学业，带着专业知识踏入社会。',{INT:0.4},'AGE=22&EVT?[101,102]',2);
E(202,'你完成技能训练，开始独立工作。',{STR:0.3},'AGE=22&EVT?[103]',2);
E(301,'你进入天律研究机构，成为一名初级研究员。',{INT:0.5},'AGE=25&INT>=8&EVT?[101,102]',2,{role:'天律研究员',salary:3.8});
E(302,'你加入工程团队，把所学知识用于城市建设。',{INT:0.3},'AGE=25&INT>=6',2,{role:'工程师',salary:3.0});
E(303,'你凭借良好的身体条件，成为专业运动训练员。',{STR:0.5},'AGE=25&STR>=6',2,{role:'运动训练员',salary:2.6});
E(304,'你进入社区服务机构，逐渐成为人们信任的协调者。',{CHR:0.5},'AGE=25&CHR>=6',2,{role:'社区协调员',salary:2.5});
E(305,'你找到稳定的工作，靠认真劳动逐步改善生活。',{SPR:0.2},'AGE=25',2,{role:'城市职员',salary:2.0});
E(401,'你与一位理解你的人相遇，关系在日常相处中慢慢加深。',{SPR:0.5},'AGE>=22&AGE<=38',2,{relationship:'恋爱'});
E(402,'你们决定共同生活，建立自己的家庭。',{SPR:0.6},'AGE>=25&AGE<=42&EVT?[401]',2,{relationship:'已婚'});
E(403,'一个新生命加入家庭，你第一次认真思考自己留下的世界。',{SPR:0.4},'AGE>=27&AGE<=45&EVT?[402]',2,{child:true});
E(410,'工作经验渐渐积累，你承担了更重要的职责。',{INT:0.25,CHR:0.2},'AGE>=30&AGE<=58',1,{promotion:true});
E(411,'你在一次研究中取得进展，成果被天律院收录。',{INT:0.5},'AGE>=30&INT>=10&EVT?[301]',2,{research:1});
E(412,'多年投入获得认可，你成为所在领域的重要人物。',{CHR:0.7,SPR:0.5},'AGE>=40&INT>=14',2,{research:2});
E(420,'你找到适合自己的生活节奏，健康与收入都有所改善。',{CON:0.2,SPR:0.2},'AGE>=20',0);
E(421,'一次小病打断了生活，好在及时治疗后逐渐恢复。',{CON:-0.3},'AGE>=10',1);
E(422,'生活成本上升，你重新安排了家庭预算。',{SPR:-0.1},'AGE>=22',0);
E(423,'你遇到一个意想不到的好机会，积蓄有所增加。',{},'AGE>=20',1,{windfall:5});
E(424,'邻里和朋友的帮助，让这一年少了几分艰难。',{CHR:0.1,SPR:0.2},'AGE>=10',0);
E(425,'战争波及生活，城市秩序受到冲击。',{SPR:-0.3},'AGE>=18',1);
E(426,'你参与城市防卫，身体与意志经受了考验。',{STR:0.2},'AGE>=22&AGE<=55&STR>=6',2,{role:'城市防卫队员',salary:2.8});
E(430,'你从日常工作中退休，把时间交给家人与自己。',{SPR:0.4},'AGE=60',2,{retire:true});
E(440,'天律院注意到了你身上的规则异常，开始提供长期观察与保护。',{SPR:0.3},'AGE>=18',2,{institute:true});
E(441,'你学会与异常天律共存，将自己的经历留给后来的研究者。',{INT:0.3},'AGE>=30',1,{research:1});
E(450,'身体机能逐渐下降，你开始减少远行与劳累。',{CON:-0.2},'AGE>=70',1);
E(900,'身体的衰老终于走到终点。你在熟悉的地方平静离世。',{LIF:-1},'AGE>=65',3,{death:'自然衰老'});
E(901,'一场疾病突破了身体的防线。治疗未能挽回你的生命。',{LIF:-1},'AGE>=1',3,{death:'疾病'});
E(902,'一次无法预见的事故，提前结束了这段人生。',{LIF:-1},'AGE>=18',3,{death:'事故'});
E(903,'战争夺去了你的生命。档案记下了这场冲突与它的代价。',{LIF:-1},'AGE>=18',3,{death:'战争'});
E(904,'异常生物袭击了城市。你未能在这场灾难中生还。',{LIF:-1},'AGE>=18',3,{death:'怪物袭击'});
E(905,'精神无法继续承载不断冲突的天律，悖论最终失去控制。',{LIF:-1},'AGE>=18',3,{death:'悖论失控'});
const worldScript=[
 [10,'天律院发现新的觉醒现象。','天律研究进度',5],[25,'北方边境发现异常生物。','怪物威胁',15],[40,'两国爆发边境战争，避难人口涌入城市。','战争程度',35],[60,'世界首次公开确认悖论者存在。','天律研究进度',10],[80,'天律院开始研究第101条天律。','天律研究进度',8],[100,'新一代天律研究框架开始用于医疗与城市建设。','科技水平',10]
];
export function emptyProfile(){return {times:0,talents:new Set(),events:new Set(),achievements:new Set()};}
function hash(seed){let h=2166136261;for(const c of String(seed)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
export function random(run){return (max=1,min=0)=>{run.rng=(run.rng+0x6D2B79F5)>>>0;let t=run.rng;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);const u=((t^(t>>>14))>>>0)/4294967296;return Math.floor(u*(max-min+1))+min;};}
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export function validateAllocation(a){return Object.keys(defaults).every(k=>Number.isInteger(a[k])&&a[k]>=1&&a[k]<=10)&&Object.keys(defaults).reduce((s,k)=>s+a[k],0)===30;}
export function createRun(name,base,seed,account){if(!validateAllocation(base))throw Error('七项属性必须为1～10的整数，总和为30。');const run={version:VERSION,seed:String(seed||123456),rng:hash(seed||123456),name:String(name||'林夜').trim().slice(0,20)||'林夜',base:{...base},lifeIndex:1,owned:[],stacks:{},hidden:[],discovered:[],profile:account?.profile||emptyProfile(),archive:account?.archive||[],world:{year:0,'世界和平度':82,'科技水平':35,'觉醒者数量':12,'战争程度':8,'怪物威胁':5,'天律研究进度':3,'社会稳定度':80},worldHistory:[],city:'白塔城',phase:'running',candidates:[],log:[],report:null,autoPause:true};beginLife(run);return run;}
function beginLife(run){run.current=core.start(run.profile,{...run.base},run.owned).state;run.bio={role:'婴儿',education:'尚未入学',relationship:'未婚',children:0,wealth:run.base.money*3,salary:0,research:0,institute:false,retired:false};run.birthYear=run.world.year+1;run.log=[];run.phase='running';run.report=null;run.candidates=[];run.catalog=run.owned.map(id=>talents.find(t=>t.id===id));run.currentDerived=factors(run);}
export function reveal(run){const age=Math.max(run.current.props.current.age,0);const signature=run.catalog.map(t=>t.id+':'+(t.conditions||[]).every(c=>(c.minAge??0)<=age&&(c.maxAge??Infinity)>=age)).join('|');if(run.lastRuleSignature===signature)return [];run.lastRuleSignature=signature;const found=detectRules(run.catalog,{age});const fresh=found.filter(p=>!run.hidden.some(h=>h.id===p.id));run.hidden.push(...fresh);run.discovered=[...new Set([...run.discovered,...found.map(p=>p.id)])];return fresh;}
export function offer(run){if(run.phase!=='dead'&&run.phase!=='awakening')return [];if(run.candidates.length)return run.candidates;const rnd=random(run);const remaining=talents.filter(t=>!run.owned.includes(t.id));let pool=remaining.length>=3?remaining:[...talents];const result=[];for(let i=0;i<3;i++){const id=pickWeight(pool.map(t=>[t.id,[89,10,1,0.15][t.grade]]),rnd);result.push(id);pool=pool.filter(t=>t.id!==id);}run.candidates=result;run.phase='awakening';return result;}
export function choose(run,id){if(run.phase!=='awakening'||!run.candidates.includes(id))throw Error('这次觉醒已结束或候选无效。');run.stacks[id]=(run.stacks[id]||0)+1;if(!run.owned.includes(id))run.owned.push(id);run.lifeIndex++;beginLife(run);const fresh=reveal(run);return fresh;}
function worldTick(run,rnd){run.world.year++;for(const key of ['世界和平度','科技水平','战争程度','怪物威胁','天律研究进度','社会稳定度'])run.world[key]=clamp(run.world[key]+rnd(2,-2),0,100);run.world['觉醒者数量']+=rnd(3,0);const script=worldScript.find(([year])=>year===run.world.year);let entry=null;if(script){run.world[script[2]]=clamp(run.world[script[2]]+script[3],0,100);entry={year:run.world.year,text:script[1]};}else if(run.world.year>100&&run.world.year%25===0){entry={year:run.world.year,text:['天律院公布新一轮世界规则观测结果。','多个城市建立联合天律研究中心。','边境异常被重新评估，社会开始调整应对策略。'][rnd(2,0)]};run.world['天律研究进度']=clamp(run.world['天律研究进度']+3,0,100);}if(entry)run.worldHistory.push(entry);run.worldHistory=run.worldHistory.slice(-200);return entry;}
export function advance(run){
 if(run.phase==='dead'||run.phase==='awakening'||run.phase==='horizon')return null;
 const rnd=random(run),age=run.current.props.current.age+1;const worldEvent=worldTick(run,rnd);let f=factors(run);const p=run.current.props.current;const change={};
 if(age>=4&&age<=24){change.intelligence=Math.min(1.5,(0.04+p.money*0.006)*f.learning);change.constitution=Math.min(0.15,0.025*f.health);}
 if(age>=18&&age<=55){change.strength=0.018*f.combat;change.spirit=0.015/f.stress;}
 if(age>65&&!f.immortal){change.constitution=-(age-60)*0.006/f.health;change.strength=-0.04;}
 run.current.props=propsEffect(run.current.props,change);
 const q=run.current.props.current;const pool=[];const add=(id,w=1)=>{if(w>0&&Number.isFinite(w))pool.push([id,id<900?Math.min(50,w):w]);};
 events.get(420).effect={CON:age<=55?0.2:0,SPR:0.2};
 const stage={0:[10],1:[11],3:[13],6:[21],12:q.intelligence>=6?[22]:[23],15:[25],18:q.intelligence>=6&&q.money>=3?[101]:q.intelligence>=8?[102]:[103],22:run.current.events.has(101)||run.current.events.has(102)?[201]:[202],25:q.intelligence>=8&&(run.current.events.has(101)||run.current.events.has(102))?[301]:q.intelligence>=6?[302]:q.strength>=6?[303]:q.charm>=6?[304]:[305],60:[430]};
 if(stage[age])stage[age].forEach(id=>add(id,100));else{
 add(1,12);if(age>=20){add(420,5*f.recovery);add(422,3*f.spending);add(423,1.5*f.fortune);add(424,3*f.social);}
 if(age>=6)add(421,1/(f.health*(1+q.money/10)));
 if(age>=22&&age<=38&&!run.current.events.has(401))add(401,(q.charm/5)*f.social);
 if(age>=25&&age<=42&&run.current.events.has(401)&&!run.current.events.has(402))add(402,3*f.social);
 if(age>=27&&age<=45&&run.current.events.has(402)&&!run.current.events.has(403))add(403,2);
 if(age>=30&&age<=58)add(410,2*f.learning);
 if(age>=30&&run.current.events.has(301))add(411,2*f.research);
 if(age>=40&&!run.current.events.has(412))add(412,f.research);
 if(age>=18&&run.hidden.length&&!run.bio.institute)add(440,8);
 if(age>=30&&run.bio.institute)add(441,f.research);
 if(run.world['战争程度']>35&&age>=18){add(425,4);if(!run.current.events.has(426))add(426,2);}
 if(age>=70)add(450,4);
 }
 const pureImmortal=f.absoluteImmortal||run.hidden.some(h=>h.kind==='negation'&&h.signature==='death');
 if(!pureImmortal){const protection=1+Math.min(q.luck,25)/25;
 if(age>=65&&!f.immortal)add(900,Math.max(0,(age-62)/(22*f.lifespan)-Math.max(q.constitution,0)/20)**2*3);
 if(age>=1)add(901,0.06/(f.health*(1+q.money/10)*protection));
 if(age>=18){add(902,0.025/(f.fortune*protection));if(run.world['战争程度']>40)add(903,run.world['战争程度']/500/(f.attack===Infinity?200:1+q.strength/10));if(run.world['怪物威胁']>25)add(904,run.world['怪物威胁']/800/(f.attack===Infinity?200:1+q.strength/10));if(run.hidden.length>2)add(905,0.02*run.hidden.length*f.stress/(1+q.spirit));}}
 ages.set(age,{age,event:[pool]});
 const result=core.next(run.current,run.profile,rnd);run.current=result.state;const texts=[];let importance=0,death=null;
 for(const id of result.events){const e=events.get(id);texts.push(e.event);importance=Math.max(importance,e.importance||0);if(e.role)run.bio.role=e.role;if(e.education)run.bio.education=e.education;if(e.salary)run.bio.salary=e.salary;if(e.relationship)run.bio.relationship=e.relationship;if(e.child)run.bio.children++;if(e.research)run.bio.research+=e.research;if(e.institute)run.bio.institute=true;if(e.promotion)run.bio.salary*=1.12;if(e.windfall)run.bio.wealth+=e.windfall;if(e.retire){run.bio.retired=true;run.bio.role='退休的'+run.bio.role;run.bio.salary*=0.45;}if(e.death)death=e.death;}
 if(age===6){run.bio.education='基础教育';run.bio.role='小学生';}if(age===12)run.bio.role='中学生';if(age===15)run.bio.role='高中生';if(age===22)run.bio.role='求职者';
 for(const key of Object.keys(labels)){const value=run.current.props.current[key];if(!Number.isFinite(value))throw Error('属性出现非有限数值：'+key);if(value<0)run.current.props=propsEffect(run.current.props,{[key]:-value});}
 if(age>=22){const income=run.bio.salary*f.income*(1+q.intelligence/100+q.strength/150);const expense=(0.9+run.bio.children*0.2)*f.spending;run.bio.wealth=Math.max(0,run.bio.wealth+income-expense);}
 if(worldEvent){texts.push('【世界】'+worldEvent.text);importance=Math.max(importance,2);}
 if(age===0&&run.owned.length)texts.push('已有天赋随轮回保留：'+run.catalog.map(t=>t.name).join('、')+'。');
 const fresh=reveal(run);if(fresh.length){texts.push(...fresh.map(h=>'发现隐藏天赋：'+h.name));importance=3;}
 run.currentDerived=factors(run);const keyAges=[0,1,3,6,12,15,18,22,25,30,35,40,50,60,70,80,90,100];
 const entry={age,year:run.world.year,text:texts.join('\n'),importance,role:run.bio.role,death};if(importance||keyAges.includes(age)||age%10===0)run.log.push(entry);run.log=run.log.slice(-180);
 if(result.end){finish(run,death||'生命终止');}else if(age>=(run.horizonAge||200)){run.phase='horizon';}else if(run.autoPause&&(importance>=2||keyAges.includes(age))&&age>0)run.phase='paused';
 return entry;
}
function finish(run,cause){if(run.report)return;const score=core.summary(run.current,run.profile).summary;const power=run.currentDerived.attack;const grade=power===Infinity?'SSS':run.bio.research>=6?'SS':score>190?'S':score>140?'A':score>100?'B':'C';const title=run.hidden.length?'天律的见证者':run.bio.research>2?'求知者':run.current.props.current.age>=85?'长夜守望者':'尘世旅人';const report={id:run.seed+'-'+run.birthYear,seed:run.seed,name:run.name,life:run.lifeIndex,age:run.current.props.current.age,cause,role:run.bio.role,grade,title,score,props:{...run.current.props.current},wealth:run.bio.wealth,relationship:run.bio.relationship,children:run.bio.children,education:run.bio.education,attack:power,talents:[...run.owned],hidden:run.hidden.map(h=>h.name),log:[...run.log],worldYear:run.world.year,research:run.bio.research,impact:Math.round((run.bio.research+run.hidden.length*2)*12500),worldResearch:Math.min(25,run.bio.research+run.hidden.length)};run.report=report;run.archive.push(report);if(run.archive.length>30)for(let i=0;i<run.archive.length-30;i++)run.archive[i]={...run.archive[i],log:[]};run.archive=run.archive.slice(-1000);run.profile=core.end(run.current,run.profile).profile;run.phase='dead';}
export function simulateToEnd(run,maxSteps=1200){let n=0;while(!['dead','horizon','awakening'].includes(run.phase)&&n++<maxSteps){run.phase='running';advance(run);}return run.report;}
export function encode(value){return JSON.stringify(value,(k,v)=>v instanceof Set?{$type:'Set',values:[...v]}:v instanceof Map?{$type:'Map',values:[...v]}:typeof v==='number'&&!Number.isFinite(v)?{$type:'Number',value:v===Infinity?'Infinity':v===-Infinity?'-Infinity':'NaN'}:v);}
export function decode(str){return JSON.parse(str,(k,v)=>v&&v.$type==='Set'?new Set(v.values):v&&v.$type==='Map'?new Map(v.values):v&&v.$type==='Number'?v.value==='Infinity'?Infinity:v.value==='-Infinity'?-Infinity:NaN:v);}
export function restore(str){const run=decode(str);if(!run||run.version!==VERSION||!run.base||!validateAllocation(run.base)||!Array.isArray(run.owned)||run.owned.some(id=>!registry.has(id))||!run.current?.props?.current||!(run.current.events instanceof Set)||!run.bio||!run.world||!Array.isArray(run.hidden)||!Array.isArray(run.archive)||!Array.isArray(run.log)||!Array.isArray(run.worldHistory)||!(run.profile?.talents instanceof Set)||!(run.profile?.events instanceof Set)||!run.stacks||!Number.isInteger(run.rng)||!Number.isInteger(run.lifeIndex)||!['running','paused','dead','awakening','horizon'].includes(run.phase)||Object.keys(labels).some(k=>!Number.isFinite(run.current.props.current[k]))||Object.values(run.world).some(v=>!Number.isFinite(v))||!Number.isFinite(run.bio.wealth))throw Error('存档版本或结构不正确。');if(run.phase==='awakening'&&(!Array.isArray(run.candidates)||run.candidates.length!==3||new Set(run.candidates).size!==3||run.candidates.some(id=>!registry.has(id))))throw Error('觉醒候选数据不完整。');run.catalog=run.owned.map(id=>registry.get(id));if(run.phase==='running')run.phase='paused';return run;}
export {talents,hiddenPatterns,detectRules,factors};

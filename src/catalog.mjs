// Original data for 万律世界. Definitions are emitted into category JSON files.
const talents=[];
function add(id,name,description,category,rules,rarity='common') {
 talents.push({id,name,description,category,rarity,grade:{common:0,rare:1,unusual:2,special:3}[rarity],formula:rules.map(r=>r.formula).join('；'),conditions:[{minAge:0}],effects:rules.filter(r=>r.op==='multiply'),relations:rules.filter(r=>r.op!=='multiply'),rules,conflictTags:[],synergyTags:[],max:1,condition:'AGE=0'});
}
const relation=(op,left,right,extra={})=>({op,left,right,...extra,formula:op==='gt'?`${left} > ${right}`:op==='grow'?`${left} ↑ → ${right} ↑`:op==='decrease'?`${left} ↑ → ${right} ↓`:op==='fixed'?`Δ${left} = 0`:op==='change'?`Δ${left} ≠ 0`:op==='cap'?`${left} ≤ ${right}`:op==='break'?`${left} > ${right}`:op==='require'?`${left} → true`:op==='forbid'?`${left} → false`:op==='reflect'?'received_damage → attacker_damage':op==='reduce'?'received_damage *= 0.01':op==='proportional'?'income ∝ wealth':'income ∝ 1 / (wealth + 1)'});
const pairs=[
 ['left_hand_bias','左手偏胜','左手造成的伤害始终略高于右手。','right_hand_bias','右手偏胜','右手造成的伤害始终略高于左手。','body',relation('gt','left_damage','right_damage'),relation('gt','right_damage','left_damage')],
 ['left_leg_bias','左腿偏胜','左腿的推进力量略高于右腿。','right_leg_bias','右腿偏胜','右腿的推进力量略高于左腿。','body',relation('gt','left_stride','right_stride'),relation('gt','right_stride','left_stride')],
 ['left_eye_bias','左眼偏清','左眼识别距离略高于右眼。','right_eye_bias','右眼偏清','右眼识别距离略高于左眼。','body',relation('gt','left_vision','right_vision'),relation('gt','right_vision','left_vision')],
 ['left_ear_bias','左耳偏敏','左耳听觉阈值优势略高。','right_ear_bias','右耳偏敏','右耳听觉阈值优势略高。','body',relation('gt','left_hearing','right_hearing'),relation('gt','right_hearing','left_hearing')],
 ['memory_fixed','印象留存','既有记忆的强度倾向保持不变。','memory_change','印象更新','既有记忆的强度每年必须发生变化。','cognition',relation('fixed','memory'),relation('change','memory')],
 ['sleep_fixed','作息恒常','睡眠周期倾向保持不变。','sleep_change','作息适应','睡眠周期必须适应当年的环境。','body',relation('fixed','sleep_cycle'),relation('change','sleep_cycle')],
 ['heat_fixed','体温恒常','体温基准不随环境变化。','heat_change','体温适应','体温基准必须随环境调整。','body',relation('fixed','temperature'),relation('change','temperature')],
 ['stress_fixed','情绪定锚','压力基准保持恒定。','stress_change','情绪流动','压力基准每年发生调整。','spirit',relation('fixed','stress_baseline'),relation('change','stress_baseline')],
 ['power_limit','力量边界','力量被限制在世界的基础上限内。','power_break','力量微破','力量必须略微超过世界基础上限。','causality',relation('cap','power',100),relation('break','power',100)],
 ['speed_limit','速度边界','速度遵守世界的基础上限。','speed_break','速度微破','速度必须略微超过基础上限。','causality',relation('cap','speed',100),relation('break','speed',100)],
 ['power_speed','强健步伐','力量增加会带动速度增加。','speed_power','疾行强身','速度增加会带动力量增加。','body',relation('grow','power','speed',{gain:1.05}),relation('grow','speed','power',{gain:1.05})],
 ['body_life','强身延年','体质增加会略微延长寿命。','life_body','长寿养身','寿命增长会略微强化体质。','longevity',relation('grow','constitution','lifespan',{gain:1.02}),relation('grow','lifespan','constitution',{gain:1.02})],
 ['study_wealth','学以致富','教育积累会改善财富增长。','wealth_study','富以养学','财富增加会带来更多教育积累。','wealth',relation('grow','education','wealth',{gain:1.02}),relation('grow','wealth','education',{gain:1.02})],
 ['trust_status','信任成名','信任增加会提升社会地位。','status_trust','名望取信','社会地位提升会增加他人信任。','social',relation('grow','trust','status',{gain:1.02}),relation('grow','status','trust',{gain:1.02})],
 ['luck_chance','幸运生机','幸运增加会带来更多机会。','chance_luck','机遇添运','机会增加会提高幸运偏移。','luck',relation('grow','fortune','opportunity',{gain:1.01}),relation('grow','opportunity','fortune',{gain:1.01})],
 ['memory_focus','记忆聚焦','记忆积累会延长专注。','focus_memory','专注留痕','专注延长会改善记忆。','cognition',relation('grow','memory','focus',{gain:1.03}),relation('grow','focus','memory',{gain:1.03})],
 ['death_boundary','生命终界','生命归零时必须进入死亡。','death_refusal','归零拒绝','死亡判定必须被拒绝。','causality',relation('require','death'),relation('forbid','death')],
 ['damage_return','伤害回响','受到的原始伤害会对来源产生回响。','damage_reduce','伤害稀释','收到的伤害只有百分之一生效。','causality',relation('reflect','damage'),relation('reduce','damage')],
 ['wealth_positive','财富增殖','财富越多，收入增长越快。','wealth_inverse','贫穷反哺','财富越少，额外收入补偿越明显。','wealth',relation('proportional','wealth','income'),relation('inverse','wealth','income')],
 ['pain_focus','痛觉聚神','痛感上升会提高专注程度。','focus_pain','静心缓痛','专注提高会降低痛感。','spirit',relation('grow','pain','focus',{gain:0.9}),relation('decrease','focus','pain',{gain:0.9})],
];
pairs.forEach((p,i)=>{const rarity=i<8?'common':i<14?'rare':i<16?'unusual':'special';add(p[0],p[1],p[2],p[6],[p[7]],rarity);add(p[3],p[4],p[5],p[6],[p[8]],rarity);talents.at(-1).conflictTags=[p[0]];talents.at(-2).conflictTags=[p[3]];});
const ordinary={
 body:[['heart','心肺略强','health',1.05],['bone','骨骼略硬','health',1.04],['muscle','肌肉易长','combat',1.06],['recover','恢复略快','recovery',1.06],['pain','疼痛略低','stress',0.95],['fatigue','耐劳些许','recovery',1.05],['balance','平衡略稳','combat',1.04],['grip','握力略强','combat',1.05],['resist','适应寒暑','health',1.05],['rest','睡眠高效','recovery',1.08],['digest','消化略好','health',1.04],['flexible','关节灵活','combat',1.03],['breath','呼吸平稳','stress',0.95],['wound','伤口易合','recovery',1.07],['immune','免疫略强','health',1.06]],
 cognition:[['memory','记忆略强','learning',1.08],['learning','学习略快','learning',1.07],['space','空间敏感','research',1.06],['number','数字敏感','research',1.06],['language','语言易学','learning',1.06],['logic','推理清晰','research',1.07],['curiosity','好奇不减','learning',1.05],['observe','观察细微','research',1.05],['review','温故知新','learning',1.06],['connect','善于联想','research',1.05]],
 spirit:[['will','意志略强','stress',0.92],['emotion','情绪易复','recovery',1.06],['calm','压力略低','stress',0.94],['concentrate','专注稍长','research',1.06],['patient','耐心稍多','learning',1.05],['resilient','挫折耐受','stress',0.94],['steady','精神稳定','stress',0.92],['hope','微光不灭','recovery',1.05]],
 social:[['trusted','容易取信','social',1.08],['friend','容易交友','social',1.07],['help','易获帮助','social',1.06],['listen','善于倾听','social',1.05],['speak','表达清楚','social',1.05],['kind','善意回响','social',1.06],['cooperate','合作顺畅','income',1.04],['first','初见亲和','social',1.05]],
 wealth:[['salary','收入略高','income',1.08],['frugal','花钱略少','spending',0.94],['business','商机敏感','income',1.06],['budget','预算有序','spending',0.95],['negotiate','议价略优','income',1.04],['save','储蓄习惯','spending',0.93],['work','劳动高效','income',1.06],['assets','资产耐心','income',1.05]],
 luck:[['avoid','避开小厄','fortune',1.07],['good','小遇好事','fortune',1.08],['windfall','意外微财','income',1.04],['route','岔路得宜','fortune',1.05],['timing','时机略佳','fortune',1.06],['turn','转机微现','fortune',1.05]],
 longevity:[['long','寿命略长','lifespan',1.05],['disease','疾病略少','health',1.08],['age','衰老稍缓','lifespan',1.04],['routine','规律有益','health',1.06],['sleep_age','安眠养年','lifespan',1.03]]
};
for(const [category,rows] of Object.entries(ordinary))for(const [id,name,target,value]of rows)add('minor_'+id,name,`${{health:'身体抗病能力',combat:'身体行动能力',recovery:'恢复效率',stress:'压力积累',learning:'学习效率',research:'研究效率',social:'社交机会',income:'收入效率',spending:'生活支出',fortune:'正向随机偏移',lifespan:'自然寿命基准'}[target]}${value<1?'略微降低':'略微提高'}。`,category,[{op:'multiply',target,value,formula:`${target} *= ${value.toFixed(2)}`}]);
if(talents.length!==100)throw new Error('Expected 100 talents, got '+talents.length);
export {talents,pairs};
export const hiddenPatterns=[
 ['strict','left_damage,right_damage','双极悖论','两种伤害必须互相超越，攻击被提升为无界量。','attack'],
 ['strict','left_stride,right_stride','无界行者','互相超越的步伐突破运动边界。','speed'],
 ['strict','left_vision,right_vision','双视奇点','相互优先的视野形成超常感知。','perception'],
 ['strict','left_hearing,right_hearing','万籁回环','相互领先的听觉展开异常声域。','perception'],
 ['fixed','memory','永恒新知','不变与更新同时成立，记忆获得双重记录。','learning'],
 ['fixed','sleep_cycle','无眠安息','睡眠的恒定与适应产生额外恢复。','recovery'],
 ['fixed','temperature','恒变之躯','变化与恒定重组身体的环境适应。','health'],
 ['fixed','stress_baseline','静海潮汐','稳定与流动共存，精神承受力提高。','stability'],
 ['bound','power','界外之力','上限与突破发生冲突，力量约束解除。','power'],
 ['bound','speed','越界瞬行','速度上限不再适用。','speed'],
 ['positive','power,speed','因果闭环','力量与速度互相推动，产生无界增长。','attack'],
 ['positive','constitution,lifespan','永生循环','体质与寿命相互促进，衰老不再决定终点。','immortality'],
 ['positive','education,wealth','知识复利','教育与财富相互滋养，社会贡献持续扩展。','research'],
 ['positive','status,trust','众望回声','信任与地位相互强化。','social'],
 ['positive','fortune,opportunity','机运涡旋','机会与幸运构成正反馈。','fortune'],
 ['positive','focus,memory','思维永动','专注与记忆形成自我强化网络。','research'],
 ['negation','death','死亡拒绝','生命的终结要求被另一条天律拒绝。','immortality'],
 ['reflection','damage','零伤反噬','伤害先留下回响，再被稀释。','defense'],
 ['compensation','wealth','财富悖论','富足与贫穷都带来额外收入。','income'],
 ['negative','focus,pain','静痛平衡','痛感与专注构成稳定的负反馈。','stability']
].map(([kind,signature,name,description,effect],i)=>({id:'hidden_'+(i+1),kind,signature,name,description,effect,rarity:i<10?'paradox':i<16?'epic':i<19?'myth':'world'}));

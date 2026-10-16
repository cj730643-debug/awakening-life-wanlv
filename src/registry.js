export const talents = new Map();
export const events = new Map();
export const ages = new Map();
export const AchievementOpportunity={Start:'START',Trajectory:'TRAJECTORY',Summary:'SUMMARY',End:'END'};
// Retain the upstream achievement pipeline with data-driven opportunities.
export const achievements=new Map([
 [1,{id:1,name:'初见万律',description:'完成第一段人生。',opportunity:'End',condition:'AGE>=0'}],
 [2,{id:2,name:'百岁见证',description:'见证一个世纪。',opportunity:'Summary',condition:'AGE>=100'}]
].map(([id,a])=>[id,{...a,opportunity:a.opportunity.toUpperCase()}]));

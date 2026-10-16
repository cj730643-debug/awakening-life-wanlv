// Dependency-free validator for the JSON Schema keywords used by the supplied
// Draft 2020-12 schema. This is deliberately not a general JSON Schema library.
export function checkSchema(data,schema){
  const fail=(path,message)=>{throw Error(`${path}: ${message}`);};
  const type=(v,t)=>t==='null'?v===null:t==='array'?Array.isArray(v):t==='object'?v!==null&&typeof v==='object'&&!Array.isArray(v):t==='integer'?Number.isInteger(v):t==='number'?typeof v==='number'&&Number.isFinite(v):typeof v===t;
  function visit(v,s,path){
    if(s.$ref){const target=s.$ref.split('/').slice(1).reduce((a,k)=>a[k],schema);return visit(v,target,path);}
    if(s.anyOf||s.oneOf){const alternatives=s.anyOf||s.oneOf;let matches=0;for(const x of alternatives){try{visit(v,x,path);matches++;}catch{}}
      if(s.oneOf?matches!==1:matches===0)fail(path,'schema alternative mismatch');return;}
    if(s.type&&!(Array.isArray(s.type)?s.type:[s.type]).some(t=>type(v,t)))fail(path,'invalid type');
    if(Object.hasOwn(s,'const')&&v!==s.const)fail(path,'const mismatch');
    if(s.enum&&!s.enum.includes(v))fail(path,'enum mismatch');
    if(typeof v==='number'){
      if(!Number.isFinite(v))fail(path,'non-finite');
      if(s.minimum!==undefined&&v<s.minimum)fail(path,'below minimum');
      if(s.exclusiveMinimum!==undefined&&v<=s.exclusiveMinimum)fail(path,'below exclusive minimum');
    }
    if(typeof v==='string'&&s.pattern&&!new RegExp(s.pattern).test(v))fail(path,'pattern mismatch');
    if(Array.isArray(v)){
      if(s.minItems!==undefined&&v.length<s.minItems||s.maxItems!==undefined&&v.length>s.maxItems)fail(path,'invalid array size');
      if(s.uniqueItems&&new Set(v.map(x=>JSON.stringify(x))).size!==v.length)fail(path,'non-unique array');
      if(s.items)for(let i=0;i<v.length;i++)visit(v[i],s.items,`${path}[${i}]`);
    }
    if(v&&typeof v==='object'&&!Array.isArray(v)){
      for(const key of s.required||[])if(!Object.hasOwn(v,key))fail(path,'missing '+key);
      for(const [key,value]of Object.entries(v)){
        if(s.properties?.[key])visit(value,s.properties[key],path+'.'+key);
        else if(s.additionalProperties===false)fail(path,'unknown '+key);
      }
    }
  }
  visit(data,schema,'$');return true;
}

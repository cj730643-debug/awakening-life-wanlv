// Buildless adapter: only the recipe subset used by the retained upstream core.
export function produce<T>(value:T, recipe:(draft:T)=>unknown):T {
 const draft=structuredClone(value); const result=recipe(draft);
 return (result===undefined?draft:result) as T;
}
export function enableMapSet() {}


import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const mem = new Map();
globalThis.localStorage = { getItem:k => mem.get(k) ?? null, setItem:(k,v) => mem.set(k,v) };
globalThis.document = { addEventListener() {} };
globalThis.fetch = async path => ({json:async()=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)))});
const { BUILTIN, plan, snapshotScheme, encodeScheme, decodeScheme, DEFAULT_PARAMS, readWaterLab, sameScheme } = await import('../js/schemes.js');
const { loadGrinders, grinderById, settingFor } = await import('../js/grinders.js');
const { store } = await import('../js/store.js');
const { validateScheme } = await import('../js/validation.js');
const { grindFor, currentScheme, currentWater, restoreBrewSettings } = await import('../js/core.js');
const { BrewClock } = await import('../js/timer.js');
await loadGrinders();
const initial = structuredClone(store.get());
const reset = () => store.update(s=>{for(const k of Object.keys(s)) delete s[k]; Object.assign(s,structuredClone(initial));});

test('K-Ultra base 0.7.0, washed +2 clicks, all other processing at base',()=>{
 const g=grinderById('1zpresso-k-ultra');
 for(const sc of BUILTIN) assert.equal(settingFor(g,sc.grindUm).label, sc.id.startsWith('w') ? '0.7.2':'0.7.0');
});
test('3078 plans: mass conserved, contiguous stages, time for pouring and swirl',()=>{
 let count=0;
 for(const sc of BUILTIN) for(let dose=12;dose<=40;dose+=.5) for(const acid of [-1,0,1]) for(const body of [-1,0,1]) {
  const p=plan(sc,dose,{acid,body}); count++;
  assert.equal(p.steps.reduce((a,s)=>a+s.add,0),p.total);
  p.steps.forEach((s,i)=>{
   assert.ok(s.add>0); assert.equal(s.pourSec,s.add/6);
   assert.ok(s.e-s.s>=s.pourSec+(s.spin?4:0));
   if(i) assert.equal(s.s,p.steps[i-1].e);
  });
 }
 assert.equal(count,3078);
});
test('duration scales the pouring part; base timing and waiting remain',()=>{
 const sc=BUILTIN[0], a=plan(sc,14), b=plan(sc,28), c=plan(sc,12);
 assert.deepEqual(a.steps.map(s=>s.s),[0,35,70,105]);
 for(let i=0;i<a.steps.length;i++) {
  assert.equal(b.steps[i].pourSec,a.steps[i].pourSec*2);
  for(const x of [b,c]) assert.ok(Math.abs((x.steps[i].e-x.steps[i].s-x.steps[i].pourSec)-(a.steps[i].e-a.steps[i].s-a.steps[i].pourSec))<1.01);
 }
});
test('manual recipe retains timing at reference dose after sharing and snapshot',()=>{
 const p=plan(BUILTIN[0],28);
 const sc={...BUILTIN[0],referenceDose:28,pourEnd:p.brewEnd,steps:p.steps.map(s=>({at:s.s,frac:s.add/p.total,name:s.name,spin:s.spin,hint:s.hint}))};
 for(const saved of [sc,snapshotScheme(sc),decodeScheme(encodeScheme(sc))]) assert.deepEqual(plan(saved,28).steps.map(s=>[s.s,s.e]),p.steps.map(s=>[s.s,s.e]));
 const old=snapshotScheme(BUILTIN[0]); delete old.referenceDose;
 assert.ok(sameScheme(old,snapshotScheme(BUILTIN[0])));
});
test('invalid recipes and links are rejected',()=>{
 const sc=structuredClone(BUILTIN[0]); sc.steps[1].at=0;
 assert.throws(()=>validateScheme(sc));
 assert.throws(()=>decodeScheme(encodeScheme(sc)));
 const params={...BUILTIN[0],mode:'params',params:{...DEFAULT_PARAMS,shares:[0,60,65]}};
 assert.throws(()=>validateScheme(params));
});
test('import is atomic, rejects malformed data and deduplicates within the file',()=>{
 reset(); const before=store.exportJSON();
 const bad={app:'bloomline',beans:[{id:'one',lot:'test'}],schemes:[{id:'broken'}]};
 assert.throws(()=>store.importJSON(JSON.stringify(bad)));
 assert.equal(store.exportJSON().replace(/"exported": "[^"]+"/,''),before.replace(/"exported": "[^"]+"/,''));
 const good={app:'bloomline',beans:[{id:'one',lot:'test'},{id:'one',lot:'duplicate'}]};
 assert.equal(store.importJSON(JSON.stringify(good)),1);
 assert.equal(store.importJSON(JSON.stringify(good)),0);
 assert.equal(store.get().beans.length,1);
 assert.throws(()=>store.importJSON('{"app":"bloomline","settings":{"__proto__":{}}}'));
 const saved=store.exportJSON(); assert.equal(store.importJSON(saved),0);
});
test('repeat restores grinder, grind and water without changing calibration; clears unavailable bean',()=>{
 reset(); store.update(s=>{s.calibration['1zpresso-k-ultra']=30;s.settings.beanId='unrelated';s.beans=[{id:'unrelated',lot:'other',grindUm:15},{id:'old',done:true}];});
 const before=structuredClone(store.get().calibration);
 const b={schemeId:'base',dose:14,brewer:'v60',grinderId:'1zpresso-k-ultra',um:70*7.6,beanId:'old',waterProfile:{name:'Saved',gh:43.5,kh:20}};
 assert.ok(restoreBrewSettings(b,'base').some(x=>x.includes('Пачка')));
 assert.equal(store.get().settings.beanId,null);
 assert.equal(grindFor(currentScheme(),14).set.label,'0.7.0');
 assert.equal(currentWater().name,'Saved');
 assert.deepEqual(store.get().calibration,before);
 store.update(s=>s.calibration['1zpresso-k-ultra']+=7.6);
 assert.equal(grindFor(currentScheme(),14).set.label,'0.7.1');
 store.update(s=>s.settings.dose=18);
 assert.notEqual(currentWater().name,'Saved');
});
test('custom grinder snapshot and legacy water preset can be restored',()=>{
 reset(); const custom={name:'Test',filter:30,espresso:10,step:1};
 const b={dose:14,brewer:'v60',grinderId:'custom',customGrinder:custom,um:532,waterLabel:'Melbourne · GH 50 · KH 20'};
 assert.deepEqual(restoreBrewSettings(b,'base'),[]);
 assert.deepEqual(store.get().settings.custom,custom);
 assert.equal(grindFor(currentScheme(),14).set.label,'30');
 assert.equal(currentWater().name,'Melbourne');
});
test('Water Lab invalid/null hardness falls back safely',()=>{
 mem.set('owl-v1',JSON.stringify({gh:null,kh:20}));assert.equal(readWaterLab(),null);
 mem.set('owl-v1',JSON.stringify({gh:'bad',kh:20}));assert.equal(readWaterLab(),null);
 mem.set('owl-v1',JSON.stringify({gh:50,kh:20}));assert.equal(readWaterLab().gh,50);
 mem.delete('owl-v1');
});
test('clock records fresh action time even when no animation frame runs, pause behavior preserved',()=>{
 let time=1000,id=0;const old=Date.now; Date.now=()=>time;
 globalThis.requestAnimationFrame=()=>++id; globalThis.cancelAnimationFrame=()=>{};
 try { const c=new BrewClock({onTick(){},onBoundary(){}});c.start();time=4500;assert.equal(c.now(),3.5);time=5500;c.pause();assert.equal(c.elapsed,4.5);time=99000;assert.equal(c.now(),4.5);c.start();time+=1500;assert.equal(c.now(),6);c.reset();assert.equal(c.elapsed,0); }
 finally {Date.now=old;}
});
test('service worker preserves other apps and serves an internally consistent version',async()=>{
 const handlers={},deleted=[],cached={html:true},network=[];
 const cache={match:async()=>cached,put:async()=>{},addAll:async()=>{}};
 const scope={URL,Request,self:{location:{href:'https://example.test/fold-and-pour/sw.js'},clients:{claim:async()=>{}},addEventListener:(k,fn)=>handlers[k]=fn},caches:{keys:async()=>['water-lab-v1','bloomline-2026-11-01-1','fold-and-pour-old','fold-and-pour-2026-11-02-1'],delete:async k=>deleted.push(k),open:async()=>cache},fetch:async r=>{network.push(r);return {ok:true,clone(){return this;}};}};
 vm.runInNewContext(readFileSync(new URL('../sw.js',import.meta.url),'utf8'),scope);
 let done;handlers.activate({waitUntil:p=>done=p});await done;assert.deepEqual(deleted,['fold-and-pour-old']);
 handlers.fetch({request:{method:'GET',url:'https://example.test/fold-and-pour/js/app.js'},respondWith:p=>done=p});assert.equal(await done,cached);assert.equal(network.length,0);
});

// Выполняем тот же код переходов с тестовыми часами и элементами экрана.
function brewRuntime(waitTap=false, scheme=BUILTIN[0], dose=14) {
 const source=readFileSync(new URL('../js/brew.js',import.meta.url),'utf8');
 const runtime=source.slice(source.indexOf('const newRun ='),source.indexOf('async function startClock()'));
 const nodes=new Map(); const node=sel=>{
  if(!nodes.has(sel)) nodes.set(sel,{textContent:'',hidden:false,style:{},classList:{toggle(){}}});
  return nodes.get(sel);
 };
 const spins=[],finish=[];
 const sandbox={P:plan(scheme,dose),CTX:{waitTap},phase:'running',root:{},drainedAt:null,
  clock:{running:true,elapsed:0,now(){return this.elapsed;}},
  $:node,dial:{set(){},spin:s=>spins.push(s)},alertMode:()=> 'off',cue(){},t:k=>k,fmt:String,
  finish:at=>finish.push(at),};
 vm.createContext(sandbox);
 vm.runInContext(runtime+'\nlet RUN = newRun(); globalThis.api = {onBoundary, pourNext, update, state:()=>RUN, spinAt};',sandbox);
 return {...sandbox,nodes,spins,finish};
}
test('automatic progression needs no pour confirmations and enters every stage',()=>{
 const r=brewRuntime();
 r.api.onBoundary(34.9,35,false);assert.equal(r.api.state().cur,1);
 r.api.onBoundary(35,70,false);assert.equal(r.api.state().cur,2);
 r.api.onBoundary(70,105,false);assert.equal(r.api.state().cur,3);
 r.api.update(105);assert.equal(r.nodes.get('#btn-next').hidden,true);assert.equal(r.nodes.get('#btn-drained').hidden,false);
});
test('swirl occurs once at estimated pour completion, scaled by portion mass',()=>{
 for(const dose of [14,28]) {
  const r=brewRuntime(false,BUILTIN.find(s=>s.id==='wdense'),dose);
  const at=r.api.spinAt(0);assert.equal(at,r.P.steps[0].add/6);
  r.api.onBoundary(0,at-.1,false);assert.equal(r.spins.length,0);
  r.api.onBoundary(at-.1,at,false);assert.deepEqual(r.spins,['gentle']);
  r.api.onBoundary(at,at+.1,false);assert.equal(r.spins.length,1);
 }
});
test('manual mode waits, one press advances and accidental double press is ignored',()=>{
 const r=brewRuntime(true);r.api.onBoundary(0,40,false);assert.equal(r.api.state().cur,0);
 r.clock.elapsed=40;r.api.pourNext();assert.equal(r.api.state().cur,1);assert.equal(r.api.state().at[1],40);
 r.api.pourNext();assert.equal(r.api.state().cur,1);
 r.api.onBoundary(40,80,false);assert.equal(r.api.state().cur,1);
 r.clock.elapsed=80;r.api.pourNext();assert.equal(r.api.state().cur,2);
});
test('background catch-up skips stale swirl signals; agreed timeout remains',()=>{
 const r=brewRuntime();r.api.onBoundary(0,90,true);assert.equal(r.api.state().cur,2);assert.equal(r.spins.length,0);
 r.api.onBoundary(90,r.P.drawEnd+120,true);assert.deepEqual(r.finish,[null]);
});

import test from 'node:test';
import assert from 'node:assert/strict';

const mem = new Map();
globalThis.localStorage = {getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v)};
const legacy = JSON.stringify({v:1,settings:{onboarded:true,dose:18,grinderId:'1zpresso-k-ultra'},beans:[{id:'legacy-bean',lot:'Legacy coffee',grindUm:7.6}],schemes:[],journal:[],calibration:{'1zpresso-k-ultra':15.2}});

test('first launch copies legacy data without changing the Bloomline store', async()=>{
 mem.set('bloomline-v1',legacy);
 const {store} = await import('../js/store.js?migration');
 assert.equal(store.get().settings.dose,18);
 assert.equal(store.get().beans[0].lot,'Legacy coffee');
 assert.ok(mem.has('fold-and-pour-v1'));
 store.update(s=>s.settings.dose=22);
 assert.equal(JSON.parse(mem.get('fold-and-pour-v1')).settings.dose,22);
 assert.equal(mem.get('bloomline-v1'),legacy);
 const {store:reloaded}=await import('../js/store.js?reload');
 assert.equal(reloaded.get().settings.dose,22);
});

test('new backups use new app id; both old and new backups can be imported',async()=>{
 const {store}=await import('../js/store.js?migration');
 const exported=store.exportJSON();
 assert.equal(JSON.parse(exported).app,'fold-and-pour');
 assert.equal(store.importJSON(exported),0);
 assert.equal(store.importJSON(JSON.stringify({app:'bloomline',v:1,beans:[{id:'from-backup',lot:'Older backup'}]})),1);
 assert.equal(store.get().beans.find(x=>x.id==='from-backup').lot,'Older backup');
 assert.equal(mem.get('bloomline-v1'),legacy);
});

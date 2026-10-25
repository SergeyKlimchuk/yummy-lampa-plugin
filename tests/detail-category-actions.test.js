'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('src/ui-detail.js','utf8');
const start=source.indexOf('        function toggleDetailListState('),end=source.indexOf('        function detailListIcon',start);
let resolve,reject,requests=[],published=[],notices=[],updates=[],account={user_id:7,login:'demo'},token='one';
function request(name,args){requests.push({name,args});return new Promise((a,b)=>{resolve=a;reject=b;});}
const panel={attr:()=>panel};
const c={console:{error:()=>{}},Date,document:{},Promise,listMutationPending:false,destroyed:false,
 LampaYaniAuth:{get:()=>account,token:()=>token},Lampa:{Noty:{show:x=>notices.push(x)}},
 t:x=>x,hasYummyList:(card,id)=>card.yani_list_id===id,updateDetailListPanel:(p,card)=>updates.push({pending:c.listMutationPending,list:card.yani_list_id,fav:card.yani_is_favorite}),
 deps:{onListChanged:(card,patch,owner)=>{published.push(patch);c.LampaYaniCardModel.commitListState(card,patch,owner);}}};
c.window=c;
vm.runInNewContext(fs.readFileSync('src/ui-card-model.js','utf8'),c);
c.LampaYaniApi={addToList:(...args)=>request('add',args),removeFromList:(...args)=>request('remove',args),addFavorite:(...args)=>request('favorite',args),removeFavorite:(...args)=>request('unfavorite',args)};
vm.runInNewContext(source.slice(start,end),c);
const flush=()=>Promise.resolve().then(()=>{}).then(()=>{}).then(()=>{});
(async()=>{
 const card={yani_id:9,yani_list_id:1,yani_is_favorite:true};
 c.toggleDetailListState(card,{id:2},panel);c.toggleDetailListState(card,{id:0},panel);
 assert.strictEqual(requests.length,1,'rapid repeated category clicks must not queue conflicting writes');
 assert.strictEqual(card.yani_list_id,1,'membership is not changed before the server confirms');
 assert.strictEqual(updates.at(-1).pending,true);
 resolve();await flush();assert.strictEqual(card.yani_list_id,2);assert.strictEqual(card.yani_is_favorite,true);
 assert.strictEqual(published.at(-1).listId,2);
 assert.strictEqual(notices.length,0,'successful category change confirms in place without flashing a toast');
 c.toggleDetailListState(card,{id:2},panel);assert.strictEqual(requests.at(-1).name,'remove');resolve();await flush();assert.strictEqual(card.yani_list_id,null);
 c.toggleDetailListState(card,{favorite:true},panel);assert.strictEqual(requests.at(-1).name,'unfavorite');resolve();await flush();assert.strictEqual(card.yani_is_favorite,false);assert.strictEqual(card.yani_list_id,null);
 c.toggleDetailListState(card,{id:0},panel);resolve();await flush();assert.strictEqual(card.yani_list_id,0,'watching id0 must not be mistaken for no membership');
 c.toggleDetailListState(card,{id:1},panel);reject(new Error('offline'));await flush();assert.strictEqual(card.yani_list_id,0,'failure keeps previous confirmed state');assert.strictEqual(c.listMutationPending,false);
 const before=published.length;c.toggleDetailListState(card,{id:2},panel);account={user_id:8,login:'other'};token='two';resolve();await flush();assert.strictEqual(published.length,before,'old account completion must not update current account');assert.strictEqual(card.yani_list_id,0);
 account={user_id:7,login:'demo'};token='three';c.toggleDetailListState(card,{id:5},panel);c.destroyed=true;const visible=updates.length;resolve();await flush();assert.strictEqual(updates.length,visible,'closed detail must not update its DOM');assert.strictEqual(published.at(-1).listId,5,'a confirmed remote write remains visible when search is reopened');
 console.log('Detail category actions passed: confirmation, removal, favorites, duplicate clicks, error, owner change, closed view');
})().catch(e=>{console.error(e);process.exitCode=1;});

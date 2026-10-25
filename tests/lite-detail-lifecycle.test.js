'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const source=name=>fs.readFileSync(path.join(__dirname,'../src',name),'utf8');
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function flush(){return Promise.resolve().then(()=>{}).then(()=>{}).then(()=>{}).then(()=>{});}
function environment(){
 const timers=new Map();let id=0,normalized=0,removed=0,owns=true;const calls=[];
 function view(){const v={length:1,jquery:true,0:{},find:()=>({length:0,first:()=>({length:0})}),attr:()=>v,on:()=>v,off:()=>v,text:()=>v,remove:()=>{removed++;return v;},append:()=>v,empty:()=>v};return v;}
 const context={window:{},console:{error:()=>{},warn:()=>{}},Promise,document:{removeEventListener:()=>{},addEventListener:()=>{}},$:view,setTimeout:fn=>{timers.set(++id,fn);return id;},clearTimeout:key=>timers.delete(key),Lampa:{Scroll:function(options){const node=view();this.minus=()=>{};this.render=()=>node;this.destroy=()=>{calls.push('scroll-destroy');};this.append=()=>{calls.push('append');};},Controller:{add:()=>calls.push('controller-add'),toggle:()=>calls.push('controller-toggle')},Activity:{own:()=>owns,replace:()=>calls.push('replace')}},LampaYaniUiUtils:{detailRouteId:()=>7},LampaYaniNavigation:{createScope:()=>({bind:()=>{},target:()=>null,restore:()=>null,destroy:()=>calls.push('focus-destroy')})}};
 context.window=context;
 vm.runInNewContext(source('ui-detail.js')+'\n'+source('ui-trailers.js'),context);
 return {context,calls,timers,setOwn:value=>{owns=value;},normalized:()=>normalized,normalize:()=>{normalized++;return {};},removed:()=>removed};
}
(async()=>{
 for(const rejection of [false,true]){
  const env=environment(),request=deferred();env.context.LampaYaniApi={detail:()=>request.promise};
  const comp=env.context.LampaYaniDetail.create({card:{yani_id:7}}, {t:x=>x,getYummyId:x=>x.yani_id,toCard:env.normalize});
  comp.activity={loader:x=>env.calls.push('loader:'+x),toggle:()=>env.calls.push('toggle')};
  comp.create();assert.strictEqual(env.timers.size,1,'detail must own one loading timeout');
  comp.destroy();assert.strictEqual(env.timers.size,0,'destroy must cancel loading timeout');
  const before=env.calls.slice();if(rejection)request.reject(new Error('network'));else request.resolve({response:{title:'Late'}});await flush();
  assert.deepStrictEqual(env.calls,before,'late detail response must not paint, toggle or stop another activity loader');
  assert.strictEqual(env.normalized(),0,'late detail response must not spend CPU normalizing hidden content');
 }
 for(const rejection of [false,true]){
  const env=environment(),request=deferred();
  const trailers=env.context.LampaYaniTrailers.create({t:x=>x,api:{trailers:()=>request.promise}});
  const comp=new trailers.Component({card:{yani_id:7}});comp.activity={loader:x=>env.calls.push('loader:'+x),toggle:()=>env.calls.push('toggle')};
  comp.create();comp.destroy();const before=env.calls.slice();
  if(rejection)request.reject(new Error('network'));else request.resolve({response:[{url:'https://youtu.be/abcdefghijk'}]});await flush();
  assert.deepStrictEqual(env.calls,before,'late trailer response must not append detached UI or toggle another activity');
 }
 for(const rejection of [false,true]){
  const env=environment(),request=deferred();env.context.LampaYaniApi={detail:()=>request.promise};
  const comp=env.context.LampaYaniDetail.create({card:{yani_id:7}},{t:x=>x,getYummyId:x=>x.yani_id,toCard:env.normalize});
  comp.activity={loader:x=>env.calls.push('loader:'+x),toggle:()=>env.calls.push('toggle')};
  comp.create();comp.pause();if(rejection)request.reject(new Error('network'));else request.resolve({response:{title:'Late'}});await flush();
  assert.ok(!env.calls.includes('toggle'),'paused detail must not toggle over another activity');
  comp.start();assert.ok(env.calls.includes('controller-add'),'resumed detail must register its controller');comp.destroy();
 }
 {
  const env=environment(),request=deferred();env.context.LampaYaniApi={detail:()=>request.promise};
  const comp=env.context.LampaYaniDetail.create({}, {t:x=>x,getYummyId:x=>x.yani_id,toCard:env.normalize});
  comp.activity={loader:x=>env.calls.push('loader:'+x),toggle:()=>env.calls.push('toggle')};comp.create();comp.pause();
  request.reject(new Error('missing restored route'));await flush();
  [...env.timers.values()].forEach(fn=>fn());assert.ok(!env.calls.includes('replace'),'covered restored detail must not replace visible activity');
  comp.start();assert.ok(env.calls.includes('replace'),'resuming failed restored detail must recover to Home instead of a blank card');comp.destroy();
 }
 for(const rejection of [false,true]){
  const env=environment(),request=deferred();const trailers=env.context.LampaYaniTrailers.create({t:x=>x,api:{trailers:()=>request.promise}});
  const comp=new trailers.Component({card:{yani_id:7}});comp.activity={loader:x=>env.calls.push('loader:'+x),toggle:()=>env.calls.push('toggle')};
  comp.create();comp.pause();if(rejection)request.reject(new Error('network'));else request.resolve({response:[{url:'https://youtu.be/abcdefghijk'}]});await flush();
  assert.ok(!env.calls.includes('toggle'),'paused trailer response must not steal active content');
  comp.start();assert.ok(env.calls.includes('controller-add'),'resumed trailer view remains navigable');comp.destroy();
 }
 console.log('lite detail lifecycle runtime: success/error after destroy and pending timeout cleanup passed');
})().catch(error=>{console.error(error);process.exit(1);});

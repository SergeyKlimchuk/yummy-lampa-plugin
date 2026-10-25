'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const source = name => fs.readFileSync(path.join(__dirname,'../src',name),'utf8');
const shown=[], launches=[];
const context={window:{},console,Promise,setTimeout,clearTimeout,document:{querySelector:()=>null,documentElement:{contains:()=>false}},Lampa:{Select:{show:()=>{}},Controller:{},Noty:{show:()=>{}}}};
context.window=context;
vm.runInNewContext(source('episode.js')+'\n'+source('ui-utils.js')+'\n'+source('ui-playback-menu.js'),context);
let saved={number:1075,video_id:'v1075',time:31,duration:100};
const menu=context.LampaYaniPlaybackMenu.create({t:x=>x,getPlayback:()=>saved,showYummySelect:p=>shown.push(p),launchVideo:(...args)=>launches.push(args)});
const videos=Array.from({length:1403},(_,i)=>({number:i+1,video_id:'v'+(i+1)}));
const card={yani_id:7};const group={title:'Studio',videos};
menu.chooseEpisode(card,group);
let page=shown.pop();
assert.ok(page.items.length<=62,'long title must render at most 60 episodes and two range controls');
assert.strictEqual(page.items[page.selected].video.number,1075,'initial page/focus must select saved episode');
const reached=new Set(page.items.filter(x=>x.video).map(x=>x.video.number));
while(page.items.some(x=>typeof x.page==='number' && x.page>Math.floor((page.items.find(x=>x.video).video.number-1)/60))){
 const next=page.items[page.items.length-1];page.onSelect(next);page=shown.pop();
 assert.ok(page.items.length<=62);
 page.items.filter(x=>x.video).forEach(x=>reached.add(x.video.number));
}
assert.strictEqual(page.items.filter(x=>x.video).slice(-1)[0].video.number,1403,'final partial page must remain accessible');
while(page.items[0] && typeof page.items[0].page==='number'){
 page.onSelect(page.items[0]);page=shown.pop();assert.ok(page.items.length<=62);
 page.items.filter(x=>x.video).forEach(x=>reached.add(x.video.number));
}
assert.strictEqual(reached.size,1403,'page controls must expose every source episode exactly by number');
page.onSelect(page.items.find(x=>x.video && x.video.number===42));
assert.strictEqual(launches.length,1);
assert.strictEqual(launches[0][2].length,1403,'paging must retain full playlist for auto-next');
assert.strictEqual(launches[0][3].number,42);
menu.chooseEpisode(card,{title:'One',videos:[{number:1075,video_id:'v1075'}]});
assert.strictEqual(launches.length,2,'single episode still launches directly');
assert.strictEqual(launches[1][3].watched.end_time,31,'saved position survives single-episode launch');
saved={video_id:'other-dubbing-video',number:1075};menu.chooseEpisode(card,group);page=shown.pop();
assert.strictEqual(page.items[page.selected].video.number,1075,'switching dubbing must fall back to saved episode number when video IDs differ');
saved={number:9999};menu.chooseEpisode(card,{title:'Short',videos:videos.slice(0,2)});page=shown.pop();
assert.strictEqual(page.items.length,2,'short shows must not get range controls');
assert.strictEqual(page.selected,0,'missing saved episode must use first existing episode');
console.log('lite detail playback runtime: bounded chooser, every episode reachable, saved focus and full playlist passed');

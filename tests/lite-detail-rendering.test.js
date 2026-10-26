'use strict';
// Exercise actual production renderers with a tiny DOM, tracking mutations.
// This verifies repeated cardRender calls rather than a textual cache contract.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
let writes = 0, computedStyles = 0, inheritedFontSize = 16;
function Node(tag) {
    this.tag = tag || 'div'; this.attrs = {}; this.children = []; this.parent = null; this.classes = []; this.textValue = ''; this.styles = {}; this.events = [];
    this.clientWidth = 190; this.clientHeight = 280;
    this.classList = {toggle: (name, enabled) => { const had = this.classes.includes(name); if (had !== enabled) { writes++; if (enabled) this.classes.push(name); else this.classes = this.classes.filter(x => x !== name); } }};
}
function matches(n, selector) { return selector.split(',').some(s => { s = s.trim(); return s[0] === '.' ? s.slice(1).split('.').every(x => n.classes.includes(x)) : n.tag === s; }); }
function find(n, selector, result) { n.children.forEach(c => { if (matches(c, selector)) result.push(c); find(c, selector, result); }); return result; }
Node.prototype.querySelector = function (selector) { return find(this, selector, [])[0] || null; };
function parse(markup) {
    const holder = new Node('fragment'), stack = [holder]; let part;
    const token = /<\/?[^>]+>|[^<]+/g;
    while ((part = token.exec(markup))) {
        const value = part[0];
        if (value.slice(0, 2) === '</') { stack.pop(); continue; }
        if (value[0] !== '<') { stack[stack.length - 1].textValue += value; continue; }
        const tag = /^<([\w-]+)/.exec(value); if (!tag) continue;
        const n = new Node(tag[1]); let a; const attrs = /([\w-]+)="([^"]*)"/g;
        while ((a = attrs.exec(value))) n.attrs[a[1]] = a[2];
        n.classes = (n.attrs.class || '').split(/\s+/).filter(Boolean);
        n.parent = stack[stack.length - 1]; n.parent.children.push(n);
        if (!/\/$/.test(value.slice(0, -1)) && !['img', 'input', 'br', 'path', 'circle'].includes(n.tag)) stack.push(n);
    }
    holder.children.forEach(n => { n.parent = null; }); return holder.children;
}
function Wrapper(nodes, previous) { this.nodes = nodes || []; this.length = this.nodes.length; this.jquery = true; this.previous = previous; this.nodes.forEach((n,i) => { this[i] = n; }); }
function $(value, context) {
    if (value instanceof Wrapper) return value;
    if (value instanceof Node) return new Wrapper([value]);
    if (typeof value === 'string' && value[0] === '<') return new Wrapper(parse(value));
    return context ? $(context).find(value) : new Wrapper([]);
}
function text(n) { return n.textValue + n.children.map(text).join(''); }
Wrapper.prototype.first = function () { return new Wrapper(this.nodes.slice(0,1), this); };
Wrapper.prototype.find = function (selector) { return new Wrapper(this.nodes.reduce((out,n) => find(n, selector, out), []), this); };
Wrapper.prototype.append = function (...values) { const nodes = values.reduce((out,value) => out.concat($(value).nodes),[]); this.nodes.forEach(p => nodes.forEach(n => { writes++; if (n.parent) n.parent.children.splice(n.parent.children.indexOf(n),1); n.parent = p; p.children.push(n); })); return this; };
Wrapper.prototype.appendTo = function (host) { $(host).append(this); return this; };
Wrapper.prototype.after = function (value) { const nodes = $(value).nodes; this.nodes.forEach(n => { if (n.parent) { writes++; const at=n.parent.children.indexOf(n); nodes.forEach(x => { x.parent=n.parent; }); n.parent.children.splice(at+1,0,...nodes); } }); return this; };
Wrapper.prototype.empty = function () { this.nodes.forEach(n => { writes++; n.children.forEach(c => { c.parent=null; }); n.children=[]; n.textValue=''; }); return this; };
Wrapper.prototype.remove = function () { this.nodes.forEach(n => { writes++; if (n.parent) n.parent.children.splice(n.parent.children.indexOf(n),1); n.parent=null; }); return this; };
Wrapper.prototype.text = function (value) { if (value === undefined) return this.nodes.map(text).join(''); this.empty(); this.nodes.forEach(n => { writes++; n.textValue=String(value); }); return this; };
Wrapper.prototype.html = function (value) { return this.empty().append(value); };
Wrapper.prototype.attr = function (name, value) { if (typeof name === 'object') { Object.keys(name).forEach(k => this.attr(k,name[k])); return this; } if (value === undefined) return this[0] && this[0].attrs[name]; this.nodes.forEach(n => { writes++; n.attrs[name]=String(value); }); return this; };
Wrapper.prototype.hasClass = function (name) { return Boolean(this[0] && this[0].classes.indexOf(name) >= 0); };
Wrapper.prototype.addClass = function (names) { names.split(/\s+/).forEach(name => this.nodes.forEach(n => n.classList.toggle(name,true))); return this; };
Wrapper.prototype.removeClass = function (names) { names.split(/\s+/).forEach(name => this.nodes.forEach(n => n.classList.toggle(name,false))); return this; };
Wrapper.prototype.css = function (name,value) { this.nodes.forEach(n => { writes++; n.styles[name]=value; }); return this; };
Wrapper.prototype.hide = function () { return this.css('display','none'); };
Wrapper.prototype.show = function () { return this.css('display',''); };
Wrapper.prototype.end = function () { return this.previous || this; };
Wrapper.prototype.off = function (name) { writes++; this.nodes.forEach(n=>{n.events=n.events.filter(e=>e.name!==name);}); return this; };
Wrapper.prototype.one = function (name,fn) { writes++; this.nodes.forEach(n=>n.events.push({name,fn})); return this; };
const context = {window: {}, $, console, LampaYaniUiUtils: {mediaTypeInfo: () => ({})}};
context.window.LampaYaniUiUtils = context.LampaYaniUiUtils;
context.window.getComputedStyle = () => { computedStyles++; return {fontSize:inheritedFontSize+'px'}; };
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/ui-card-renderers.js'),'utf8'), context);
let playback = {number:2,time:25,duration:100};
const api = context.window.LampaYaniCardRenderers.create({t:x=>x, getPlayback:()=>playback});
const host = $('<div class="card"><div class="card__view"><img class="card__img" src="fixture-poster.webp"></div><div class="card__title"></div><div class="card__age"></div><div class="card__vote"></div></div>');
const card = {yani_id:1,yani_media:{quality:'1080p',voices:7,loaded:true},yani_list_id:0,yani_is_favorite:true,yani_ratings:[{key:'yummy',value:8.5}],yani_episodes:{aired:10,count:12}};
api.decorate(host,card);
const media = host.find('.yani-card-media')[0], list = host.find('.yani-card-list')[0], progress = host.find('.yani-card-playback')[0], ratings = host.find('.yani-card-ratings')[0];
const bandLabel = host.find('.yani-card-list__label')[0], posterNode=host.find('.card__img')[0];
const firstWrites=writes, firstStyles=computedStyles;
for(let i=0;i<100;i++) api.decorate(host,card);
assert.strictEqual(writes,firstWrites,'100 unchanged render calls must not mutate DOM or rebind media handlers');
assert.strictEqual(computedStyles,firstStyles+100,'font reads must keep scaling correct without any DOM writes');
assert.strictEqual(host.find('.yani-card-media')[0],media);
assert.strictEqual(host.find('.yani-card-list')[0],list);
assert.strictEqual(host.find('.yani-card-playback')[0],progress);
assert.strictEqual(host.find('.yani-card-ratings')[0],ratings);
card.yani_list_id=2; api.addCardListBadge(host,card);
assert.ok(host.find('.yani-card-list')[0].classes.includes('yani-card-list--completed'),'list changes must invalidate badge cache');
assert.strictEqual(host.find('.yani-card-list')[0],list,'category change retains the status band node');
assert.strictEqual(host.find('.yani-card-list__label')[0],bandLabel,'category change retains the label node');
assert.strictEqual(host.find('.card__img')[0],posterNode,'category change must never replace the poster');
assert.strictEqual(posterNode.attrs.src,'fixture-poster.webp');
card.yani_list_id=null; card.yani_is_favorite=false; api.addCardListBadge(host,card);
assert.strictEqual(host.find('.yani-card-list').length,0,'clearing list must remove stale badge');
playback.time=40; api.addCardPlaybackProgress(host,card);
assert.ok(host.find('.yani-card-playback').text().includes('40%'),'progress must invalidate rendered text');
assert.strictEqual(host.find('.yani-card-playback-progress').find('span')[0].styles.width,'40%');
playback={}; card.yani_list_progress=0; api.addCardPlaybackProgress(host,card);
assert.strictEqual(host.find('.yani-card-playback').length,0,'clearing progress must remove stale markup');
card.yani_ratings[0].value=9.2; api.addCardRatings(host,card);
assert.strictEqual(host.find('.yani-card-rating__value').text(),'9.2','rating mutations must invalidate old panel');
card.yani_ratings=[]; api.addCardRatings(host,card);
assert.strictEqual(host.find('.yani-card-ratings').length,0);
assert.strictEqual(host.find('.card__vote')[0].styles.display,'');
card.yani_media.voices=11; api.renderCardMediaBadges(host,card,card.yani_media);
assert.ok(host.find('.yani-card-media__voices').text().includes('11'));
api.renderCardMediaBadges(host,card,{});
assert.strictEqual(host.find('.yani-card-media').length,0,'empty media must clear stale availability');
api.syncCardOverlayLayout(host,card); const stylesBeforeResize=computedStyles;
host.find('.card__view')[0].clientWidth=120; api.syncCardOverlayLayout(host,card);
assert.strictEqual(computedStyles,stylesBeforeResize+1,'poster resize must invalidate cached overlay layout');
inheritedFontSize=24; const stylesBeforeFont=computedStyles;
const priorPlan=host.find('.card__view')[0].yaniOverlayPaint;api.syncCardOverlayLayout(host,card);
assert.notStrictEqual(host.find('.card__view')[0].yaniOverlayPaint,priorPlan,'font scaling must invalidate plan even at the same pixel size');
assert.strictEqual(computedStyles,stylesBeforeFont+1);
assert.strictEqual(api.cardMediaMotionAllowed(),false,'TV presentation must remain static on every device');
console.log('lite detail rendering runtime: unchanged paints, mutable lists/progress/ratings/media and responsive invalidation passed');

// Render the actual detail module: primary actions precede a complete synopsis.
Wrapper.prototype.children = function (selector) { return new Wrapper(this.nodes.reduce((out,n) => out.concat(n.children.filter(c => !selector || matches(c,selector))),[]),this); };
Wrapper.prototype.each = function (callback) { this.nodes.forEach((n,i) => callback.call(n,i,n)); return this; };
Wrapper.prototype.add = function (other) { return new Wrapper(this.nodes.concat($(other).nodes).filter((n,i,all)=>all.indexOf(n)===i),this); };
Wrapper.prototype.on = function (name,fn) { this.nodes.forEach(n=>n.events.push({name,fn})); return this; };
Wrapper.prototype.toggleClass = function (name,enabled) { return enabled ? this.addClass(name) : this.removeClass(name); };
let detailToggles=0,detailControllers=0,detailPlayback={number:4,time:333,duration:1440};
const detailActions=[];
const doc = new Node('document');doc.removeEventListener=()=>{};doc.addEventListener=()=>{};
context.document=doc;context.setTimeout=()=>1;context.clearTimeout=()=>{};
context.window.Lampa = context.Lampa = {
    Scroll:function(){const root=$('<div class="scroll"></div>');this.minus=()=>{};this.append=node=>root.append(node);this.render=()=>root;this.destroy=()=>{};},
    Storage:{get:()=>''},Controller:{enabled:()=>({name:'content'}),collectionAppend:()=>{},add:()=>{detailControllers++;},toggle:()=>{}}
};
context.LampaYaniNavigation={createScope:()=>({bind:()=>{},destroy:()=>{},target:()=>null,restore:()=>null})};
context.LampaYaniMedia={bindPosterFallback:()=>{}};
context.LampaYaniUiUtils.detailRouteId=()=>9;
context.LampaYaniUiUtils.detailEpisodeStats=()=>({total:12,aired:8,minutes:24});
const synopsis=Array.from({length:120},(_,i)=>'Описание '+i).join(' ');
const alternatives=['Alternative title one','Alternative title two','Alternative title three'];
context.LampaYaniApi={detail:()=>Promise.resolve({response:{yani_id:9,title:'Title',overview:synopsis,yani_titles:alternatives}}),recommendations:()=>Promise.resolve([]),normalize:()=>[],comments:()=>Promise.resolve([]),normalizeComments:()=>[]};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/ui-detail.js'),'utf8'),context);
const detail=context.window.LampaYaniDetail.create({card:{yani_id:9}}, {
    t:x=>x,locale:()=> 'ru',getYummyId:x=>x.yani_id,toCard:x=>x,getPlayback:()=>detailPlayback,mediaTypeLabels:()=>({full:"Сериал"}),
    detailGenres:()=>[{id:1,title:'Фэнтези'}],genreTitle:x=>x.title,genreValue:x=>x.id,createDetailRatings:()=> $('<div></div>'),hasYummyList:()=>false,
    addCardListBadge:()=>{},syncCardOverlayLayout:()=>{},loadVideos:()=>Promise.resolve([]),lampaIcon:()=>'',
    beginPlaybackNavigation:()=>{},resumePlayback:card=>detailActions.push({type:'resume',card}),
    configurePlayback:card=>detailActions.push({type:'configure',card})
});
detail.activity={loader:()=>{},toggle:()=>{detailToggles++;}};detail.create();detail.pause();
Promise.resolve().then(()=>{}).then(()=>{}).then(()=>{
    const rendered=$(detail.render(true));const info=rendered.find('.yani-detail__info')[0];
    assert.ok(info,'the actual production detail module must render');
    const actionIndex=info.children.findIndex(n=>n.classes.includes('yani-detail__actions'));
    const overviewIndex=info.children.findIndex(n=>n.classes.includes('yani-detail__overview'));
    assert.ok(actionIndex>=0 && actionIndex<overviewIndex,'primary TV actions must precede the full synopsis');
    const names=info.children.map(n=>n.classes.join(' '));
    const at=name=>names.findIndex(x=>x.split(' ').includes(name));
    const ordered=['yani-detail__title','yani-detail__rating-row','yani-detail__tags','yani-detail__episode-summary','yani-detail__actions','yani-detail__list-dock','yani-detail__overview','yani-detail__translations','yani-detail__metadata','yani-detail__comments'];
    ordered.forEach((name,i)=>{assert.ok(at(name)>=0,'missing detail block '+name);if(i)assert.ok(at(ordered[i-1])<at(name),'priority '+ordered[i-1]+' before '+name);});
    assert.strictEqual(rendered.find('.yani-detail__poster-column').find('.yani-detail__list-panel').length,0,'categories must not remain in a separate poster lane');
    ['.yani-detail__title','.yani-detail__poster','.yani-detail__episode-summary','.yani-detail__translations','.yani-detail__comments-title'].forEach(selector=>{
        assert.strictEqual(rendered.find(selector+'.selector').length,0,'read-only '+selector+' must not enter the D-pad journey');
    });
    assert.strictEqual(rendered.find('.yani-detail__overview.selector').length,1,'expanding the complete synopsis remains an actual action');
    assert.strictEqual(rendered.find('.yani-detail__poster-action.selector').length,1,'poster enlargement remains available as a secondary metadata action');
    assert.strictEqual(rendered.find('.yani-detail__button--watch').text(),'continue_episode 4','a real saved episode labels the primary action');
    const actualActions=rendered.find('.yani-detail__actions').children().nodes.map(n=>n.attrs['data-yani-focus-key']);
    assert.deepStrictEqual(actualActions,['action:watch','action:configure','action:open','action:trailers','action:subscribe'],'the episode/voice control is adjacent to the fast primary action');

    assert.strictEqual(rendered.find('.yani-detail__list-label').length,6,'all categories need visible text, not icon-only controls');
    assert.ok(rendered.find('.yani-detail__list-label').text().includes('planned'));

    assert.strictEqual(rendered.find('.yani-detail__overview').text(),synopsis,'the synopsis must not be truncated or discarded');
    assert.strictEqual(rendered.find('.yani-detail__alternative-titles').attr('title'),alternatives.join(' · '),'all alternate titles remain accessible');
    assert.strictEqual(detailToggles,0,'successfully rendered paused detail must not toggle over another activity');
    detail.start();assert.strictEqual(detailControllers,1,'successfully rendered detail remains usable on resume');
    const enter=selector=>{
        const node=rendered.find(selector)[0],binding=node.events.find(e=>e.name.split(/\s+/).some(name=>name==='hover:enter'));
        assert.ok(binding,'action has an Enter handler');
        binding.fn({preventDefault(){},stopImmediatePropagation(){}});
    };
    enter('.yani-detail__button--watch');enter('.yani-detail__button--configure');
    assert.deepStrictEqual(detailActions.map(action=>action.type),['resume','configure'],'primary launches directly while adjacent action configures without a stream launch');
    assert.strictEqual(detailActions[0].card,detailActions[1].card,'both routes keep the original hydrated anime identity');
    assert.strictEqual(detailActions[0].card.yani_id,9);
    const watchNode=rendered.find('.yani-detail__button--watch')[0];
    detailPlayback={number:7,time:12,duration:1440};
    const progressHandler=doc.events.find(e=>e.name==='yani:watch-progress.yaniDetail');
    progressHandler.fn(null,{yani_id:9});
    assert.strictEqual(rendered.find('.yani-detail__button--watch')[0],watchNode,'progress changes cannot replace the primary focused node');
    assert.strictEqual(rendered.find('.yani-detail__button--watch').text(),'continue_episode 7');

    detail.destroy();
    console.log('lite detail layout runtime: actions before complete overview and accessible alternatives passed');
}).catch(error=>{console.error(error);process.exitCode=1;});

(async()=>{
    for(const sameId of [false,true]){
        let finish;
        const delayed=new Promise(resolve=>{finish=resolve;});
        const renderer=context.window.LampaYaniCardRenderers.create({
            t:x=>x,loadVideos:()=>delayed,mediaMeta:value=>({quality:value.videos[0].quality,voices:1})
        });
        const node=$('<div class="card"><div class="card__view"></div></div>');
        const first={yani_id:7,yani_media:{quality:'A',loaded:false}};
        renderer.addCardMediaBadges(node,first);node[0].events.find(e=>e.name==='hover:focus.yaniMedia').fn();
        const replacement={yani_id:sameId?7:8,yani_media:{quality:'B',loaded:true}};
        renderer.addCardMediaBadges(node,replacement);
        finish({response:[{quality:'late-old-response'}]});
        await Promise.resolve();await Promise.resolve();
        assert.strictEqual(node.find('.yani-card-media__quality').text(),'B','old response must not overwrite a reused card node, including a same-id replacement object');
        assert.strictEqual(first.yani_media.loaded,false,'retired request must not mutate old card state');
    }
    console.log('lite detail recycled-node runtime: late metadata cannot overwrite loaded replacement cards passed');
})().catch(error=>{console.error(error);process.exitCode=1;});

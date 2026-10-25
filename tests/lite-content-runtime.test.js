'use strict';
var assert = require('assert');
var fs = require('fs');
var vm = require('vm');
var path = require('path');
var sourceRoot = process.env.YANI_SOURCE_ROOT || path.resolve(__dirname, '..', 'src');
function Node(tag) {
    this.tag = tag || 'div'; this.attrs = {}; this.children = []; this.parent = null;
    this.classes = []; this.events = []; this.textValue = ''; this.styles = {};
}
function matches(node, selector) {
    if (!selector) return true;
    return selector.charAt(0) === '.' ? selector.slice(1).split('.').every(function (name) { return node.classes.indexOf(name) >= 0; }) : node.tag === selector;
}
function descendants(node, selector, output) {
    node.children.forEach(function (child) { if (matches(child, selector)) output.push(child); descendants(child, selector, output); });
    return output;
}
function parse(markup) {
    var holder = new Node('fragment'), stack = [holder];
    var token = /<\/?[^>]+>|[^<]+/g, part;
    while ((part = token.exec(markup))) {
        var value = part[0];
        if (value.slice(0, 2) === '</') { stack.pop(); continue; }
        if (value.charAt(0) !== '<') { stack[stack.length - 1].textValue += value; continue; }
        var found = /^<([\w-]+)/.exec(value);
        if (!found) continue;
        var node = new Node(found[1]);
        var attr = /([\w-]+)="([^"]*)"/g, entry;
        while ((entry = attr.exec(value))) node.attrs[entry[1]] = entry[2];
        node.classes = (node.attrs.class || '').split(/\s+/).filter(Boolean);
        node.parent = stack[stack.length - 1]; node.parent.children.push(node);
        if (['img', 'input', 'br', 'i'].indexOf(node.tag) < 0 || node.tag === 'i') stack.push(node);
    }
    holder.children.forEach(function (node) { node.parent = null; });
    return holder.children;
}
function Wrapper(nodes) {
    this.nodes = nodes || []; this.length = this.nodes.length; this.jquery = true;
    this.nodes.forEach(function (node, index) { this[index] = node; }, this);
}
function $(value) {
    if (value instanceof Wrapper) return value;
    if (value instanceof Node) return new Wrapper([value]);
    if (Array.isArray(value)) return new Wrapper(value);
    return new Wrapper(typeof value === 'string' && value.charAt(0) === '<' ? parse(value) : []);
}
Wrapper.prototype.append = function (value) {
    var added = $(value).nodes;
    this.nodes.forEach(function (parent) { added.forEach(function (node) {
        if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1);
        node.parent = parent; parent.children.push(node);
    }); }); return this;
};
Wrapper.prototype.empty = function () { this.nodes.forEach(function (n) { n.children.forEach(function (c) { c.parent = null; }); n.children = []; n.textValue = ''; }); return this; };
Wrapper.prototype.addClass = function (value) { var names = value.split(/\s+/); this.nodes.forEach(function (n) { names.forEach(function (name) { if (n.classes.indexOf(name) < 0) n.classes.push(name); }); }); return this; };
Wrapper.prototype.removeClass = function (value) { var names = value.split(/\s+/); this.nodes.forEach(function (n) { n.classes = n.classes.filter(function (name) { return names.indexOf(name) < 0; }); }); return this; };
Wrapper.prototype.toggleClass = function (name, enabled) { return enabled ? this.addClass(name) : this.removeClass(name); };
function allText(node) { return node.textValue + node.children.map(allText).join(''); }
Wrapper.prototype.text = function (value) { if (value === undefined) return this.nodes.map(allText).join(''); this.empty(); this.nodes.forEach(function (n) { n.textValue = String(value); }); return this; };
Wrapper.prototype.attr = function (name, value) { if (value === undefined) return this[0] && this[0].attrs[name]; this.nodes.forEach(function (n) { n.attrs[name] = String(value); }); return this; };
Wrapper.prototype.css = function (name, value) { this.nodes.forEach(function (n) { n.styles[name] = value; }); return this; };
Wrapper.prototype.find = function (selector) { var output = []; this.nodes.forEach(function (n) { descendants(n, selector, output); }); return new Wrapper(output); };
Wrapper.prototype.on = function (name, selector, callback) { if (typeof selector === 'function') { callback = selector; selector = ''; } this.nodes.forEach(function (n) { n.events.push({name: name, selector: selector, callback: callback}); }); return this; };
Wrapper.prototype.off = function (name, callback) { this.nodes.forEach(function (n) { n.events = n.events.filter(function (e) { return callback && e.callback !== callback || e.name.indexOf(name) < 0; }); }); return this; };
Wrapper.prototype.remove = function () { this.nodes.forEach(function (n) { if (n.parent) n.parent.children.splice(n.parent.children.indexOf(n), 1); n.parent = null; }); return this; };
Wrapper.prototype.trigger = function (name, args) {
    this.nodes.forEach(function (target) {
        for (var current = target; current; current = current.parent) {
            current.events.slice().forEach(function (e) {
                if (e.name.split('.')[0] !== name || e.selector && !matches(target, e.selector)) return;
                e.callback.apply(target, [{currentTarget: target, target: target}].concat(args || []));
            });
        }
    }); return this;
};
$.contains = function (parent, child) { for (var n = child.parent; n; n = n.parent) if (n === parent) return true; return false; };

function defer() { var resolve, reject; var promise = new Promise(function (a, b) { resolve = a; reject = b; }); return {promise: promise, resolve: resolve, reject: reject}; }
function settle() { return Promise.resolve().then(function () {}).then(function () {}).then(function () {}).then(function () {}); }


// The harness exercises production code; no browser engine/network is needed.
Wrapper.prototype.append = function () {
    var added = [];
    Array.from(arguments).forEach(function (value) { added = added.concat($(value).nodes); });
    this.nodes.forEach(function (parent) { added.forEach(function (node) {
        if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1);
        node.parent = parent; parent.children.push(node);
    }); }); return this;
};
Wrapper.prototype.first = function () { return this.eq(0); };
Wrapper.prototype.eq = function (i) { return new Wrapper(this.nodes[i] ? [this.nodes[i]] : []); };
Wrapper.prototype.index = function (n) { return this.nodes.indexOf(n && n.jquery ? n[0] : n); };
Wrapper.prototype.each = function (fn) { this.nodes.forEach(function (n,i) { fn.call(n,i,n); }); return this; };
Wrapper.prototype.hasClass = function (v) { return !!this[0] && this[0].classes.indexOf(v) >= 0; };
Wrapper.prototype.hide = function () { return this.attr('hidden', 'hidden'); };
Wrapper.prototype.show = function () { return this.removeAttr('hidden'); };
Wrapper.prototype.removeAttr = function (v) { this.nodes.forEach(function (n) { delete n.attrs[v]; }); return this; };
Wrapper.prototype.innerWidth = function () { return 400; };
Wrapper.prototype.outerWidth = function () { return 100; };
Wrapper.prototype.scrollLeft = function () { return this; };
Wrapper.prototype.is = function () { return !!this.length; };
Wrapper.prototype.filter = function (selector) { return new Wrapper(this.nodes.filter(function (n) { return matches(n,selector); })); };
var oldAttr = Wrapper.prototype.attr;
Wrapper.prototype.attr = function (name, value) {
    if (name && typeof name === 'object') { var self=this; Object.keys(name).forEach(function (k) { oldAttr.call(self,k,name[k]); }); return this; }
    return oldAttr.call(this,name,value);
};
matches = function (node, selector) {
    return selector.split(',').some(function (part) {
        var pieces=part.trim().split(/\s+/), current=node;
        function simple(n,s) { return s.charAt(0)==='.' ? s.slice(1).split('.').every(function (c) { return n.classes.indexOf(c)>=0; }) : n.tag===s; }
        if (!simple(current,pieces.pop())) return false;
        while (pieces.length) { var wanted=pieces.pop(); current=current.parent; while (current&&!simple(current,wanted)) current=current.parent; if (!current) return false; }
        return true;
    });
};
Wrapper.prototype.trigger = function (name) {
    this.nodes.forEach(function (target) { target.events.slice().forEach(function (e) {
        if (!e.name.split(/\s+/).some(function (v) { return v.split('.')[0]===name; })) return;
        e.callback.call(target, {currentTarget:target,target:target,preventDefault:function(){},stopPropagation:function(){}});
    }); }); return this;
};
function harness(files, extra) {
    var timers=[], root=new Node('document'), calls={build:[], detail:[], videos:[], state:[], destroy:0};
    root.contains=function(n){ for(var v=n;v;v=v.parent) if(v===root)return true;return false;};
    root.addEventListener=function(){};root.removeEventListener=function(){};
    root.documentElement=root;root.createTextNode=function(v){var n=new Node('text');n.textValue=String(v);return n;};
    var categoryRoot=$('<div class="category-full"></div>');
    function Category(){this.activity={loader:function(){},toggle:function(){}};this.build=function(v){calls.build.push(v);};this.render=function(){return categoryRoot;};this.destroy=function(){calls.destroy++;};}
    var scope={bind:function(){},remember:function(){},restore:function(n){return n;},destroy:function(){}};
    var ctx={window:{},document:root,$:$,Promise:Promise,Date:Date,console:console,
        setTimeout:function(fn){var task={fn:fn,cleared:false};timers.push(task);return task;},clearTimeout:function(task){task.cleared=true;},
        Lampa:{InteractionCategory:Category,Noty:{show:function(){}},Scroll:function(){var r=$('<div class="scroll"></div>');this.minus=function(){};this.render=function(js){return js?r[0]:r;};this.append=function(v){r.append(v);};this.update=function(){};this.wheel=function(){};this.destroy=function(){};},Controller:{collectionSet:function(){},collectionFocus:function(n){$(n).trigger('hover:focus');}}},
        LampaYaniNavigation:{createScope:function(){return scope;}},LampaYaniMedia:{bindPosterFallback:function(){}},
        LampaYaniApi:{schedule:function(){return Promise.resolve({});},normalize:function(v){return v.response||[];},detail:function(id){calls.detail.push(id);return Promise.resolve({response:{anime_id:id,title:'Anime'}});},videos:function(id){calls.videos.push(id);return Promise.resolve({response:[]});}},
        LampaYaniSectionState:{create:function(){return{root:$('<div></div>'),show:function(k){calls.state.push(k);},clear:function(){},focus:function(){}};},forActivity:function(){return{loading:function(){calls.state.push('loading');},ready:function(){calls.state.push('ready');},empty:function(){calls.state.push('empty');},offline:function(){calls.state.push('offline');},cached:function(){},focus:function(){}};},fromCache:function(){return false;}}
    };
    Object.assign(ctx,extra||{});Object.assign(ctx.window,ctx);ctx.window.window=ctx.window;
    files.forEach(function(file){vm.runInNewContext(fs.readFileSync(path.join(sourceRoot,file),'utf8'),ctx);Object.assign(ctx,ctx.window);});
    return{ctx:ctx,calls:calls,root:root,timers:timers,flush:function(){var pending=timers.splice(0);pending.forEach(function(t){if(!t.cleared)t.fn();});}};
}
async function feedChecks() {
    for (var entry of [['ui-releases.js','LampaYaniReleases','new'],['ui-translations.js','LampaYaniTranslations','new_videos']]) {
        var h=harness([entry[0]]), request=defer();
        var rows=Array.from({length:95},function(_,i){return{anime_id:i+1,title:'Anime '+i,date:i};});
        var deps={t:function(v){return v;},feed:function(){return request.promise;},toCard:function(v){return{yani_id:v.anime_id,title:v.title};}};
        var comp=h.ctx[entry[1]].component({},deps);comp.create();
        var response={response:{}};response.response[entry[2]]=rows;request.resolve(response);await settle();
        assert.equal(h.calls.build[0].results.length,30,entry[0]+' mounts one page');
        var seen=h.calls.build[0].results.map(function(v){return v.yani_id;});
        [2,3,4].forEach(function(page){comp.nextPageRequest({page:page},function(v){seen=seen.concat(v.results.map(function(c){return c.yani_id;}));});});
        assert.equal(new Set(seen).size,95,'local paging loses no titles');comp.destroy();
        var dead=harness([entry[0]]), late=defer();deps.feed=function(){return late.promise;};
        var destroyed=dead.ctx[entry[1]].component({},deps);destroyed.create();destroyed.destroy();late.resolve(response);await settle();
        assert.equal(dead.calls.build.length,0,'closed screen must not rebuild');
        assert.deepEqual(dead.calls.state,['loading'],'closed screen leaves no late state work');
    }
}
async function scheduleChecks() {
    var h=harness(['ui-schedule.js']), today=new Date();today.setHours(12,0,0,0);
    var rows=Array.from({length:95},function(_,i){return{anime_id:i+1,title:'Anime '+(i+1),episodes:{aired:1,count:12,prev_date:today.getTime()/1000}};});
    h.ctx.LampaYaniApi.schedule=function(){return Promise.resolve({response:rows});};
    var comp=h.ctx.LampaYaniSchedule.create({}, {t:function(v){return v;},locale:function(){return'en';},toCard:function(v){return{yani_id:v.anime_id,title:v.title};}});
    $(h.root).append(comp.render());comp.activity={loader:function(){},toggle:function(){}};comp.create();await settle();
    assert.equal(comp.render().find('.yani-schedule__item').length,20,'schedule mounts one 20-row day chunk');
    assert.equal(h.calls.detail.length+h.calls.videos.length,0,'initial day must not fan out metadata requests');
    var first=comp.render().find('.yani-schedule__item');first.eq(0).trigger('hover:focus');first.eq(1).trigger('hover:focus');first.eq(2).trigger('hover:focus');h.flush();await settle();
    assert.deepEqual(h.calls.detail,['3'],'D-pad burst enriches only latest row');assert.deepEqual(h.calls.videos,['3']);
    await settle();await settle();
    var detailWait=defer(),videoWait=defer();
    h.ctx.LampaYaniApi.detail=function(id){h.calls.detail.push(id);return detailWait.promise;};
    h.ctx.LampaYaniApi.videos=function(id){h.calls.videos.push(id);return videoWait.promise;};
    first.eq(3).trigger('hover:focus');h.flush();first.eq(4).trigger('hover:focus');h.flush();first.eq(5).trigger('hover:focus');h.flush();
    assert.deepEqual(h.calls.detail,['3','4'],'only one detail/video pair may remain in flight');
    detailWait.resolve({response:{anime_id:4}});videoWait.resolve({response:[]});await settle();await settle();await settle();h.flush();await settle();
    assert.deepEqual(h.calls.detail,['3','4','6'],'queued enrichment keeps the latest focused row only');
    var more=comp.render().find('.yani-schedule__more');more.trigger('hover:enter');
    assert.equal(comp.render().find('.yani-schedule__item').length,40,'More adds one chunk');
    while(comp.render().find('.yani-schedule__more').length)comp.render().find('.yani-schedule__more').trigger('hover:enter');
    assert.equal(comp.render().find('.yani-schedule__item').length,95,'all schedule rows remain available');
    var before=h.calls.detail.length+h.calls.videos.length;comp.render().find('.yani-schedule__item').eq(80).trigger('hover:focus');comp.destroy();h.flush();await settle();
    assert.equal(h.calls.detail.length+h.calls.videos.length,before,'destroy cancels queued enrichment');
    var late=defer(), ended=harness(['ui-schedule.js']);ended.ctx.LampaYaniApi.schedule=function(){return late.promise;};
    var closed=ended.ctx.LampaYaniSchedule.create({}, {t:function(v){return v;},locale:function(){return'en';},toCard:function(v){return v;}});closed.activity={loader:function(){},toggle:function(){}};closed.create();closed.destroy();late.resolve({response:rows});await settle();
    assert.equal(closed.render().find('.yani-schedule__item').length,0,'late schedule response cannot repaint destroyed view');
}

async function subscriptionChecks() {
    var h=harness(['ui-account-lists.js']),request=defer();h.ctx.LampaYaniApi.subscriptions=function(){return request.promise;};
    var comp=h.ctx.LampaYaniAccountLists.subscriptions({}, {t:function(v){return v;},toCard:function(v){return{yani_id:v.anime_id};}});comp.create();
    request.resolve({response:Array.from({length:95},function(_,i){return{anime_id:i+1};})});await settle();
    assert.equal(h.calls.build[0].results.length,30,'subscriptions mount one native page');
    var all=h.calls.build[0].results.slice();[2,3,4].forEach(function(page){comp.nextPageRequest({page:page},function(v){all=all.concat(v.results);});});
    assert.equal(new Set(all.map(function(c){return c.yani_id;})).size,95);comp.destroy();
}
async function accountOwnerChecks() {
    var cases=[
        {name:'id hydration and token refresh',before:{login:'alice'},after:{user_id:42,login:'alice'},token:'rotated',expected:1},
        {name:'id only token refresh',before:{user_id:42},after:{user_id:42},token:'rotated',expected:1},
        {name:'identity hydration with same token',before:{},after:{user_id:42,login:'alice'},token:'initial',expected:1},
        {name:'account id switch',before:{user_id:42,login:'alice'},after:{user_id:43,login:'alice'},token:'rotated',expected:0},
        {name:'login switch',before:{login:'alice'},after:{user_id:43,login:'bob'},token:'rotated',expected:0},
        {name:'logout',before:{user_id:42,login:'alice'},after:{},token:'',expected:0}
    ];
    for(var kind of ['accountList','subscriptions','userLists'])for(var item of cases){
        var h=harness(['ui-account-lists.js']),request=defer(),account=item.before,token='initial';
        var auth={get:function(){return account;},token:function(){return token;}};
        h.ctx.LampaYaniAuth=auth;h.ctx.window.LampaYaniAuth=auth;
        h.ctx.LampaYaniNavigation.attachComponent=function(){};h.ctx.Lampa.InteractionMain=h.ctx.Lampa.InteractionCategory;
        h.ctx.LampaYaniAccountListControls={create:function(){return{sort:function(v){return v;},install:function(){},destroy:function(){}};}};
        h.ctx.LampaYaniApi.subscriptions=function(){return request.promise;};
        var deps={t:function(v){return v;},loadItems:function(){return request.promise;},loadRows:function(){return request.promise;},toCard:function(v){return v;},goBack:function(){}};
        var comp=h.ctx.LampaYaniAccountLists[kind]({lazy:true},deps);comp.create();
        account=item.after;token=item.token;request.resolve(kind==='subscriptions'?{response:[]}:[]);await settle();
        assert.equal(h.calls.build.length,item.expected,kind+': '+item.name);comp.destroy();
    }
}
async function collectionChecks() {
    var h=harness(['ui-collections.js']),feed=defer(),catalog=defer(),requests=0;
    var deps={t:function(v){return v;},feed:function(){return feed.promise;},load:function(){requests++;return catalog.promise;},error:function(){throw Error('unexpected error');}};
    var comp=h.ctx.LampaYaniCollections.catalog({},deps);comp.create();
    var rows=Array.from({length:20},function(_,i){return{id:i+1,title:'Collection '+i};});
    feed.resolve({response:{collections:rows.slice(0,6)}});await settle();
    assert.equal(h.calls.build[0].results.length,6,'cached feed paints without waiting for catalog');
    catalog.resolve({response:rows});await settle();
    var next;comp.nextPageRequest({page:2},function(v){next=v;});
    assert.equal(next.results.length,14,'titles missing from the fast feed remain in native pagination');
    assert.equal(new Set(h.calls.build[0].results.concat(next.results).map(function(c){return c.yani_collection_id;})).size,20);
    assert.equal(requests,1,'buffered catalog items require no additional request');comp.destroy();
}
function catalogChecks() {
    var h=harness(['ui-catalog-controls.js']), measured=0, width=900, events={}, root=$('<div class="category-full"></div>'), cards=[];
    root[0].clientWidth=width;
    function addCard(i) {
        var n=$('<div class="card selector"></div>')[0];n.offsetParent=root[0];n.offsetWidth=90;n.offsetHeight=145;
        n.getBoundingClientRect=function(){measured++;var x=(i%6)*100,y=Math.floor(i/6)*160;return{left:x,top:y,width:90,height:145,bottom:y+145};};
        cards.push(n);root.append(n);
    }
    for(var i=0;i<120;i++)addCard(i);
    $(cards[0]).addClass('focus');
    var comp={render:function(){return root;},scroll:{render:function(){return root;},update:function(){},wheel:function(){}},on:function(name,fn){events[name]=fn;},start:function(){}};
    h.ctx.Navigator={add:function(){},canmove:function(){return false;}};h.ctx.window.Navigator=h.ctx.Navigator;
    h.ctx.Lampa.Controller.collectionFocus=function(n){root.find('.focus').removeClass('focus');$(n).addClass('focus');};
    var controls=h.ctx.LampaYaniCatalogControls.create({comp:comp,t:function(v){return v;}}),controller={};events.controller(controller);
    controller.down();assert.equal(root.find('.focus')[0],cards[6],'Down retains column');
    var initial=measured;assert.equal(initial,120,'first key measures grid once');
    controller.down();controller.down();controller.up();
    assert.equal(root.find('.focus')[0],cards[12],'cached geometry retains navigation');
    assert.equal(measured,initial,'repeated keys do not measure every mounted card');
    addCard(120);controller.down();assert.equal(measured,initial+121,'appending next page invalidates geometry');
    root[0].clientWidth=800;controller.down();assert.equal(measured,initial+242,'resize invalidates geometry');
    cards[0].offsetHeight=165;controller.down();assert.equal(measured,initial+363,'card scale invalidates geometry at the same container width');
    controls.destroy();
}
(async function(){catalogChecks();await collectionChecks();await subscriptionChecks();await accountOwnerChecks();await feedChecks();await scheduleChecks();console.log('Lite content runtime: paged grids, no schedule fan-out, coalesced focus, lifecycle passed');})().catch(function(error){console.error(error);process.exitCode=1;});

'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('src/ui-tv-shell.js', 'utf8');
function Node(markup) {
    this.nodeType = 1; this.parent = null; this.children = []; this.events = [];
    this.classes = ((/class="([^"]+)"/.exec(markup) || [])[1] || '').split(/\s+/).filter(Boolean);
    this.attrs = {}; this.value = ''; this.rect = null;
}
Node.prototype.contains = function (child) { for (let n = child; n; n = n.parent) if (n === this) return true; return false; };
Node.prototype.getBoundingClientRect = function () { return this.rect || {left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0}; };
function matches(n, selector) { return selector.charAt(0) === '.' && selector.slice(1).split('.').every(c => n.classes.indexOf(c) >= 0); }
function Wrapper(nodes) { this.jquery = true; this.nodes = nodes; this.length = nodes.length; nodes.forEach((n, i) => this[i] = n); }
function $(v) { return v instanceof Wrapper ? v : new Wrapper(v instanceof Node ? [v] : typeof v === 'string' && v.charAt(0) === '<' ? [new Node(v)] : []); }
Wrapper.prototype.append = function (...values) { this.nodes.forEach(parent => values.forEach(value => $(value).nodes.forEach(n => { if(n.parent) n.parent.children.splice(n.parent.children.indexOf(n), 1); n.parent = parent; parent.children.push(n); }))); return this; };
Wrapper.prototype.find = function (selector) { let out = []; function descend(n) { n.children.forEach(c => { if(matches(c, selector)) out.push(c); descend(c); }); } this.nodes.forEach(descend); return new Wrapper(out); };
Wrapper.prototype.first = function () { return new Wrapper(this.length ? [this[0]] : []); };
Wrapper.prototype.each = function (fn) { this.nodes.forEach((n, i) => fn.call(n, i, n)); return this; };
Wrapper.prototype.attr = function (name, value) { if(value === undefined) return this[0] && this[0].attrs[name]; this.nodes.forEach(n => n.attrs[name] = value); return this; };
Wrapper.prototype.text = function (value) { this.nodes.forEach(n => n.value = value); return this; };
Wrapper.prototype.addClass = function (value) { this.nodes.forEach(n => { if(n.classes.indexOf(value) < 0) n.classes.push(value); }); return this; };
Wrapper.prototype.removeClass = function (value) { this.nodes.forEach(n => n.classes = n.classes.filter(c => c !== value)); return this; };
Wrapper.prototype.on = function (event, selector, fn) { if(typeof selector === 'function') { fn = selector; selector = null; } this.nodes.forEach(n => n.events.push({event, selector, fn})); return this; };
Wrapper.prototype.off = function (namespace) { this.nodes.forEach(n => n.events = n.events.filter(e => e.event.indexOf(namespace) < 0)); return this; };
Wrapper.prototype.trigger = function (name) { this.nodes.forEach(target => { let stopped=false; for(let n=target;n&&!stopped;n=n.parent) n.events.slice().forEach(e => { if(!e.event.split(/\s+/).some(v => v.split('.')[0] === name)) return; if(e.selector && !matches(target,e.selector)) return; e.fn.call(target,{currentTarget:target,target,preventDefault(){},stopPropagation(){stopped=true;},stopImmediatePropagation(){stopped=true;}}); }); }); return this; };
Wrapper.prototype.closest = function (selector) { for(let n=this[0];n;n=n.parent) if(matches(n,selector))return $(n); return $(); };
Wrapper.prototype.remove = function () { this.nodes.forEach(n => { if(n.parent)n.parent.children.splice(n.parent.children.indexOf(n),1); n.parent = null; }); return this; };
$.contains = (parent, child) => parent.contains(child);
function rect(left, top, width=100, height=40) { return {left,top,width,height,right:left+width,bottom:top+height}; }
function harness() {
    let active = {id:1}, name = 'content', collection = null, focused = null, nativeMoves = 0, backward = 0, nativeDestroy = 0, nativePause = 0, nativeStart = 0;
    const controllers = {}, routes = [], content = $('<div class="content scroll"></div>');
    const a = $('<div class="selector a"></div>'), b = $('<div class="selector b"></div>'), c = $('<div class="selector c"></div>');
    a[0].rect = rect(300,100); b[0].rect = rect(420,100); c[0].rect = rect(300,160);
    content.append(a,b,c);
    function focus(n) { n = n && n.jquery ? n[0] : n; if(!n)return; if(focused)$(focused).removeClass('focus'); focused=n;$(n).addClass('focus').trigger('hover:focus'); }
    const Lampa = {Activity:{active:()=>active, backward:()=>backward++}, Controller:{
        add:(key,c)=>controllers[key]=c,
        enabled:()=>({name,controller:controllers[name]}),
        toggle:key=>{name=key;if(controllers[key]&&controllers[key].toggle)controllers[key].toggle();},
        collectionSet:v=>collection=v,collectionFocus:focus
    }};
    const Navigator = {canmove:()=>false, move:()=>nativeMoves++, add:()=>{}};
    const window = {Lampa,$,Navigator}; const events={};
    const component = {render:js=>js?content[0]:content,
        on:(key,fn)=>events[key]=fn,
        start(){nativeStart++;const ctrl={toggle:()=>focus(a[0]),left:()=>nativeMoves++};controllers.content=ctrl;Lampa.Controller.toggle('content');},
        pause(){nativePause++;},stop(){},destroy(){nativeDestroy++;content.remove();}};
    vm.runInNewContext(source,{window,Lampa,Navigator,$,console});
    const original = {render:component.render,start:component.start};
    window.LampaYaniTvShell.wrap(component,{active:'lists',logo:'data:image/svg+xml;base64,AAAA',t:key=>({home_nav:'Home',account:'Account',settings:'Settings'}[key]||key),routes:Object.fromEntries(['home','search','lists','catalog','more','account','settings'].map(k=>[k,()=>routes.push(k)]))});
    return {component,original,content,a,b,c,Lampa,controllers,routes,events,focus,shellApi:window.LampaYaniTvShell,
        get focused(){return focused;},get enabled(){return name;},get collection(){return collection;},get nativeMoves(){return nativeMoves;},get backward(){return backward;},get nativeDestroy(){return nativeDestroy;},get nativePause(){return nativePause;},get nativeStart(){return nativeStart;},setActive:v=>active=v};
}
{
    const h=harness(), root=h.component.render();
    assert.strictEqual(h.component.render(),root,'render preserves shell and original content identity');
    assert.strictEqual(h.component.render(true),root[0],'render(js) retains Lampa DOM contract');
    assert.strictEqual(root.find('.yani-tv-shell__body')[0].children[0],h.content[0]);
    const bottom=root.find('.yani-tv-rail__bottom')[0];
    assert.deepEqual(bottom.children.map(n=>n.attrs['data-yani-rail-key']),['account','settings']);
    assert.equal(root.find('.yani-tv-rail__brand')[0].children[0].attrs.src,'data:image/svg+xml;base64,AAAA');
    const buttons=root.find('.yani-tv-rail__item');
    assert.equal(root.find('.yani-tv-rail').find('.selector').length,0,'native render scope excludes dormant rail selectors');
    assert.equal(buttons[2].attrs['aria-current'],'page','current location is distinct from focus');
    assert.equal(buttons[0].children[1].value,'Home','shared translations are used');
    let leakedRailFocus=0;root.on('hover:focus.test','.yani-tv-rail__item',()=>leakedRailFocus++);
    h.component.start();h.focus(h.b);h.controllers.content.left();
    assert.equal(h.nativeMoves,1,'Left between same-row cards retains native behavior');
    assert.equal(h.enabled,'content');
    h.focus(h.c);h.controllers.content.left();
    assert.equal(h.enabled,'yani_tv_rail','first card in another row reaches rail instead of prior row');
    assert.equal(root.find('.yani-tv-rail').find('.selector').length,7,'rail exposes its own collection only while active');
    assert.strictEqual(h.focused,buttons[2]);
    assert.equal(leakedRailFocus,0,'rail focus does not overwrite native card focus scopes');
    h.controllers.yani_tv_rail.down();assert.strictEqual(h.focused,buttons[3]);
    h.controllers.yani_tv_rail.up();assert.strictEqual(h.focused,buttons[2]);
    h.controllers.yani_tv_rail.right();assert.equal(root.find('.yani-tv-rail').find('.selector').length,0,'return excludes rail from native grid collection');assert.equal(h.enabled,'content');assert.strictEqual(h.focused,h.c[0],'Right restores exact content origin');
    h.controllers.content.left();h.controllers.yani_tv_rail.back();assert.equal(h.backward,1);
    $(buttons[5]).trigger('hover:enter');assert.deepEqual(h.routes,['account']);
    h.controllers.yani_tv_rail.left();assert.equal(h.enabled,'menu','Left from rail opens Lampa host menu');
}
{
    const h=harness();h.component.render();h.component.start();
    const ctrl=h.controllers.content,patched=ctrl.left;
    h.component.pause();assert.notStrictEqual(ctrl.left,patched,'pause restores owned native handler');
    assert.equal(h.nativePause,1);
    h.component.start();assert.equal(h.nativeStart,2);const next=h.controllers.content;
    const foreign=()=>{};next.left=foreign;h.component.stop();assert.strictEqual(next.left,foreign,'cleanup preserves later controller owner');
    h.component.start();h.component.destroy();h.component.destroy();assert.equal(h.nativeDestroy,1,'destroy is idempotent');
    assert.equal(h.component.render().length,1,'post-destroy render retains native contract without recreating shell');
}
{
    const h=harness();const root=h.component.render();h.component.start();h.controllers.content.left();
    const stale=h.controllers.yani_tv_rail,origin=h.focused;
    h.setActive({id:2});stale.down();stale.right();stale.back();$(root.find('.yani-tv-rail__item')[0]).trigger('hover:enter');
    assert.strictEqual(h.focused,origin);assert.equal(h.backward,0);assert.equal(h.routes.length,0,'stale activity cannot navigate or steal focus');
}
{
    const h=harness();h.component.start();h.controllers.content.left();h.c.remove();h.a.remove();h.b.remove();
    const replacement=$('<div class="selector replacement"></div>');h.content.append(replacement);
    h.controllers.yani_tv_rail.right();assert.strictEqual(h.focused,replacement[0],'removed content origin falls back to live replacement');
}
{
    const h=harness();h.component.start();
    const header=$('<div class="aux-header"></div>'),tab=$('<div class="selector aux-tab"></div>');header.append(tab);h.content.append(header);
    h.Lampa.Controller.add('aux-tabs',{toggle:()=>h.focus(h.a)});h.Lampa.Controller.toggle('aux-tabs');h.focus(tab);
    h.component.yaniEnterRail({controller:'aux-tabs',collection:header,origin:tab});
    assert.equal(h.enabled,'yani_tv_rail');h.controllers.yani_tv_rail.right();
    assert.equal(h.enabled,'aux-tabs','auxiliary controller survives rail visit');assert.strictEqual(h.focused,tab[0]);assert.strictEqual(h.collection,header,'auxiliary collection survives rail visit');
}
{
    // Exercise the actual registration wrapper: native constructors using this,
    // factories returning a component, repeated registration and Top delegating
    // to the already-wrapped Catalog must all produce exactly one shell.
    const h=harness(),ui=fs.readFileSync('src/ui.js','utf8');
    const snippet=ui.slice(ui.indexOf('    function tvFactory('),ui.indexOf('    window.LampaYani = {'));
    const context={window:{LampaYaniTvShell:h.shellApi,LampaYaniHome:{logo:'logo'}},LampaYaniTvShell:h.shellApi,LampaYaniHome:{logo:'logo'},t:k=>k,tvRoutes:()=>({})};
    vm.runInNewContext(snippet+';this.factory=tvFactory;',context);
    function Native(object){this.object=object;this.render=()=>h.content;}
    const Catalog=context.factory(Native,'catalog'),component=new Catalog({page:1});
    assert.ok(component instanceof Native,'native this-based constructor is preserved');assert.ok(component.yaniTvShell);
    assert.strictEqual(context.factory(Catalog,'catalog'),Catalog,'repeated registration keeps one wrapper');
    function Top(object){return Catalog(object);}
    const top=new (context.factory(Top,'catalog'))({page:2});
    assert.equal(top.render().find('.yani-tv-shell').length,0,'delegating factory does not nest the shell inside another shell');
    assert.equal(top.render().find('.yani-tv-rail').length,1);
}
console.log('TV shell runtime tests passed');

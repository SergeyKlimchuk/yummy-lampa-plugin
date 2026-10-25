'use strict';
var assert = require('assert');
var fs = require('fs');
var vm = require('vm');
var path = require('path');

var modulePath = process.env.YANI_HOME_SOURCE || path.join(__dirname, 'ui-home.js');
if (!fs.existsSync(modulePath)) modulePath = path.join(__dirname, '..', 'src', 'ui-home.js');
var source = fs.readFileSync(modulePath, 'utf8');
var insightsPath = process.env.YANI_HOME_INSIGHTS_SOURCE || path.join(path.dirname(modulePath), 'ui-home-insights.js');
if (!fs.existsSync(insightsPath)) insightsPath = path.resolve('src/ui-home-insights.js');
var insightsSource = fs.readFileSync(insightsPath, 'utf8');

// A deliberately small DOM contract: no browser package or network is needed.
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

function environment(options) {
    options = options || {};
    var store = {}, writes = [], calls = [], timers = [], eventListeners = {}, focused, scrollOptions;
    var document = new Node('document');
    document.addEventListener = function (name, handler) { (eventListeners[name] || (eventListeners[name] = [])).push(handler); };
    document.removeEventListener = function (name, handler) { eventListeners[name] = (eventListeners[name] || []).filter(function (fn) { return fn !== handler; }); };
    document.dispatch = function (name) { (eventListeners[name] || []).slice().forEach(function (fn) { fn(); }); };
    var auth = {token: 'session-42', user_id: options.noUserId ? undefined : 42, login: 'demo'};
    var histories = {};
    var cardList = Array.from({length: 20}, function (_, index) { return {anime_id: index + 1, title: 'Anime ' + (index + 1), poster: {medium: 'https://static.test/' + index + '.webp', fullsize: 'https://static.test/huge.jpg'}, year: 2026}; });
    var controller, enabled = {name: 'content', controller: null};
    var Lampa = {
        Storage: {get: function (key, fallback) { return store[key] === undefined ? fallback : store[key]; }, set: function (key, value) { writes.push(key); store[key] = value; }},
        Scroll: function (options) { scrollOptions = options; var root = $('<div class="scroll"></div>'); this.minus = function () {}; this.append = function (node) { root.append(node); }; this.update = function () {}; this.render = function (js) { return js ? root[0] : root; }; this.destroy = function () { root.remove(); }; },
        Controller: {add: function (_, value) { controller = value; }, toggle: function (name) { enabled = {name: name, controller: name === 'content' ? controller : null}; if (name === 'content') controller.toggle(); }, enabled: function () { return enabled; }, collectionSet: function () {}, collectionFocus: function (node) { focused = node; }},
        Activity: {push: function (params) { calls.push({name: 'route', params: params}); }, backward: function () {}},
        Select: {show: function (params) { calls.push({name: 'more', params: params}); }}
    };
    var api = {
        catalog: function (params, control) { calls.push({name: 'catalog', params: params, control: control}); return options.catalog ? options.catalog(params, control) : Promise.resolve({response: cardList}); },
        userListStats: function (id, control) { calls.push({name: 'userListStats', id: id, control: control}); return options.userListStats ? options.userListStats(id, control) : Promise.resolve({response: [{id: 0, count: 2}, {id: 4, count: 1}]}); },
        userLists: function () { throw new Error('The home must use lightweight statistics instead of downloading every list entry'); },
        profile: function (control) { calls.push({name: 'profile', control: control}); return options.profile ? options.profile(control) : Promise.resolve({response: {id: auth.user_id || 42}}); }
    };
    var deps = {
        t: function (key) { return key; },
        auth: {get: function () { return auth; }, token: function () { return auth.token; }}, api: api,
        continueCards: function () { return histories[auth.user_id] || cardList.slice(0, 8).map(function (item) { return Object.assign({}, item, {yani_list_progress: 0.5}); }); },
        ensureRemoteHistory: function () { calls.push({name: 'sharedHistory'}); return Promise.resolve({imported: 0}); },
        toCard: function (value) { return value; },
        accountListDefinitions: function () { return ['watching', 'planned', 'completed', 'dropped', 'favorites', 'postponed'].map(function (key, id) { return {id: id, key: key, title: 'List ' + id}; }); },
        openUserListShortcut: function (definition) { calls.push({name: 'list', id: definition.id}); },
        homeSectionEnabled: function (key) { return !(options.hidden || []).includes(key); },
        openYummyDetail: function (card, notifyFallback) { calls.push({name: 'detail', id: card.anime_id, notifyFallback: notifyFallback}); },
        resumeCard: function (card) { calls.push({name: 'resume', id: card.anime_id, card: card}); },
        openAccount: function () { calls.push({name: 'account'}); }, openSettings: function () {}
    };
    var window = {Lampa: Lampa, $: $, AbortController: AbortController, Navigator: {canmove: options.canmove || function () { return true; }, move: function () {}}};
    vm.runInNewContext(insightsSource, {window: window});
    deps.listCounts = window.LampaYaniHomeInsights.listCounts;
    vm.runInNewContext(source, {window: window, document: document, $: $, Promise: Promise, setTimeout: function (fn) { var timer = {fn: fn, live: true}; timers.push(timer); return timer; }, clearTimeout: function (timer) { timer.live = false; }, Date: Date, console: console});
    function make() { var component = window.LampaYaniHome.create({}, deps); component.activity = {loader: function () {}}; component.create(); return component; }
    return {
        module: window.LampaYaniHome, make: make, store: store, writes: writes, calls: calls, document: document, deps: deps,
        timers: function () { timers.splice(0).forEach(function (timer) { if (timer.live) timer.fn(); }); },
        switchUser: function (id) { auth = {user_id: id, token: 'session-' + id, login: 'demo-' + id}; document.dispatch('yani:auth-changed'); },
        histories: histories, focus: function () { return focused; }, listeners: eventListeners,
        controller: function () { return controller; }, enabled: function () { return enabled; },
        scrollOptions: function () { return scrollOptions; }
    };
}

async function run() {
    var env = environment();
    assert.notStrictEqual(env.make(), env.make(), 'Factory must return independent component instances');
    var component = env.make();
    assert.strictEqual(env.calls.length, 0, 'The initial shell must not wait for requests');
    assert.strictEqual(env.scrollOptions().mask, false, 'A static home does not need the GPU scroll mask');
    assert.strictEqual(env.scrollOptions().nopadding, true, 'The home supplies its own compact bottom spacing');
    assert.strictEqual(env.scrollOptions().notransition, true, 'Remote navigation should use the shared immediate scroll mode');
    assert.strictEqual(component.render().find('.yani-lite-resume').length, 3);
    component.start(); env.timers(); await settle();
    assert.strictEqual(env.calls.filter(function (c) { return c.name === 'catalog'; }).length, 1);
    assert.strictEqual(env.calls.filter(function (c) { return c.name === 'userListStats'; }).length, 1);
    assert.strictEqual(env.calls.filter(function (c) { return c.name === 'sharedHistory'; }).length, 1);
    assert.strictEqual(component.render().find('.yani-lite-card').length, 6);
    assert.ok(component.render().find('.selector').length <= 30, 'TV focus collection must remain bounded');
    assert.ok(descendants(component.render(true), '', []).length < 220, 'The homepage must not build the old dashboard DOM');
    var catalogCall = env.calls.find(function (call) { return call.name === 'catalog'; });
    assert.strictEqual(catalogCall.params.limit, 6);
    assert.strictEqual(catalogCall.params.status, 'ongoing');
    assert.strictEqual(env.store.yani_lite_ongoing_v1.items.length, 6);
    assert.strictEqual(env.store.yani_lite_counts_v1.counts.watching, 2);
    assert.strictEqual(env.store.yani_lite_counts_v1.counts.favorites, 1);
    assert.strictEqual(env.store.yani_lite_counts_v1.counts.completed, 0);
    assert.ok(!JSON.stringify(env.store.yani_lite_ongoing_v1).includes('session-42'), 'Public card cache must not contain credentials');
    console.log('PASS: immediate shell, bounded DOM and one catalog/statistics/history task');

    var actionEnv = environment();
    var resumeSource = {anime_id: 4207, title: 'Resume exact episode', yani_list_progress: 0.25,
        yani_resume: {number: '7', video_id: 'episode-4207', time: 333, duration: 1440,
            player: 'Kodik', voice: 'Example dub', updated_at: 1720000000000}};
    actionEnv.histories[42] = [resumeSource];
    var actionPage = actionEnv.make(); actionPage.start(); actionEnv.timers(); await settle();
    $(actionPage.render().find('.yani-lite-resume')[0]).trigger('hover:enter');
    var resumeCall = actionEnv.calls.find(function (call) { return call.name === 'resume'; });
    assert.ok(resumeCall, 'Continue Watching must invoke the existing playback flow');
    assert.strictEqual(resumeCall.card, resumeSource, 'The original card carries the episode and playback position through unchanged');
    assert.deepStrictEqual(resumeCall.card.yani_resume, resumeSource.yani_resume);
    assert.strictEqual(actionEnv.calls.filter(function (call) { return call.name === 'detail'; }).length, 0,
        'Continue Watching must not become an extra details-page step');
    $(actionPage.render().find('.yani-lite-card')[0]).trigger('hover:enter');
    var detailCall = actionEnv.calls.find(function (call) { return call.name === 'detail'; });
    assert.ok(detailCall, 'Public catalog cards still open the existing anime details');
    assert.strictEqual(detailCall.notifyFallback, false, 'Opening a Yummy title must not show a failed-Lampa-match notification');
    actionPage.destroy();
    console.log('PASS: Continue Watching resumes the exact episode while catalog cards open details without a false failure notice');

    var edgeEnv = environment({canmove: function () { return false; }});
    var edgePage = edgeEnv.make(); edgePage.start();
    edgeEnv.controller().up();
    assert.strictEqual(edgeEnv.enabled().name, 'head', 'Up at the first row must reach the standard Lampa header');
    edgeEnv.controller().left();
    assert.strictEqual(edgeEnv.enabled().name, 'menu', 'Left at the page edge must still reach the Lampa menu');
    edgePage.destroy();
    console.log('PASS: D-pad boundaries retain access to the standard Lampa header and menu');

    var selected = component.render().find('.yani-lite-card')[2];
    for (var step = 0; step < 20; step++) $(selected).trigger('hover:focus');
    assert.strictEqual(env.writes.filter(function (key) { return key === 'yani_lite_home_focus'; }).length, 0);
    component.stop();
    assert.strictEqual(env.writes.filter(function (key) { return key === 'yani_lite_home_focus'; }).length, 1);
    component.start();
    assert.strictEqual(env.focus().attrs['data-yani-home-key'], selected.attrs['data-yani-home-key']);
    assert.strictEqual(env.writes.filter(function (key) { return key === 'yani_lite_home_focus'; }).length, 1);
    console.log('PASS: stable focus restoration with no per-key storage writes');

    component.stop();
    var beforePause = component.render().text();
    env.histories[42] = [{anime_id: 901, title: 'Paused page must wait', yani_list_progress: 0.1}];
    $(env.document).trigger('yani:watch-progress');
    assert.strictEqual(component.render().text(), beforePause, 'A hidden homepage must not rebuild for player progress events');
    var pausedCalls = env.calls.length;
    env.switchUser(55);
    assert.strictEqual(env.calls.length, pausedCalls, 'A paused homepage must not start requests on an auth event');
    component.start(); await settle();
    assert.ok(env.calls.length > pausedCalls);
    console.log('PASS: hidden pages defer progress rendering and account requests until resumed');

    var envCached = environment();
    envCached.store.yani_lite_ongoing_v1 = {at: Date.now(), items: [{anime_id: 81, title: 'Cached', poster: 'https://example.test/81.webp'}]};
    var cached = envCached.make(); cached.start(); envCached.timers(); await settle();
    assert.strictEqual(envCached.calls.filter(function (c) { return c.name === 'catalog'; }).length, 0);
    assert.ok(cached.render().text().includes('Cached'));
    console.log('PASS: fresh public snapshot paints without another catalog request');

    var oldLists = defer(), newLists = defer();
    var envRace = environment({userListStats: function (id) { return id === 42 ? oldLists.promise : newLists.promise; }});
    var race = envRace.make(); race.start(); envRace.timers(); await settle();
    envRace.switchUser(77);
    oldLists.resolve({response: [{id: 0, count: 900}, {id: 4, count: 500}]});
    await settle();
    assert.ok(!envRace.store.yani_lite_counts_v1 || envRace.store.yani_lite_counts_v1.owner !== '42');
    newLists.resolve({response: []}); await settle();
    assert.strictEqual(envRace.store.yani_lite_counts_v1.owner, '77');
    assert.strictEqual(envRace.store.yani_lite_counts_v1.counts.watching, 0);
    console.log('PASS: account change rejects late private counts from the old session');

    var pending = defer();
    var envDestroy = environment({catalog: function () { return pending.promise; }});
    var closed = envDestroy.make(); closed.start(); envDestroy.timers(); await settle();
    var signal = envDestroy.calls.find(function (c) { return c.name === 'catalog'; }).control.signal;
    closed.destroy();
    assert.strictEqual(signal.aborted, true);
    pending.resolve({response: [{anime_id: 333, title: 'Late response'}]}); await settle();
    assert.strictEqual(envDestroy.store.yani_lite_ongoing_v1, undefined);
    assert.strictEqual(envDestroy.listeners['yani:auth-changed'].length, 0);
    assert.strictEqual(envDestroy.document.events.length, 0);
    console.log('PASS: teardown aborts owned work, removes listeners and ignores late responses');

    var profilePending = defer();
    var envProfile = environment({noUserId: true, profile: function () { return profilePending.promise; }});
    var profilePage = envProfile.make(); profilePage.start(); envProfile.timers(); await settle();
    var profileCall = envProfile.calls.find(function (call) { return call.name === 'profile'; });
    assert.ok(profileCall.control.signal, 'The account-ID lookup is owned by the homepage lifecycle');
    profilePage.destroy();
    assert.strictEqual(profileCall.control.signal.aborted, true);
    profilePending.resolve({response: {id: 42}}); await settle();
    assert.strictEqual(envProfile.calls.filter(function (call) { return call.name === 'userListStats'; }).length, 0,
        'Closing the homepage during its ID lookup must not start a later private request');
    console.log('PASS: missing account IDs use a cancellable lookup with no post-destroy statistics request');

    for (var profileVariant of [{id: 42}, {user_id: 42}, {user: {id: 42}}]) {
        var envProfileShape = environment({noUserId: true, profile: function () { return Promise.resolve({response: profileVariant}); }});
        var profileShapePage = envProfileShape.make(); profileShapePage.start(); envProfileShape.timers(); await settle();
        assert.strictEqual(envProfileShape.calls.find(function (call) { return call.name === 'userListStats'; }).id, 42,
            'The homepage must accept the same account-ID shapes as the existing account-list flow');
        profileShapePage.destroy();
    }
    console.log('PASS: profile ID aliases reuse the shared account-list compatibility behavior');

    var envHidden = environment({hidden: ['continue_watching', 'user_lists', 'catalog', 'new_releases']});
    var hidden = envHidden.make(); hidden.start(); envHidden.timers(); await settle();
    assert.strictEqual(envHidden.calls.filter(function (c) { return c.name === 'catalog' || c.name === 'userListStats'; }).length, 0);
    assert.strictEqual(hidden.render().find('.yani-lite-categories').length, 0);
    var more = hidden.render().find('.yani-lite-nav').nodes.find(function (node) { return node.attrs['data-yani-home-key'] === 'nav:more'; });
    $(more).trigger('hover:enter');
    var menu = envHidden.calls.find(function (call) { return call.name === 'more'; });
    assert.ok(menu.params.items.some(function (item) { return item.key === 'notifications'; }));
    assert.ok(menu.params.items.some(function (item) { return item.key === 'status'; }));
    console.log('PASS: visibility settings skip hidden requests while secondary routes remain reachable');

    var publicValue = env.module.publicCard({anime_id: 1, title: '<img onerror="x">', poster: {medium: '//static.test/small.webp', fullsize: 'https://static.test/large.webp'}, user: {token: 'secret'}});
    assert.strictEqual(publicValue.poster, 'https://static.test/small.webp');
    assert.strictEqual(publicValue.user, undefined);
    assert.strictEqual(env.module.publicCard({poster: 'javascript:bad'}).poster, '');
    console.log('PASS: safe thumbnail normalization keeps credentials out of public cache data');
    console.log('All lightweight homepage runtime checks passed');
}

run().catch(function (error) { console.error(error.stack); process.exitCode = 1; });

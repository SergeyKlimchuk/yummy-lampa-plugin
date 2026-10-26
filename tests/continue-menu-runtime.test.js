'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('src/ui-playback-history.js', 'utf8');

// Model capture ordering explicitly: Lampa dispatches non-bubbling native
// hover events, and its Card listeners already exist when cardRender runs.
function Node() { this.nodeType = 1; this.isConnected = true; this.listeners = []; this.attrs = {}; }
Node.prototype.addEventListener = function (type, fn, capture) { this.listeners.push({type, fn, capture: !!capture}); };
Node.prototype.removeEventListener = function (type, fn, capture) {
    this.listeners = this.listeners.filter((item) => item.type !== type || item.fn !== fn || item.capture !== !!capture);
};
Node.prototype.dispatch = function (type) {
    const event = {type, target: this, currentTarget: this, defaultPrevented: false,
        preventDefault() { this.defaultPrevented = true; },
        stopImmediatePropagation() { this.stopped = true; }};
    const list = this.listeners.filter((item) => item.type === type);
    for (const capture of [true, false]) {
        for (const listener of list) {
            if (listener.capture !== capture) continue;
            listener.fn(event);
            if (event.stopped) return event;
        }
    }
    return event;
};
function Wrapper(nodes) { this.jquery = true; this.nodes = nodes || []; this.length = this.nodes.length; this.nodes.forEach((n, i) => { this[i] = n; }); }
function $(value) { return value && value.jquery ? value : new Wrapper(value && value.nodeType ? [value] : []); }
Wrapper.prototype.on = function (types, handler) {
    types.split(/\s+/).forEach((spec) => this.nodes.forEach((node) => {
        const fn = (event) => handler.call(node, event);
        node.addEventListener(spec.split('.')[0], fn, false);
        node.listeners[node.listeners.length - 1].spec = spec;
    }));
    return this;
};
Wrapper.prototype.off = function (types) {
    this.nodes.forEach((node) => { node.listeners = node.listeners.filter((item) => !types.split(/\s+/).some((spec) => {
        if (!item.spec) return false;
        return spec[0] === '.' ? item.spec.includes(spec) : spec.includes('.') ? item.spec === spec : item.type === spec;
    })); });
    return this;
};
Wrapper.prototype.find = function () { return new Wrapper(); };
Wrapper.prototype.first = function () { return this; };
Wrapper.prototype.add = function (other) { return new Wrapper(Array.from(new Set(this.nodes.concat($(other).nodes)))); };
Wrapper.prototype.addClass = function () { return this; };
Wrapper.prototype.attr = function (name, value) { this.nodes.forEach((node) => { node.attrs[name] = value; }); return this; };
Wrapper.prototype.closest = function () { return this.length ? $(this[0].collection) : new Wrapper(); };

function environment(options) {
    options = options || {};
    let activity = {component: 'yani_history'}, owner = 'alice', token = 'first', clock = 1000;
    let enabled = {name: 'items_line'}, menu, sharedPanel;
    const calls = {resume: [], detail: [], controller: [], focus: [], nativeMenu: 0, nativeEnter: 0, scheduled: []};
    const lampa = {
        Activity: {active: () => activity},
        Controller: {
            enabled: () => enabled,
            toggle: (name) => { calls.controller.push(name); enabled = {name}; },
            collectionSet() {}, collectionFocus: (node) => calls.focus.push(node)
        },
        Select: {show: (params) => { menu = params; enabled = {name: 'select'}; }}
    };
    const window = {Lampa: lampa, LampaYaniAuth: {get: () => ({login: owner}), token: () => token}};
    if (options.panel) window.LampaYaniChoicePanel = {show: params => {
        if (sharedPanel) sharedPanel.destroy('replace');
        const before = enabled.name;
        menu = params; enabled = {name: 'yani_choice_panel'};
        const handle = {closed: false, destroy: reason => {
            if (handle.closed) return;
            handle.closed = true;
            params.onClose(reason || 'destroy');
        }};
        handle.select = key => {
            if (handle.closed) return;
            handle.closed = true;
            if (params.valid()) {
                lampa.Controller.toggle(before); lampa.Controller.collectionFocus(params.origin[0]);
            }
            params.onClose('select'); params.onSelect(params.items.find(item => item.key === key));
        };
        handle.back = () => {
            if (handle.closed) return;
            handle.closed = true;
            if (params.valid()) {
                lampa.Controller.toggle(before); lampa.Controller.collectionFocus(params.origin[0]);
            }
            params.onClose('back'); if (params.onBack) params.onBack();
        };
        sharedPanel = handle;
        return handle;
    }};
    const context = {window, $, Date: {now: () => clock}, console};
    vm.runInNewContext(source, context);
    const progress = {owner: () => ({key: token ? owner : 'anonymous'}), sameOwner: (left, right) => left.key === right.key};
    const api = window.LampaYaniPlaybackHistory.create({
        progress: options.fallbackOwner ? undefined : progress,
        t: (key) => key,
        openVideos: (card, resume) => calls.resume.push({card, resume}),
        openYummyDetail: (card, fallback) => calls.detail.push({card, fallback}),
        bindYummyCardRender: (element, card) => {
            // The generic binder has already bound these before history replaces them.
            $(element).on('hover:enter.yaniOpen click.yaniOpen', () => calls.nativeEnter++);
            card.onMenu = () => calls.nativeMenu++;
        }
    });
    function node() { const value = new Node(); value.collection = new Node(); return value; }
    function host(value, cardApi) {
        value.addEventListener('hover:long', () => { calls.nativeMenu++; if (cardApi && cardApi.onMenu) cardApi.onMenu(); });
        value.addEventListener('hover:enter', () => { calls.nativeEnter++; if (cardApi && cardApi.onEnter) cardApi.onEnter(); });
        value.addEventListener('click', () => calls.scheduled.push(() => value.dispatch('hover:enter')));
    }
    return {api, calls, node, host, menu: () => menu, shared: () => sharedPanel,
        advance: (ms) => { clock += ms; },
        flush: () => { const pending = calls.scheduled.splice(0); clock += 20; pending.forEach((fn) => fn()); },
        activity: () => { activity = {component: 'other'}; },
        account: (name) => { owner = name; }, token: (value) => { token = value; }};
}
function card(id) { return {yani_id: id, title: 'Anime ' + id, yani_resume: {video_id: 4207, time: 93, number: '7', player: 'Kodik', dubbing: 'Studio'}}; }

{
    const env = environment(), node = env.node(), entry = card(42);
    env.host(node);
    node.addEventListener('hover:enter', () => env.calls.resume.push({card: entry}));
    env.api.bindContinueMenu($(node), entry);
    node.dispatch('hover:long');
    assert.equal(env.calls.nativeMenu, 0, 'capture must preempt the old native Card menu');
    assert.equal(env.menu().title, entry.title);
    assert.deepEqual(Array.from(env.menu().items, (item) => item.key), ['resume', 'detail']);
    assert.deepEqual(Array.from(env.menu().items, (item) => item.title), ['continue_watching', 'open_anime_card']);
    node.dispatch('hover:enter');
    node.dispatch('click');
    env.flush();
    assert.equal(env.calls.resume.length, 0, 'hold and release may not resume or queue a delayed resume');
    assert.equal(env.calls.scheduled.length, 0);
    env.menu().onBack();
    assert.deepEqual(env.calls.controller, ['items_line']);
    assert.equal(env.calls.focus[0], node, 'Back must restore the same card');
    node.dispatch('mousedown');
    node.dispatch('click');
    env.flush();
    assert.equal(env.calls.resume.length, 1, 'the next deliberate pointer click must work immediately after Back');
}

{
    const env = environment(), node = env.node();
    env.host(node);
    node.addEventListener('hover:enter', () => env.calls.resume.push({}));
    env.api.bindContinueMenu(node, card(3));
    node.dispatch('hover:long');
    env.menu().onBack();
    env.advance(2000);
    node.dispatch('click'); env.flush();
    assert.equal(env.calls.resume.length, 0, 'a late release after Back must still be consumed');
    node.dispatch('mousedown'); node.dispatch('click'); env.flush();
    assert.equal(env.calls.resume.length, 1, 'a fresh pointer press must clear the late-release guard');
    node.dispatch('hover:long');
    env.menu().onBack();
    node.dispatch('hover:enter');
    assert.equal(env.calls.resume.length, 1, 'an enter already queued by the host must not autoplay after Back');
    env.advance(100); node.dispatch('hover:enter');
    assert.equal(env.calls.resume.length, 2, 'the next keyboard tap must not stay locked after Back');
}

for (const action of ['resume', 'detail']) {
    const env = environment(), node = env.node(), entry = card(42);
    env.api.bindContinueMenu(node, entry);
    node.dispatch('hover:long');
    const menu = env.menu();
    menu.onSelect(menu.items.find((item) => item.key === action));
    menu.onSelect(menu.items[0]);
    assert.equal(env.calls[action].length, 1, 'one selection must act once');
    assert.equal(env.calls[action][0].card, entry, 'selection must retain the original card and exact resume metadata');
    if (action === 'resume') assert.strictEqual(env.calls.resume[0].resume, true);
    else assert.strictEqual(env.calls.detail[0].fallback, false);
    assert.deepEqual(env.calls.controller, ['items_line']);
    assert.equal(env.calls[action === 'resume' ? 'detail' : 'resume'].length, 0);
}

for (const invalidation of ['activity', 'account', 'logout', 'valid', 'disconnect', 'destroy']) {
    const env = environment(), node = env.node();
    let valid = true;
    const state = env.api.bindContinueMenu(node, card(1), {valid: () => valid});
    node.dispatch('hover:long');
    if (invalidation === 'activity') env.activity();
    if (invalidation === 'account') env.account('bob');
    if (invalidation === 'logout') env.token('');
    if (invalidation === 'valid') valid = false;
    if (invalidation === 'disconnect') node.isConnected = false;
    if (invalidation === 'destroy') state.destroy();
    env.menu().onSelect(env.menu().items[0]);
    assert.equal(env.calls.resume.length, 0, invalidation + ' must invalidate stale selection');
    assert.equal(env.calls.controller.length, 0, invalidation + ' must not restore an obsolete controller');
}

for (const fallbackOwner of [false, true]) {
    const env = environment({fallbackOwner}), node = env.node();
    env.api.bindContinueMenu(node, card(1));
    node.dispatch('hover:long');
    env.token('rotated-token');
    env.menu().onSelect(env.menu().items[0]);
    assert.equal(env.calls.resume.length, 1, 'rotating the same account token must preserve menu ownership');
}

{
    const env = environment(), node = env.node(), old = card(1), fresh = card(2);
    env.api.bindContinueMenu(node, old);
    node.dispatch('hover:long');
    const staleMenu = env.menu();
    env.api.bindContinueMenu(node, fresh);
    const count = node.listeners.length;
    env.api.bindContinueMenu(node, fresh);
    assert.equal(node.listeners.length, count, 'repeated render must replace event listeners');
    staleMenu.onSelect(staleMenu.items[0]);
    assert.equal(env.calls.resume.length, 0, 'a replaced card invalidates its old menu');
    node.dispatch('hover:long');
    env.menu().onSelect(env.menu().items[0]);
    assert.equal(env.calls.resume.length, 1);
    assert.equal(env.calls.resume[0].card, fresh, 'rebind must not retain the old card');
}

for (const format of ['legacy', 'reordered', 'node']) {
    const env = environment(), node = env.node(), entry = card(42);
    const cardApi = {render: () => node};
    env.host(node, cardApi);
    node.card_data = entry;
    if (format === 'legacy') env.api.bindHistoryCardRender({title: 'Continue Watching'}, entry, cardApi);
    if (format === 'reordered') env.api.bindHistoryCardRender(cardApi, entry, {title: 'Continue Watching'});
    if (format === 'node') env.api.bindHistoryCardRender(node);
    node.dispatch('hover:enter');
    assert.equal(env.calls.resume.length, 1, format + ': a tap must resume exactly once before native defaults');
    assert.equal(env.calls.nativeEnter, 0, format + ': native TMDB open must be preempted');
    assert.equal(env.calls.resume[0].card, entry);
    node.dispatch('click'); env.flush();
    assert.equal(env.calls.resume.length, 2, format + ': a mouse tap must not queue a second resume');
    node.dispatch('hover:long');
    node.dispatch('click'); env.flush();
    assert.equal(env.calls.resume.length, 2, format + ': holding the card must not resume');
    env.menu().onSelect(env.menu().items[1]);
    assert.equal(env.calls.detail.length, 1, format + ': hold must offer the anime card');
}

{
    const env = environment(), node = env.node(), entry = card(7), actions = [];
    env.api.bindContinueMenu(node, entry, {resume: (value) => actions.push(['resume', value]), detail: (value) => actions.push(['detail', value])});
    node.dispatch('hover:long'); env.menu().onSelect(env.menu().items[0]);
    env.advance(100); node.dispatch('hover:long'); env.menu().onSelect(env.menu().items[1]);
    assert.deepEqual(actions.map((row) => row[0]), ['resume', 'detail']);
    assert.ok(actions.every((row) => row[1] === entry));
    assert.equal(env.calls.resume.length + env.calls.detail.length, 0, 'caller callbacks must override the defaults');
}
console.log('Continue Watching native hold, menu actions, ownership, rebind and history event runtime checks passed');


// The production choice component replaces the oversized native Select without
// weakening hold/release suppression or card/account ownership.
{
    const env = environment({panel: true}), node = env.node(), entry = card(42);
    env.host(node);
    const binding = env.api.bindContinueMenu(node, entry);
    node.dispatch('hover:long');
    assert.equal(env.menu().compact, true);
    assert.strictEqual(env.menu().origin[0], node);
    assert.strictEqual(env.menu().context.title, entry.title);
    assert.equal(env.calls.nativeMenu, 0);
    node.dispatch('click'); env.flush();
    assert.equal(env.calls.resume.length, 0);
    env.shared().select('detail');
    assert.strictEqual(env.calls.detail[0].card, entry);
    assert.equal(env.calls.resume.length, 0);
    assert.equal(binding.menuOpen, false, 'onClose releases the card after selection');
    assert.strictEqual(binding.panel, null);
    assert.strictEqual(env.calls.focus[0], node);
    node.dispatch('hover:long');
    const oldMenu = env.menu();
    binding.destroy();
    assert.equal(env.shared().closed, true, 'teardown closes its shared overlay without restoring');
    oldMenu.onSelect(oldMenu.items[0]);
    assert.equal(env.calls.resume.length, 0, 'destroyed overlay callbacks cannot resume');
}
for (const reason of ['replace', 'invalid']) {
    const env = environment({panel: true}), node = env.node();
    const binding = env.api.bindContinueMenu(node, card(1));
    node.dispatch('hover:long');
    const stale = env.menu(); env.shared().destroy(reason);
    assert.equal(binding.menuOpen, false, reason + ' must unlock the previous card');
    assert.strictEqual(binding.panel, null);
    stale.onSelect(stale.items[0]);
    assert.equal(env.calls.resume.length, 0, 'a dismissed shared menu cannot act later');
}
{
    const env = environment({panel: true}), node = env.node();
    const binding = env.api.bindContinueMenu(node, card(1));
    node.dispatch('hover:long'); env.account('bob'); env.shared().select('resume');
    assert.equal(env.calls.resume.length, 0);
    assert.equal(env.calls.controller.length, 0, 'stale shared menu may not restore the prior account controller');
    assert.equal(binding.menuOpen, false);
}
console.log('Continue Watching shared side-panel actions, release guard and invalidation passed');

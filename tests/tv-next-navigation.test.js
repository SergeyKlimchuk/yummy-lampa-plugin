'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// Native EventTarget dispatch exercises cancellation and listener teardown. The
// tiny DOM below supplies only layout/focus primitives; no browser dependency.
class Element extends EventTarget {
    constructor(doc, tag, key, rect, row) {
        super(); this.doc = doc; this.tagName = tag.toUpperCase(); this.parentElement = null;
        this.children = []; this.attrs = {}; this.disabled = false; this.hidden = false; this.isConnected = true;
        if (key) this.attrs['data-focus'] = key;
        if (row) this.attrs['data-row'] = row;
        this.rect = rect || [0, 0, 1, 1]; this.activations = 0; this.scrollCalls = [];
        const values = new Set();
        this.classList = {add: key => values.add(key), remove: key => values.delete(key), contains: key => values.has(key)};
        this.addEventListener('click', () => this.activations++);
    }
    append(node) { node.parentElement = this; this.children.push(node); return node; }
    contains(node) { return node === this || this.children.some(child => child.contains(node)); }
    getAttribute(key) { return Object.prototype.hasOwnProperty.call(this.attrs, key) ? this.attrs[key] : null; }
    setAttribute(key, value) { this.attrs[key] = String(value); }
    querySelectorAll(selector) {
        assert.equal(selector, '[data-focus]');
        const all = [];
        const visit = node => node.children.forEach(child => { if (child.getAttribute('data-focus')) all.push(child); visit(child); });
        visit(this); return all;
    }
    getBoundingClientRect() { const [left, top, width, height] = this.rect; return {left, top, width, height, right: left + width, bottom: top + height}; }
    focus() { this.doc.activeElement = this; this.doc.send('focusin', this); }
    scrollIntoView(options) { this.scrollCalls.push(options); }
    click() { const e = this.doc.send('click', this, {detail: 0}); if (!e.defaultPrevented) this.dispatchEvent(new Event('click')); }
}
class Document extends EventTarget {
    constructor() { super(); this.activeElement = null; this.nodes = {}; }
    querySelector(selector) { return this.nodes[selector] || null; }
    send(type, target, options = {}) {
        const event = new Event(type, {cancelable: true});
        Object.defineProperty(event, 'target', {get: () => target});
        Object.assign(event, options); this.dispatchEvent(event); return event;
    }
}
function environment() {
    const document = new Document(), timers = new Map(); let serial = 0, clock = 1000, activePanel = false, backs = 0;
    const root = new Element(document, 'main'), panel = new Element(document, 'aside'); panel.hidden = true;
    document.nodes['#tv-app'] = root; document.nodes['#tv-panel'] = panel;
    const elements = {};
    function add(key, x, y, row, container = root, tag = 'button', width = 90) {
        const node = new Element(document, tag, key, [x, y, width, 40], row); elements[key] = container.append(node); return node;
    }
    add('a', 100, 100, 'row1'); add('b', 210, 100, 'row1'); add('c', 320, 100, 'row1');
    add('d', 100, 180, 'row2'); add('e', 210, 180, 'row2'); add('f', 320, 180, 'row2');
    add('g', 100, 260, 'row3'); add('h', 210, 260, 'row3');
    add('nav1', 0, 100, 'nav1', root, 'button', 70); add('nav2', 0, 160, 'nav2', root, 'button', 70);
    add('search', 100, 20, 'search', root, 'input', 310);
    add('p1', 600, 80, 'p1', panel, 'button', 150); add('p2', 600, 140, 'p2', panel, 'button', 150);
    const holdCalls = [];
    const options = {
        root,
        initialFocus: 'a',
        scope: () => activePanel ? panel : root,
        onBack: () => backs++,
        onHold: (key, node) => holdCalls.push({key, node})
    };
    const window = {
        document,
        setTimeout: (fn, delay) => { const id = ++serial; timers.set(id, {fn, at: clock + delay}); return id; },
        clearTimeout: id => timers.delete(id)
    };
    const context = {window, Date: class extends Date { static now() { return clock; } }};
    vm.runInNewContext(fs.readFileSync('docs/mockups/tv-next/navigation.js', 'utf8'), context);
    const api = window.YaniTVNavigation;
    function advance(ms) {
        clock += ms;
        for (const [id, timer] of Array.from(timers)) if (timer.at <= clock) { timers.delete(id); timer.fn(); }
    }
    function key(key, type = 'keydown', target = document.activeElement, extra = {}) { return document.send(type, target, {key, ...extra}); }
    api.start(options);
    return {api, options, root, panel, elements, document, key, advance, timers, holdCalls, backs: () => backs,
        openPanel() { activePanel = true; panel.hidden = false; api.reset('p1'); },
        closePanel() { activePanel = false; panel.hidden = true; api.reset('a'); }};
}

const env = environment(), {api, elements, key} = env;
assert.equal(api.current(), 'a');
key('ArrowRight'); assert.equal(api.current(), 'b');
key('ArrowDown'); assert.equal(api.current(), 'e', 'vertical navigation preserves column');
key('ArrowDown'); assert.equal(api.current(), 'h');
key('ArrowRight'); assert.equal(api.current(), 'h', 'right edge never wraps into a distant row');
api.focus('c'); key('ArrowDown'); assert.equal(api.current(), 'f');
key('ArrowDown'); assert.equal(api.current(), 'h', 'short row uses nearest available column');
key('ArrowUp'); assert.equal(api.current(), 'f', 'original column is restored after a short row');
api.focus('nav1'); key('ArrowDown'); assert.equal(api.current(), 'nav2', 'vertical sidebar navigation stays in sidebar');

api.focus('a'); elements.a.setAttribute('data-nav-down', 'h'); key('ArrowDown');
assert.equal(api.current(), 'h', 'explicit focus target precedes geometry');
elements.h.setAttribute('data-nav-right', 'none'); key('ArrowRight'); assert.equal(api.current(), 'h');
elements.a.setAttribute('data-nav-down', 'missing'); api.focus('a'); key('ArrowDown'); assert.equal(api.current(), 'd', 'missing explicit target uses safe geometry');

api.focus('a'); key('Enter'); key('Enter', 'keydown', elements.a, {repeat: true});
assert.equal(elements.a.activations, 0, 'key down cannot activate');
key('Enter', 'keyup'); assert.equal(elements.a.activations, 1, 'one short press produces exactly one real click');
elements.a.click(); assert.equal(elements.a.activations, 1, 'a duplicated release click is suppressed');
env.document.send('pointerdown', elements.a); elements.a.click(); assert.equal(elements.a.activations, 2, 'next deliberate pointer click works immediately');

key('Enter'); env.advance(799); assert.equal(env.holdCalls.length, 0);
env.advance(1); assert.equal(env.holdCalls.length, 1); assert.equal(env.holdCalls[0].key, 'a');
key('Enter', 'keyup'); assert.equal(elements.a.activations, 2, 'long press never falls through to short activation');
key('Enter'); key('Enter', 'keyup'); assert.equal(elements.a.activations, 3, 'next deliberate keyboard press works immediately');

env.options.onHold = () => env.openPanel();
key('Enter'); env.advance(800); assert.equal(api.current(), 'p1');
key('Enter', 'keyup', elements.p1); assert.equal(elements.p1.activations, 0, 'hold release cannot select newly opened panel item after reset');
assert.equal(elements.a.activations, 3);
elements.p1.setAttribute('data-nav-left', 'a'); key('ArrowLeft'); assert.equal(api.current(), 'p1', 'explicit target cannot escape active panel');
key('ArrowDown'); assert.equal(api.current(), 'p2'); key('ArrowDown'); assert.equal(api.current(), 'p2', 'panel bottom edge stays put');
key('Tab'); assert.equal(api.current(), 'p1', 'native Tab is trapped inside open panel');
key('Tab', 'keydown', elements.p1, {shiftKey: true}); assert.equal(api.current(), 'p2');
key('Escape'); assert.equal(env.backs(), 1);
env.closePanel();

api.focus('search');
assert.equal(key('a').defaultPrevented, false, 'typing is native');
assert.equal(key('ArrowLeft').defaultPrevented, false, 'text caret movement is native');
assert.equal(key('Backspace').defaultPrevented, false, 'editing cannot navigate back');
assert.equal(env.backs(), 1);
assert.equal(key('Enter').defaultPrevented, false, 'input Enter remains available to the search form');
key('ArrowDown'); assert.equal(api.current(), 'b', 'input vertical arrow enters results nearest its center');
key('', 'keydown', elements.b, {keyCode: 461}); assert.equal(env.backs(), 2, 'LG Back code works');
key('', 'keydown', elements.b, {keyCode: 10009}); assert.equal(env.backs(), 3, 'TV Back code works');

api.focus('a'); elements.b.disabled = true; key('ArrowRight'); assert.equal(api.current(), 'c', 'disabled controls are skipped');
elements.b.disabled = false; elements.c.hidden = true; api.focus('b'); key('ArrowRight'); assert.equal(api.current(), 'b', 'hidden controls do not create an edge exit');
elements.c.hidden = false;
const oldScrollCount = elements.e.scrollCalls.length;
elements.e.focus(); assert.equal(api.current(), 'e', 'native mouse focus updates navigation');
assert.ok(elements.e.classList.contains('is-focused'));
assert.ok(!elements.b.classList.contains('is-focused'));
assert.equal(elements.e.scrollCalls.length, oldScrollCount, 'native focus is not scrolled again by a handler');
api.focus('d'); assert.equal(elements.d.scrollCalls.slice(-1)[0].behavior, 'auto', 'remote scrolling never animates');

api.focus('a'); key('Enter'); api.destroy(); env.advance(1000);
key('Enter', 'keyup', elements.a); assert.equal(env.holdCalls.length, 1, 'destroy cancels pending hold callback');
const before = elements.a.activations;
key('Enter', 'keydown', elements.a); key('Enter', 'keyup', elements.a); assert.equal(elements.a.activations, before, 'destroy removes activation listeners');
api.start(env.options); api.start(env.options); key('Enter'); key('Enter', 'keyup');
assert.equal(elements.a.activations, before + 1, 'starting again does not duplicate listeners');
api.destroy();
console.log('TV prototype navigation: geometry, overrides, panel trap, short/long presses, inputs and teardown passed');

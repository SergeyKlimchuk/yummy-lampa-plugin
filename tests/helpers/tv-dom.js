'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '../..');

function Node(tag) { this.tag = tag || 'div'; this.attrs = {}; this.classes = []; this.nodes = []; this.parentNode = null; this.textValue = ''; this.events = []; this.values = {}; this.styles = {}; }
function text(node) { return node.textValue + node.nodes.map(text).join(''); }
function matches(node, selector) {
    if (!selector) return true;
    if (selector.indexOf(',') >= 0) return selector.split(',').some(s => matches(node, s.trim()));
    const attr = selector.match(/^\[([^=]+)="([^"]*)"\]$/);
    if (attr) return node.attrs[attr[1]] === attr[2];
    if (selector[0] === '.') return selector.slice(1).split('.').every(c => node.classes.includes(c));
    return node.tag === selector;
}
function descendants(node, selector, result) { node.nodes.forEach(child => { if (matches(child, selector)) result.push(child); descendants(child, selector, result); }); return result; }
function parse(value) {
    const holder = new Node('fragment'), stack = [holder];
    for (const part of value.matchAll(/<\/?[^>]+>|[^<]+/g)) {
        const token = part[0];
        if (token.startsWith('</')) { if (stack.length > 1) stack.pop(); continue; }
        if (!token.startsWith('<')) { stack[stack.length - 1].textValue += token; continue; }
        const match = token.match(/^<([\w-]+)/); if (!match) continue;
        const node = new Node(match[1]);
        for (const attr of token.matchAll(/([\w-]+)="([^"]*)"/g)) node.attrs[attr[1]] = attr[2];
        node.classes = (node.attrs.class || '').split(/\s+/).filter(Boolean);
        node.parentNode = stack[stack.length - 1]; node.parentNode.nodes.push(node);
        if (!['img', 'input', 'br', 'path'].includes(node.tag)) stack.push(node);
    }
    holder.nodes.forEach(n => { n.parentNode = null; }); return holder.nodes;
}
let currentDocument, liveAppends = 0;
function Wrapper(nodes) { this.nodes = nodes || []; this.length = this.nodes.length; this.jquery = true; this.nodes.forEach((node, index) => { this[index] = node; }); }
function $(value) { return value instanceof Wrapper ? value : new Wrapper(value instanceof Node ? [value] : Array.isArray(value) ? value : typeof value === 'string' && value[0] === '<' ? parse(value) : []); }
function detach(node) { if (node.parentNode) { const index = node.parentNode.nodes.indexOf(node); if (index >= 0) node.parentNode.nodes.splice(index, 1); node.parentNode = null; } }
Wrapper.prototype.append = function (...values) { this.nodes.forEach(parent => { if (currentDocument && currentDocument.documentElement.contains(parent)) liveAppends++; values.forEach(value => $(value).nodes.slice().forEach(node => { const added = node.tag === 'fragment' ? node.nodes.slice() : [node]; added.forEach(child => { detach(child); child.parentNode = parent; parent.nodes.push(child); }); })); }); return this; };
Wrapper.prototype.prepend = function (value) { this.nodes.forEach(parent => $(value).nodes.slice().reverse().forEach(node => { detach(node); node.parentNode = parent; parent.nodes.unshift(node); })); return this; };
Wrapper.prototype.empty = function () { this.nodes.forEach(node => { node.nodes.forEach(child => { child.parentNode = null; }); node.nodes = []; node.textValue = ''; }); return this; };
Wrapper.prototype.text = function (value) { if (value === undefined) return this.nodes.map(text).join(''); this.empty(); this.nodes.forEach(node => { node.textValue = String(value); }); return this; };
Wrapper.prototype.html = function (value) { return this.empty().append(value); };
Wrapper.prototype.attr = function (key, value) { if (value === undefined) return this[0] && this[0].attrs[key]; this.nodes.forEach(node => { node.attrs[key] = String(value); }); return this; };
Wrapper.prototype.removeAttr = function (key) { this.nodes.forEach(node => { delete node.attrs[key]; }); return this; };
Wrapper.prototype.data = function (key, value) { if (value === undefined) return this[0] && this[0].values[key]; this.nodes.forEach(node => { node.values[key] = value; }); return this; };
Wrapper.prototype.addClass = function (value) { this.nodes.forEach(node => value.split(/\s+/).forEach(c => { if (!node.classes.includes(c)) node.classes.push(c); })); return this; };
Wrapper.prototype.removeClass = function (value) { this.nodes.forEach(node => { node.classes = node.classes.filter(c => !value.split(/\s+/).includes(c)); }); return this; };
Wrapper.prototype.toggleClass = function (value, enabled) { return enabled ? this.addClass(value) : this.removeClass(value); };
Wrapper.prototype.css = function (name, value) { this.nodes.forEach(node => { node.styles[name] = value; }); return this; };
Wrapper.prototype.find = function (selector) { const found = []; this.nodes.forEach(node => descendants(node, selector, found)); return new Wrapper(found); };
Wrapper.prototype.children = function (selector) { return new Wrapper(this.nodes.flatMap(node => node.nodes.filter(child => matches(child, selector)))); };
Wrapper.prototype.first = function () { return new Wrapper(this.nodes.slice(0, 1)); };
Wrapper.prototype.parent = function () { return new Wrapper(this.nodes.map(node => node.parentNode).filter(Boolean)); };
Wrapper.prototype.prev = function (selector) { const node = this[0], parent = node && node.parentNode; return new Wrapper(parent ? parent.nodes.slice(0, parent.nodes.indexOf(node)).reverse().filter(sibling => matches(sibling, selector)).slice(0, 1) : []); };
Wrapper.prototype.each = function (callback) { this.nodes.forEach((node, index) => callback.call(node, index, node)); return this; };
Wrapper.prototype.remove = function () { this.nodes.forEach(detach); return this; };
Wrapper.prototype.on = function (names, callback) { this.nodes.forEach(node => names.split(/\s+/).forEach(name => node.events.push({name: name.split('.')[0], callback}))); return this; };
Wrapper.prototype.trigger = function (name) { this.nodes.forEach(node => node.events.filter(event => event.name === name).forEach(event => event.callback.call(node, {currentTarget: node, target: node}))); return this; };
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return {promise, resolve, reject}; }
async function settle() { for (let index = 0; index < 12; index++) await Promise.resolve(); }
function environment() {
    const documentElement = new Node('document');
    documentElement.contains = function (node) { for (let current = node; current; current = current.parentNode) if (current === documentElement) return true; return false; };
    const document = {documentElement, createDocumentFragment: () => new Node('fragment')}; currentDocument = document;
    const timers = [], calls = [], auth = {token: 'token-42', user_id: 42, login: 'example'};
    const Lampa = {
        Scroll: function (options) { calls.push(['scroll', options]); const element = $('<div class="scroll"></div>'); this.minus = () => {}; this.update = () => {}; this.append = value => element.append(value); this.render = js => js ? element[0] : element; this.destroy = () => element.remove(); },
        Controller: {add: () => {}, toggle: () => {}, collectionSet: () => calls.push(['collection']), collectionFocus: () => calls.push(['focus'])},
        Noty: {show: value => calls.push(['notice', value])}, Loading: {start: () => {}, stop: () => {}}
    };
    const context = {window: {AbortController}, document, $, Lampa, Promise, Date, Math, Number, String, Array, Object, console,
        setTimeout: fn => { const timer = {fn, live: true}; timers.push(timer); return timer; }, clearTimeout: timer => { timer.live = false; },
        Navigator: {canmove: () => true, move: () => {}},
        LampaYaniAuth: {token: () => auth.token, get: () => auth},
        LampaYaniNavigation: {moveDown: () => {}, bindFocus: () => {}},
        LampaYaniSectionState: {fromCache: () => false, create: () => ({root: $('<div class="selector"></div>'), show: () => {}})}
    };
    const activity = {loader: value => calls.push(['loader', value]), toggle: () => calls.push(['toggle'])};
    function mount(component) { component.activity = activity; component.create(); $(documentElement).append(component.render()); return component; }
    return {context, document, auth, calls, mount, timers, flush: () => { timers.splice(0).forEach(timer => { if (timer.live) timer.fn(); }); }};
}
function loadModule(env, name) { vm.runInNewContext(fs.readFileSync(path.join(root, 'src', name), 'utf8'), env.context); }
function countNodes(component) { return descendants(component.render()[0], '', []).length; }


Node.prototype.nodeType = 1;
Wrapper.prototype.off = function (name) { this.nodes.forEach(node => { node.events = node.events.filter(event => !event.name.includes(name)); }); return this; };
Wrapper.prototype.filter = function (selector) { return new Wrapper(this.nodes.filter(node => matches(node, selector))); };
Wrapper.prototype.hasClass = function (name) { return Boolean(this[0] && this[0].classes.includes(name)); };
Wrapper.prototype.closest = function (selector) { const result = []; this.nodes.forEach(node => { for (let current = node; current; current = current.parentNode) if (matches(current, selector)) { result.push(current); break; } }); return new Wrapper(result); };
function tvEnvironment() {
    const env = environment(), {context, document} = env;
    const body = new Node('body'); $(document.documentElement).append(body); document.body = body;
    const controls = {}; let enabled = {name: 'content', controller: {}}, collection = $(), owner = {component: 'library'};
    const focusCalls = [], buildCalls = [];
    Object.assign(context.Lampa.Controller, {
        add(name, value) { controls[name] = value; },
        toggle(name) { enabled = {name, controller: controls[name] || {}}; if (enabled.controller.toggle) enabled.controller.toggle(); },
        enabled() { return enabled; },
        collectionSet(value) { collection = $(value); },
        collectionFocus(value) { if (!value) return; $(document.documentElement).find('.focus').removeClass('focus'); $(value).addClass('focus').trigger('hover:focus'); focusCalls.push(value); }
    });
    context.Lampa.Activity = {active: () => owner, backward: () => env.calls.push(['back'])};
    context.Lampa.Storage = {get: (key, fallback) => fallback, set() {}};
    context.Lampa.InteractionCategory = function () {
        const view = $('<div class="native-grid"><div class="category-full"></div></div>'); let created = false;
        this.create = () => { created = true; };
        this.render = js => js ? view[0] : view;
        this.build = result => {
            assert.ok(created, 'native create runs before build for modern hosts'); buildCalls.push(result);
            result.results.forEach(record => {
                const card = $('<div class="card selector"></div>').text(record.title); card[0].record = record;
                card.on('hover:enter', () => env.calls.push(['card', record])); view.find('.category-full').append(card);
                if (this.cardRender) this.cardRender(card[0], record, {});
            }); this.activity.toggle();
        };
        this.start = () => {
            context.Lampa.Controller.add('content', {link: this, toggle() { context.Lampa.Controller.collectionSet(view); }, up() {}, down() {}, left() {}, right() {}});
            context.Lampa.Controller.toggle('content');
        };
        this.destroy = () => view.remove();
    };
    context.Navigator = {add() {}, canmove() { return false; }};
    Object.assign(context.window, context); context.window.window = context.window;
    return Object.assign(env, {focusCalls, buildCalls, controls, enabled: () => enabled, activity: value => { owner = value; }, load: name => { loadModule(env,name); Object.assign(context,context.window); }});
}
module.exports = {Node, Wrapper, $, deferred, settle, tvEnvironment};

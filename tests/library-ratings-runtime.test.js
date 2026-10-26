'use strict';
const assert = require('assert');
const {Node, Wrapper, $, tvEnvironment} = require('./helpers/tv-dom');

// Real renderers run against the shared tiny DOM. Geometry deliberately changes
// from zero while detached to a narrow TV card after mounting.
const env = tvEnvironment();
function jq(value, context) { return context ? $(context).find(value) : $(value); }
Object.defineProperties(Node.prototype, {
    children: {get() { return this.nodes; }},
    nextSibling: {get() { return this.parentNode && this.parentNode.nodes[this.parentNode.nodes.indexOf(this) + 1] || null; }},
    isConnected: {get() { return env.document.documentElement.contains(this); }},
    clientWidth: {get() { return this.isConnected ? 160 : 0; }},
    clientHeight: {get() { return this.isConnected ? 240 : 0; }},
    classList: {get() { return {toggle: (key, enabled) => { const had = this.classes.includes(key); if (enabled && !had) this.classes.push(key); else if (!enabled && had) this.classes.splice(this.classes.indexOf(key), 1); }}; }}
});
Node.prototype.querySelector = function (selector) { return $(this).find(selector)[0] || null; };
Node.prototype.insertBefore = function (child, reference) {
    if (child.parentNode) child.parentNode.nodes.splice(child.parentNode.nodes.indexOf(child), 1);
    child.parentNode = this;
    const index = reference ? this.nodes.indexOf(reference) : this.nodes.length;
    assert.ok(index >= 0, 'native insertion reference belongs to its parent');
    this.nodes.splice(index, 0, child);
    return child;
};
Wrapper.prototype.show = function () { return this.css('display', ''); };
Wrapper.prototype.hide = function () { return this.css('display', 'none'); };
env.context.$ = env.context.window.$ = jq;
env.context.window.getComputedStyle = () => ({fontSize: '20px'});
env.load('ui-card-renderers.js');
const renderer = env.context.LampaYaniCardRenderers.create({});
const host = $('<div class="card yani-card--ratings-below"><div class="card__view"><img class="card__img"></div><div class="card__title"></div><div class="card__vote"></div></div>');
const poster = host.find('.card__view')[0], image = host.find('.card__img')[0];
const card = {yani_id: 7, yani_ratings: [
    {key: 'yummy', short: 'YA', title: 'YummyAnime', value: 7.4},
    {key: 'kp', short: 'KP', title: 'KinoPoisk', value: 8.1},
    {key: 'shikimori', short: 'SH', title: 'Shikimori', value: 6.7},
    {key: 'mal', short: 'MAL', value: 0}, {key: 'worldart', value: null}
]};
function values() { return host.find('.yani-card-rating__value').nodes.map(node => $(node).text()); }
renderer.addCardRatings(host, card);
renderer.syncCardOverlayLayout(host, card);
let row = host.find('.yani-card-ratings')[0];
assert.equal(poster.clientWidth, 0);
assert.equal(row.parentNode, host[0], 'scores are not overlays even before the native grid is mounted');
assert.equal(poster.nextSibling, row, 'readable scores follow the poster before the title');
assert.equal(host.find('.yani-card-ratings--below').length, 1);
assert.deepEqual(values(), ['7.4', '8.1', '6.7'], 'preserve positive API values with YummyAnime first and no zero placeholders');
assert.equal(host.find('.card__vote')[0].styles.display, 'none', 'native duplicate rating is hidden');
assert.equal($(poster).find('.yani-card-ratings').length, 0);

$(env.document.body).append(host);
renderer.syncCardOverlayLayout(host, card);
assert.equal(poster.clientWidth, 160);
assert.equal($(poster).hasClass('yani-card-view--has-ratings'), false, 'separate scores do not consume the poster overlay budget');
assert.equal($(poster).hasClass('yani-card-view--hide-ratings'), false, 'small-poster rules cannot hide the independent scores');
for (let pass = 0; pass < 20; pass++) { renderer.addCardRatings(host, card); renderer.syncCardOverlayLayout(host, card); }
assert.equal(host.find('.yani-card-ratings').length, 1);
assert.equal(host.find('.yani-card-ratings')[0], row, 'mounting and repeated paints reuse the rating row');
assert.equal(host.find('.card__img')[0], image, 'painting scores preserves the poster');

host.removeClass('yani-card--ratings-below'); renderer.addCardRatings(host, card);
assert.equal($(poster).find('.yani-card-ratings').length, 1, 'recycled cards can return to regular catalog overlay placement');
assert.equal(host.find('.yani-card-ratings--below').length, 0);
host.addClass('yani-card--ratings-below'); renderer.addCardRatings(host, card);
assert.equal($(poster).find('.yani-card-ratings').length, 0);
assert.equal(host.find('.yani-card-ratings').length, 1, 'placement switches never duplicate scores');
card.yani_ratings[0].value = 9.2; renderer.addCardRatings(host, card);
assert.deepEqual(values(), ['9.2', '8.1', '6.7'], 'changed API values update the independent row');
card.yani_ratings = [{key: 'yummy', value: 0}, {key: 'kp', value: NaN}]; renderer.addCardRatings(host, card);
assert.equal(host.find('.yani-card-ratings').length, 0, 'unknown scores leave no empty rating row');
assert.equal(host.find('.card__vote')[0].styles.display, '');
console.log('Library ratings runtime: detached/mounted placement, real values, cache, recycling and missing scores passed');

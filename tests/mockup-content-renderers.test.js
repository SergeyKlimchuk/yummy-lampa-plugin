'use strict';
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var root = path.join(__dirname, '..', 'docs', 'mockups');
var window = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'content-screens.js'), 'utf8'), {window: window});
var views = window.YUMMY_CONTENT_VIEWS;
var expected = ['home', 'catalog', 'search', 'genres', 'genre-catalog', 'subject-catalog', 'top', 'recommended', 'updates', 'new-translations', 'new-releases', 'collections', 'collection', 'detail', 'sources', 'episodes', 'trailers', 'comments', 'replies', 'player'];
assert.deepStrictEqual(Object.keys(views).sort(), expected.sort());
vm.runInNewContext(fs.readFileSync(path.join(root, 'prototype-data.js'), 'utf8'), {window: window});
var data = window.YUMMY_MOCKUP_DATA;
var escaped = function (s) { return String(s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); };
var h = {
    data: data, view: {state: 'ready', selectedId: data.detail.anime_id}, esc: escaped,
    button: function (label, attrs, className) { return '<button class="' + escaped(className || '') + '"' + Object.keys(attrs || {}).map(function (key) { return ' ' + key + '="' + escaped(attrs[key]) + '"'; }).join('') + '>' + escaped(label) + '</button>'; },
    go: function (label, screen, params, className) { return h.button(label, {'data-go': screen, 'data-params': JSON.stringify(params || {})}, className); },
    cards: function (rows, options) { return '<div class="ya-grid" data-screen="' + escaped(options && options.screen || 'detail') + '">' + rows.map(function (item) { return '<div>' + escaped(item.title) + '</div>'; }).join('') + '</div>'; },
    section: function (label, body, action) { return '<section><h2>' + escaped(label) + '</h2>' + (action || '') + body + '</section>'; },
    row: function (label, meta, actions) { return '<div class="ya-row"><div>' + escaped(label) + '<span>' + escaped(meta) + '</span></div>' + (actions || '') + '</div>'; },
    empty: function (label, hint, actions) { return '<div class="ya-empty"><h2>' + escaped(label) + '</h2><p>' + escaped(hint) + '</p>' + (actions || '') + '</div>'; },
    notice: function (value) { return '<aside>' + escaped(value) + '</aside>'; },
    number: function (value) { return Number(value).toLocaleString('ru-RU'); },
    date: function (value) { return new Date(Number(value) * 1000).toLocaleDateString('ru-RU'); },
    poster: function (item) { var poster = item.poster || ''; return typeof poster === 'object' ? poster.medium || poster.small || poster.fullsize || '' : poster; },
    current: function () { return String(h.view.selectedId) === String(data.detail.anime_id) ? data.detail : data.catalog.concat(data.ongoing).find(function (item) { return String(item.anime_id) === String(h.view.selectedId); }) || {}; }
};
for (var state of ['ready', 'example', 'empty', 'loading', 'offline']) {
    for (var screen of expected) {
        h.view = {state: state, selectedId: data.detail.anime_id, query: 'Аватар', genre: 32};
        var output = views[screen](h);
        assert.strictEqual(typeof output, 'string', screen + ' must return HTML');
        assert.ok(output.length > 20, screen + ' must contain a useful state');
        assert.ok(!/<(?:iframe|video)\b/i.test(output), screen + ' must not open a provider in the prototype');
        assert.ok(!/undefined|\[object Object\]/.test(output), screen + ' must format optional data');
    }
}
h.view = {state: 'ready', selectedId: data.catalog[0].anime_id};
for (var screen of ['sources', 'episodes', 'trailers', 'player']) {
    assert.ok(views[screen](h).includes('Данные этого аниме не загружены'), screen + ' must not reuse a different title snapshot');
}
h.view = {state: 'ready', selectedId: data.detail.anime_id};
assert.ok(views.sources(h).includes('NDA Studio'), 'Sources must come from the captured title metadata');
assert.ok(views.episodes(h).includes('Серия 1'), 'Episode numbering must come from the captured videos');
assert.ok(views.trailers(h).includes('Тизер'), 'Trailer labels must come from the captured metadata');
assert.ok(!views.recommended(h).includes('Аватар'), 'Private ready state must not fabricate recommendations');
assert.ok(!views.comments(h).includes('Viewer One'), 'Private ready state must not silently substitute fixture comments');
h.view = {state: 'example', selectedId: data.detail.anime_id};
assert.ok(views.comments(h).includes('Viewer One') && views.comments(h).includes('не относятся'), 'Fixture comments must be explicitly identified');
h.view = {state: 'ready', query: '<script>alert(1)</script>'};
assert.ok(!views.search(h).includes('<script>'), 'Search text must be escaped in generated input attributes');
console.log('PASS: 20 views × 5 states, captured-title resource guards, source fields, private empty states, fixture labels, escaping and no playback embeds');

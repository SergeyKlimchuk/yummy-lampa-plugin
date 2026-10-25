'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const base = path.join(__dirname, '..', 'docs', 'mockups');
const fixtureBase = path.join(__dirname, 'fixtures', 'yani-api');
const json = name => JSON.parse(fs.readFileSync(path.join(fixtureBase, name), 'utf8'));
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(base, 'prototype-data.js'), 'utf8'), {window});
vm.runInNewContext(fs.readFileSync(path.join(base, 'account-screens.js'), 'utf8'), {window, console, Date});
const esc = value => String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const attrs = values => Object.keys(values || {}).filter(key => values[key] !== null && values[key] !== undefined && values[key] !== false).map(key => ' ' + key + '="' + esc(values[key]) + '"').join('');
const h = {
    data: {
        status: window.YUMMY_MOCKUP_DATA.status,
        fixtures: {lists: json('lists.json'), history: json('history-progress.json'), notifications: json('notifications.json')},
        policy: {title:'Политика', paragraphs:['Первый абзац', 'Второй абзац', 'Третий абзац', 'Четвёртый абзац']}
    },
    view: {state:'ready', category:'watching', period:'3hour', settings:{}},
    esc,
    button: (label, values, css) => '<button class="' + esc(css || 'ya-button') + '"' + attrs(values) + '>' + esc(label) + '</button>',
    go: (label, screen, params, css) => '<button class="' + esc(css || 'ya-button') + '" data-screen="' + esc(screen) + '"' + attrs(Object.fromEntries(Object.entries(params || {}).map(([key,value]) => ['data-param-' + key,value]))) + '>' + esc(label) + '</button>',
    cards: items => '<div class="ya-grid">' + items.map(item => '<article>' + esc(item.title || item.name) + '</article>').join('') + '</div>',
    section: (title, body, actions) => '<section><h2>' + esc(title) + '</h2>' + (actions || '') + body + '</section>',
    row: (title, meta, actions) => '<div class="ya-row"><strong>' + esc(title) + '</strong><span>' + esc(meta) + '</span>' + (actions || '') + '</div>',
    empty: (title, hint, actions) => '<div class="ya-empty"><h2>' + esc(title) + '</h2><p>' + esc(hint) + '</p>' + (actions || '') + '</div>',
    notice: text => '<p class="ya-notice">' + esc(text) + '</p>',
    number: value => String(value),
    date: value => String(value)
};
const views = window.YUMMY_PRIVATE_VIEWS;
assert.deepStrictEqual(Object.keys(views).sort(), ['account','user-lists','account-list','continue','history','subscriptions','notifications','auth','status','settings','policy'].sort());
for (const state of ['ready','example','empty','guest','loading','error','offline']) {
    for (const route of Object.keys(views)) {
        h.view = {state, category:'watching', period:'3hour', settings:{}};
        const html = views[route](h);
        assert.equal(typeof html, 'string', route + '/' + state);
        assert.ok(html.length > 30, route + '/' + state);
        assert.ok(!/\b(?:onclick|onerror|onload)=/i.test(html));
        if (state !== 'example' && !['status','policy','settings','auth'].includes(route)) {
            assert.ok(!html.includes('Sample Chronicle'), route + '/' + state + ' leaked fixture');
            assert.ok(!html.includes('Quiet Harbor'), route + '/' + state + ' leaked fixture');
        }
    }
}
h.view = {state:'example', category:'watching', settings:{}};
assert.ok(views['user-lists'](h).includes('Sample Chronicle'));
assert.ok(views['account-list'](h).includes('Quiet Harbor'));
assert.ok(views['account-list'](h).includes('ya-chip is-active'));
assert.ok(views.history(h).includes('Sample Chronicle'));
assert.ok(!views.subscriptions(h).includes('Sample Chronicle'));
assert.ok(views.notifications(h).includes('New episode &amp; translation'));
assert.ok(!views.notifications(h).includes('<strong>4</strong>'));
assert.ok(views.notifications(h).includes('data-action="notifications-clear"'));
assert.ok(!/data-action="notification-delete"/.test(views.notifications(h)));
h.view.notificationsCleared = true;
assert.ok(!views.notifications(h).includes('New episode'));
h.view.notificationsCleared = false;
h.view.notificationsRead = true;
assert.ok(!views.notifications(h).includes('Не прочитано ·'));
h.view = {state:'ready', settings:{}};
const settings = views.settings(h);
assert.ok(settings.includes('yani_source_cvh'));
assert.ok(settings.includes('yani_resolver_server'));
assert.ok(settings.includes('yani_lampac_server'));
assert.ok(!settings.includes('yani_yummytv_enabled'));
assert.ok(!settings.includes('yani_playback_target"'));
assert.ok(!settings.includes('data-action="setting-check"'));
h.view.settings.yani_resolver_server = 'http://localhost:8790';
assert.ok(views.settings(h).includes('data-action="setting-check"'));
assert.ok(!/<input|<textarea|type="password"/.test(views.auth(h)));
h.view.state = 'error';
assert.ok(views.auth(h).includes('Не удалось выполнить вход'));
h.data.history = [{anime_id: 10, title:'Finished fixture', time:1440, duration:1440}, {anime_id: 11, title:'Unfinished fixture', time:300, duration:1440}];
h.view.state = 'example';
assert.ok(!views['continue'](h).includes('Finished fixture'));
assert.ok(views['continue'](h).includes('Unfinished fixture'));
assert.ok(views.history(h).includes('Finished fixture'));
delete h.data.history;
h.data.fixtures.notifications.response[0].title_html = '<img src=x onerror=alert(1)><b>&lt;script&gt;x&lt;/script&gt;</b>';
h.view = {state:'example', settings:{}};
const hostile = views.notifications(h);
assert.ok(!hostile.includes('<img'));
assert.ok(!hostile.includes('<script>'));
assert.ok(hostile.includes('&lt;script&gt;'));
h.view = {state:'ready', period:'week', settings:{}};
assert.ok(views.status(h).includes('data-value="week" aria-pressed="true"'));
h.view.state = 'empty';
assert.ok(views.status(h).includes('Нет данных мониторинга'));
assert.ok(!views.status(h).includes('old.yummyani.me'));
assert.ok(views.policy(h).includes('Четвёртый абзац'));
console.log('PASS: 11 private/service renderers, 77 state combinations, fixture privacy, sanitization, LG settings, notification simulation, public status and policy');

'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const mockups = path.join(root, 'docs', 'mockups');
const context = {window: {}};
['prototype-contracts.js', 'prototype-data.js', 'content-screens.js', 'account-screens.js'].forEach(file => {
    vm.runInNewContext(fs.readFileSync(path.join(mockups, file), 'utf8'), context);
});
const contracts = context.window.YUMMY_MOCKUP_CONTRACTS;
const views = Object.assign({}, context.window.YUMMY_CONTENT_VIEWS, context.window.YUMMY_PRIVATE_VIEWS);
const data = context.window.YUMMY_MOCKUP_DATA;
const ui = fs.readFileSync(path.join(root, 'src', 'ui.js'), 'utf8');
const core = fs.readFileSync(path.join(mockups, 'prototype.js'), 'utf8');
const registered = Array.from(ui.matchAll(/Lampa\.Component\.add\('([^']+)'/g), match => match[1]);
assert.equal(Object.keys(contracts).length, 32, 'the review should cover every registered component and supported dialog');
registered.forEach(name => assert.ok(Object.values(contracts).some(record => record.component.includes(name)), name + ' has no corresponding mockup contract'));
Object.keys(contracts).forEach(name => {
    assert.ok(views[name] || name === 'schedule', name + ' has no renderer');
    assert.ok(contracts[name].sources.length, name + ' must identify its existing code source');
    assert.ok(contracts[name].previewStates.length, name + ' must identify supported preview states');
});
assert.ok(data.catalog.length && data.detail.anime_id && data.videos.length, 'public screens need an actual captured example');
assert.ok(data.history.length && data.fixtures.history.anonymized, 'personal examples must be explicitly anonymized');
assert.equal(Object.keys(data.privateCounts).length, 0, 'unknown personal counters must not be fabricated');
assert.ok(data.policy.paragraphs.length === 4, 'the usage screen must use the four current paragraphs');
[data.videos, data.trailers].forEach(rows => assert.doesNotMatch(JSON.stringify(rows), /https?:|iframe_url|stream_url|player_url/i, 'prototype playback metadata must not load providers or signed media URLs'));
['prototype.js', 'content-screens.js', 'account-screens.js'].forEach(file => {
    const source = fs.readFileSync(path.join(mockups, file), 'utf8');
    assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/, file + ' must remain an offline account-safe prototype');
});
assert.match(core, /navigatingBack/, 'Back must restore route history without adding the route back to the stack');
assert.ok(fs.existsSync(path.join(mockups, 'assets', 'yummyanime-official.svg')));
console.log('All registered components and 32 prototype views have source-backed coverage; public snapshots and private examples remain separate');

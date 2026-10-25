// Data-model/authentication coverage is retained; homepage layout and lifecycle
// behavior are covered by the lightweight-home runtime tests.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('src/ui-home-insights.js', 'utf8');
const context = {window: {}};
vm.runInNewContext(source, context);
const insights = context.window.LampaYaniHomeInsights;

assert.equal(insights.posterOf({poster: {medium: '//cdn.example/poster.jpg', huge: '//cdn.example/huge.jpg'}}), 'https://cdn.example/huge.jpg');
assert.equal(insights.posterOf({anime: {poster: {big: 'https://cdn.example/anime.jpg'}}}), 'https://cdn.example/anime.jpg');
assert.deepEqual({...insights.dashboardPriority({continue_count: 2, notification_count: 8})}, {key: 'continue_watching', label: 'continue_now'});
assert.deepEqual({...insights.dashboardPriority({notification_count: 3})}, {key: 'notifications', label: 'notifications_new'});
assert.deepEqual({...insights.dashboardPriority({has_translation: true})}, {key: 'new_translations', label: 'fresh_translation'});
assert.deepEqual({...insights.dashboardPriority({authorized: true})}, {key: 'for_you', label: 'recommended_now'});
assert.deepEqual({...insights.dashboardPriority({authorized: false})}, {key: 'catalog', label: 'start_catalog'});
assert.equal(insights.dashboardInitialFocus('genres', 'continue_watching', ['catalog', 'genres', 'continue_watching']), 'genres');
assert.equal(insights.dashboardInitialFocus('', 'continue_watching', ['catalog', 'continue_watching']), 'continue_watching');
assert.equal(insights.dashboardInitialFocus('hidden', 'notifications', ['catalog', 'notifications']), 'notifications');
assert.equal(insights.dashboardInitialFocus('', 'hidden', ['catalog', 'genres']), 'catalog');
assert.equal(insights.dashboardInitialFocus('', '', []), '');


console.log('dashboard personalization contract checks passed');

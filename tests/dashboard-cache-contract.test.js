// Data-model/authentication coverage is retained; homepage layout and lifecycle
// behavior are covered by the lightweight-home runtime tests.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('src/ui-home-insights.js', 'utf8');
const context = {window: {}};
vm.runInNewContext(source, context);
const insights = context.window.LampaYaniHomeInsights;

const cached = {
    counts: {new_releases: 8, new_translations: 4},
    schedule: {today: 5, preview: {title: 'Cached schedule'}},
    translations: {count: 4, preview: {title: 'Cached translation'}},
    episode_flow: {japan: {title: 'Cached Japan'}, waiting: {title: 'Cached wait'}, available: {title: 'Cached dub'}}
};
const partial = insights.mergeDashboardSnapshot(cached, {
    counts: {new_releases: 9, new_translations: 6},
    schedule: {today: 0},
    translations: {count: 6, preview: {title: 'Live translation'}},
    episode_flow: {available: {title: 'Live dub'}},
    service: {api: true, degraded: true, feed: true, schedule: false}
});

assert.equal(partial.counts.new_releases, 9);
assert.equal(partial.schedule.preview.title, 'Cached schedule');
assert.equal(partial.translations.preview.title, 'Live translation');
assert.equal(partial.episode_flow.japan.title, 'Cached Japan');
assert.equal(partial.episode_flow.waiting.title, 'Cached wait');
assert.equal(partial.episode_flow.available.title, 'Live dub');
assert.equal(partial.used_cache, true);


console.log('dashboard cache contract checks passed');

// Data-model/authentication coverage is retained; homepage layout and lifecycle
// behavior are covered by the lightweight-home runtime tests.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('src/ui-home-insights.js', 'utf8');
const context = {window: {}};
vm.runInNewContext(source, context);
const insights = context.window.LampaYaniHomeInsights;

const preview = insights.libraryPreview([
    {title: 'Old', updated_at: 1, duration: 100, time: 20},
    {anime_id: 42, video_id: 4207, title: 'Newest', updated_at: 4, duration: 100, time: 200, poster: '//cdn.example/new.jpg', number: 7, player: 'Kodik'},
    {title: 'Third', updated_at: 2},
    {title: 'Second', updated_at: 3}
], 3);

assert.deepEqual(preview.map((item) => item.title), ['Newest', 'Second', 'Third']);
assert.equal(preview[0].poster, 'https://cdn.example/new.jpg');
assert.equal(preview[0].episode, 7);
assert.equal(preview[0].progress, 99);
assert.equal(preview[0].anime_id, 42);
assert.equal(preview[0].video_id, 4207);
assert.equal(preview[0].time, 200);
assert.equal(preview[0].duration, 100);
assert.equal(preview[0].player, 'Kodik');
assert.equal(insights.libraryPreview([], 3).length, 0);


console.log('dashboard library preview contract checks passed');

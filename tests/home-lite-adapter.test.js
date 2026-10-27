'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// Exercise the production bridge with the existing completion/resume model.
// toCard drops history fields, just like the catalog card model.
const now = Date.now();
const saved = {
    501: {title: 'Resume seven', number: '07', video_id: 'v7', time: 333, duration: 1440, player: 'Kodik', voice: 'Dub', updated_at: now},
    502: {title: 'Finished title', number: '01', video_id: 'v1', time: 1440, duration: 1440, updated_at: now - 1},
    503: {title: 'Second', number: '2', video_id: 'v2', time: 200, duration: 1440, updated_at: now - 2},
    504: {title: 'Third', number: '1', video_id: 'v3', time: 100, duration: 1440, updated_at: now - 3},
    505: {title: 'Beyond preview', number: '1', video_id: 'v4', time: 100, duration: 1440, updated_at: now - 4}
};
const context = {window: {}, console, Date};
vm.runInNewContext(fs.readFileSync('src/episode.js', 'utf8'), context);
vm.runInNewContext(fs.readFileSync('src/ui-utils.js', 'utf8'), context);
vm.runInNewContext(fs.readFileSync('src/ui-home-sections.js', 'utf8'), context);
context.LampaYaniHomeSections = context.window.LampaYaniHomeSections;
context.Lampa = {Storage: {get: () => ({502: {count: 1, at: now}})}};
context.playbackHistory = () => saved;
context.toCard = (source) => ({yani_id: source.anime_id, title: source.title});
const ui = fs.readFileSync('src/ui.js', 'utf8');
const helper = ui.slice(ui.indexOf('    function homeContinueCards() {'), ui.indexOf('    function UsagePolicy(object) {'));
assert.ok(helper.includes('attachHistoryEntry'), 'home must use the shared resume-card model');
vm.runInNewContext(helper, context);
const cards = context.homeContinueCards();
assert.deepStrictEqual(Array.from(cards, (card) => card.yani_id), ['501', '503', '504']);
const card = cards[0];
assert.equal(card.yani_resume.number, '7');
assert.equal(card.yani_resume.video_id, 'v7');
assert.equal(card.yani_resume.time, 333);
assert.equal(card.yani_resume.duration, 1440);
assert.equal(card.yani_resume.player, 'Kodik');
assert.equal(card.yani_resume.voice, 'Dub');
assert.equal(card.yani_resume.updated_at, now);
assert.equal(card.yani_resume_episode, '7');
assert.equal(card.yani_resume_remaining, 19);
assert.equal(card.yani_list_progress, 333 / 1440);
console.log('Home adapter preserves resume metadata, completion filtering and the three-card limit');

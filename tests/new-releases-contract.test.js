const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const api = fs.readFileSync('src/api.js', 'utf8');
const build = fs.readFileSync('build.js', 'utf8');
const releases = fs.readFileSync('src/ui-releases.js', 'utf8');
const ui = fs.readFileSync('src/ui.js', 'utf8');
const home = fs.readFileSync('src/ui-home.js', 'utf8');

assert.match(api, /feed: function \(control\)/);
assert.match(releases, /Array\.isArray\(value\.new\)/);
assert.match(build, /src\/ui-releases\.js/);
assert.match(ui, /Lampa\.Component\.add\('yani_new_releases', NewReleases\)/);
assert.match(home, /route\('yani_new_releases'/, 'the full releases page remains reachable from More');

const context = {window: {}};
vm.runInNewContext(releases, context);
const moduleApi = context.window.LampaYaniReleases;
const cards = moduleApi.normalize({response: {new: [
    {anime_id: 8, title: 'First', anime_status: {title: 'Ongoing'}, type: {name: 'TV'}},
    {anime_id: 8, title: 'Duplicate'},
    {anime_id: 9, title: 'Second', type: {shortname: 'Movie'}}
]}}, (item) => ({title: item.title, yani_id: item.anime_id}));

assert.equal(cards.length, 2);
assert.equal(cards[0].yani_id, 8);
assert.equal(cards[0].yani_update_label, 'Ongoing · TV');
assert.equal(cards[1].yani_update_label, 'Movie');

console.log('new releases contract checks passed');

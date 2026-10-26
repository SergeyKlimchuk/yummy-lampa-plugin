'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const source = ['episode.js', 'ui-utils.js', 'ui-episode-progress.js'].map(name => fs.readFileSync('src/' + name, 'utf8')).join('\n');
const prefix = 'yani_episode_progress_v1:';

function environment(options = {}) {
    const storage = options.storage || {};
    const auth = options.auth || {token: '', login: ''};
    const writes = [], listeners = {};
    let clock = 100000, quota = false;
    class Clock extends Date { static now() { return clock; } }
    const context = {
        console, Date: Clock,
        document: {addEventListener: (name, fn) => { listeners[name] = fn; }},
        Lampa: {Storage: {get: (key, fallback) => Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : fallback,
            set: (key, value) => { if (quota) throw new Error('quota'); writes.push([key, value]); storage[key] = value; }}},
        LampaYaniAuth: {get: () => auth, token: () => auth.token}
    };
    context.window = context;
    vm.runInNewContext(source, context);
    return {api: context.LampaYaniEpisodeProgress, auth, storage, writes, listeners,
        advance: amount => { clock += amount; }, quota: value => { quota = value; }};
}
function video(number, time, duration, flags) {
    return {number, video_id: 'v' + number, duration, watched: Object.assign({end_time: time}, flags || {})};
}
function marker(env, values, number) { return env.api.state(values, {number}); }
function countPersistedEpisodes(env) {
    return Object.keys(env.storage).filter(key => key.startsWith(prefix)).reduce((count, key) => {
        const stored = JSON.parse(env.storage[key]);
        return count + Object.values(stored.titles).reduce((sum, title) => sum + Object.keys(title.episodes).length, 0);
    }, 0);
}

let env = environment();
let values = env.api.index({yani_id: 42}, [video('01', 96, 100), video(2, 0, 100), video(3, 0, 0, {completed: true})]);
assert.equal(marker(env, values, 1).state, 'completed');
assert.equal(marker(env, values, 2).state, 'none', 'watching episodes one and three cannot mark episode two');
assert.equal(marker(env, values, 3).state, 'completed', 'an explicit server completion does not require a duration');
assert.equal(marker(env, values, 3).percent, 100);
assert.equal(marker(env, env.api.index(42, [video(1, 94.9, 100)]), 1).state, 'started');
assert.equal(marker(env, env.api.index(42, [video(1, 95, 100)]), 1).state, 'completed');
assert.equal(marker(env, env.api.index(42, [video(1, 0, 0, {finished: 'false', completed: false})]), 1).state, 'none', 'false-like flags are not completion');
assert.equal(marker(env, env.api.index(42, [video(1, 0, 0, {finished: 1})]), 1).state, 'completed');
let partial = marker(env, env.api.index(42, [video(2, 10, 0)]), 2);
assert.equal(partial.state, 'started'); assert.equal(partial.percent, 0);
assert.equal(marker(env, env.api.index(42, [{number: 2, watched: {time: 40, duration: 80}}]), 2).percent, 50);

values = env.api.index(42, [Object.assign(video('3.5', 96, 100), {provider: 'one'}), Object.assign(video('3.5', 0, 100), {provider: 'two'}), video('SP 01', 80, 100)]);
assert.equal(marker(env, values, '3.5').state, 'completed', 'a completed episode applies across real providers');
assert.equal(marker(env, values, 'SP 01').state, 'started');
assert.equal(marker(env, values, 'SP 1').state, 'none', 'special episode names retain their existing normalization semantics');
values = env.api.index(42, [], {number: 3, time: 98, duration: 100, max_episode: 99});
assert.equal(marker(env, values, 3).state, 'completed');
assert.equal(marker(env, values, 2).state, 'none'); assert.equal(marker(env, values, 99).state, 'none');

// Local observations retain a sparse completion set instead of only the latest
// anime position, and do not lose completion when an episode is rewatched.
env.api.record({yani_id: 42}, video(1, 96, 100));
env.api.record({yani_id: 42}, video(3, 100, 100));
env.api.record({yani_id: 42}, video(1, 5, 100));
values = env.api.index(42, []);
assert.equal(marker(env, values, 1).state, 'completed'); assert.equal(marker(env, values, 3).state, 'completed');
assert.equal(marker(env, values, 2).state, 'none');
const restored = environment({storage: env.storage});
assert.equal(marker(restored, restored.api.index(42, []), 1).state, 'completed', 'completion survives reload');
assert.equal(marker(restored, restored.api.index(43, []), 1).state, 'none', 'anime journals are isolated');
assert.doesNotMatch(JSON.stringify(env.storage), /video_id|https?:|token|credential/i, 'persist only episode metadata');

env = environment();
env.api.record(42, video(1, 10, 100));
assert.equal(env.writes.length, 1);
env.api.record(42, video(1, 10, 100));
assert.equal(env.writes.length, 1, 'unchanged observations do not rewrite storage');
env.advance(10000); env.api.record(42, video(1, 20, 100));
assert.equal(env.writes.length, 1, 'partial playback persistence is throttled');
assert.equal(marker(env, env.api.index(42, []), 1).percent, 20, 'memory stays current between writes');
env.api.record(42, video(1, 20, 100), {flush: true});
assert.equal(env.writes.length, 2, 'pause/final flush persists dirty state even without a new position');
env.advance(1); env.api.record(42, video(1, 96, 100));
assert.equal(env.writes.length, 3, 'completion is persisted immediately');
env.api.record(42, video(1, 96, 100), {flush: true});
assert.equal(env.writes.length, 3, 'duplicate completion/flush has no storage churn');
env.quota(true); env.api.record(42, video(2, 96, 100));
assert.equal(marker(env, env.api.index(42, []), 2).state, 'completed', 'quota failures retain usable session state');
env.quota(false); env.api.record(42, video(2, 96, 100), {flush: true});
assert.equal(countPersistedEpisodes(env), 2, 'a later successful flush recovers persistence');

env = environment({auth: {token: 'secret-a', login: 'Alice'}});
const alice = env.api.owner();
env.api.record(42, video(1, 96, 100), {owner: alice});
env.auth.user_id = 123;
assert.ok(env.api.sameOwner(alice, env.api.owner()), 'profile enrichment must not change the stable login owner');
assert.equal(marker(env, env.api.index(42, [], {number: 2, time: 96, duration: 100}), 2).state, 'none', 'unowned legacy authenticated history cannot color another account');
assert.equal(marker(env, env.api.index(42, [], {number: 2, time: 96, duration: 100, progressOwner: alice}), 2).state, 'completed');
env.auth.token = 'secret-b'; env.auth.login = 'Bob';
assert.equal(marker(env, env.api.index(42, []), 1).state, 'none', 'switching accounts drops the prior journal from the index');
assert.equal(env.api.record(42, video(3, 99, 100), {owner: alice}), null, 'late callbacks from another account are rejected');
env.api.record(42, video(2, 96, 100));
env.auth.token = 'secret-a'; env.auth.login = 'Alice';
values = env.api.index(42, []);
assert.equal(marker(env, values, 1).state, 'completed'); assert.equal(marker(env, values, 2).state, 'none');
assert.doesNotMatch(JSON.stringify(env.storage), /secret-a|secret-b/);

env = environment({auth: {token: 'unknown-one'}});
const unknown = env.api.owner();
assert.equal(unknown.persist, false);
env.api.record(42, video(1, 98, 100));
assert.equal(env.writes.length, 0, 'an authenticated session without an identity never shares anonymous storage');
assert.equal(marker(env, env.api.index(42, []), 1).state, 'completed');
env.auth.token = 'unknown-two';
assert.equal(env.api.sameOwner(unknown, env.api.owner()), false);
assert.equal(marker(env, env.api.index(42, []), 1).state, 'none');

// Loading a stale/oversized journal is bounded before it reaches the UI. The
// new observation remains the most recent even in one clock tick.
const seeded = {version: 1, titles: {42: {a: 1, episodes: {}}}};
for (let index = 1; index <= 5003; index++) seeded.titles[42].episodes[index] = {s: 2, t: 98, d: 100, a: index};
env = environment({storage: {[prefix + 'anonymous']: JSON.stringify(seeded)}});
env.api.record(42, video(5004, 98, 100));
assert.equal(countPersistedEpisodes(env), 5000);
assert.equal(marker(env, env.api.index(42, []), 5004).state, 'completed');
assert.equal(marker(env, env.api.index(42, []), 1).state, 'none');
env = environment();
for (let id = 1; id <= 205; id++) env.api.record(id, video(1, 98, 100));
const saved = JSON.parse(env.storage[prefix + 'anonymous']);
assert.equal(Object.keys(saved.titles).length, 200);
assert.equal(marker(env, env.api.index(205, []), 1).state, 'completed');
assert.equal(marker(env, env.api.index(1, []), 1).state, 'none');

console.log('Episode progress runtime: sparse server/local states, stable owners, persistence, throttling and bounds passed');

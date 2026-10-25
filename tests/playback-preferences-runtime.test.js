'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('src/ui-playback-preferences.js', 'utf8');

function environment(saved) {
    const store = saved || {};
    const writes = [];
    const window = {Lampa: {Storage: {
        get: (key, fallback) => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : fallback,
        set: (key, value) => { store[key] = value; writes.push([key, value]); }
    }}};
    vm.runInNewContext(source, {window, console, Date: {now: () => 1000}});
    return {api: window.LampaYaniPlaybackPreferences, store, writes, storage: window.Lampa.Storage};
}

function group(title, player, ids) {
    return {title, player, playerId: player.toLowerCase(), videos: (ids || []).map(id => ({video_id: id}))};
}
const studioKodik = group('Studio Band', 'Kodik', ['studio-k1', 'studio-k2']);
const libriaKodik = group('AniLibria', 'Kodik', ['libria-k1', 'libria-k2']);
const libriaSibnet = group('AniLibria', 'Sibnet', ['libria-s1']);
const subsCvh = group('Subtitles Team', 'CVH', ['subs-c1']);
const groups = [studioKodik, libriaKodik, libriaSibnet, subsCvh];
const card = {yani_id: 42};
let env = environment();

assert.equal(env.api.normalizeVoice('  ANI\tLIBRIA  '), 'ani libria');
assert.equal(env.api.source({playerId: 12, player: 'Kodik', source: 'media.invalid'}), 'kodik',
    'a numeric API player id must not hide a recognized provider name');
assert.equal(env.api.source({playerId: 'SIBNET', player: 'unknown'}), 'sibnet');
assert.equal(env.api.source({source: 'https://vkvideo.ru/video-1_2'}), 'vk');
assert.equal(env.api.source({player: 'CVH Player'}), 'cvh');
assert.equal(env.api.source({player: 'New Provider'}), 'new provider', 'unknown real providers still have stable per-anime keys');
assert.equal(env.api.source({source: 'https://media.example/watch/1'}), 'media.example', 'provider keys do not retain video paths');
assert.equal(env.api.defaults().voice, '');
assert.equal(env.api.defaults().source, 'auto');
assert.equal(env.api.resolve(card, groups).group, studioKodik);
assert.equal(env.api.resolve(card, groups).origin, 'auto');

env.api.setDefaults({voice: '  AniLibria  ', source: {value: 'sibnet'}});
assert.equal(env.api.defaults().voice, 'AniLibria');
assert.equal(env.api.defaults().source, 'sibnet');
let result = env.api.resolve(card, groups, {video_id: 'studio-k1', voice: 'Studio Band', player: 'kodik'});
assert.equal(result.group, libriaSibnet, 'configured defaults beat another dubbing in playback history');
assert.equal(result.origin, 'default');
assert.equal(result.unavailable, false);
assert.equal(env.api.resolve({yani_id: 43}, groups).group, libriaSibnet, 'new titles use the same global defaults');
env.api.remember(card, studioKodik);
result = env.api.resolve(card, groups);
assert.equal(result.group, studioKodik, 'an explicit anime choice overrides global defaults');
assert.equal(result.origin, 'anime');
assert.equal(env.api.resolve({yani_id: 43}, groups).group, libriaSibnet, 'one anime cannot change another anime');
assert.equal(env.api.defaults().source, 'sibnet', 'a manual anime choice must not rewrite global defaults');
const savedBefore = JSON.stringify(env.api.saved(card));
result = env.api.resolve(card, [libriaKodik, libriaSibnet]);
assert.equal(result.group, libriaSibnet, 'a missing saved dubbing falls back to global defaults');
assert.equal(result.origin, 'default');
assert.equal(result.unavailable, true);
assert.equal(result.requested.voice, 'Studio Band');
assert.equal(JSON.stringify(env.api.saved(card)), savedBefore, 'fallback does not overwrite the unavailable saved preference');

env.api.remember(card, libriaSibnet);
result = env.api.resolve(card, [studioKodik, libriaKodik]);
assert.equal(result.group, libriaKodik, 'keep the saved dubbing when its provider disappeared or was disabled');
assert.equal(result.origin, 'anime');
assert.equal(result.unavailable, true);
assert.equal(env.api.saved(card).source, 'sibnet', 'a disabled source remains remembered for when it becomes available');
const reloaded = environment(env.store);
assert.equal(reloaded.api.resolve(card, groups).group, libriaSibnet, 'per-anime preferences survive module reload');
assert.equal(reloaded.api.defaults().voice, 'AniLibria', 'global defaults survive module reload');

env.api.reset(card);
assert.equal(env.api.saved(card), null);
assert.equal(env.api.resolve(card, groups).group, libriaSibnet, 'reset restores global settings');
env.api.setDefaults({voice: '', source: 'auto'});
result = env.api.resolve(card, groups, {voice: 'AniLibria', player: 'Kodik'});
assert.equal(result.group, libriaKodik, 'legacy history matches both dub and provider');
assert.equal(result.origin, 'history');
result = env.api.resolve(card, groups, {video_id: 'libria-s1', voice: 'AniLibria', player: 'Kodik'});
assert.equal(result.group, libriaSibnet, 'exact watched video id is stronger than legacy provider text');
result = env.api.resolve(card, groups, {voice: '  anilibria ', player: 'Unavailable'});
assert.equal(result.group, libriaKodik, 'history can retain a dub when its old source disappeared');
result = env.api.resolve(card, groups, {player: 'Kodik'});
assert.equal(result.origin, 'auto', 'a provider alone cannot identify the last watched dub');
assert.equal(env.api.resolve(card, groups, null, 'sibnet').group, libriaSibnet, 'legacy global source is only a final auto fallback');

env.api.setDefaults({source: 'cvh'});
assert.equal(env.api.resolve(card, groups).group, subsCvh, 'a configured provider works with any dub when none is configured');
env.api.setDefaults({voice: 'Missing Studio', source: 'kodik'});
result = env.api.resolve(card, groups);
assert.equal(result.group, studioKodik);
assert.equal(result.unavailable, true, 'source-only fallback must disclose the missing configured dub');
assert.equal(result.requested.voice, 'Missing Studio');
result = env.api.resolve(card, [], {voice: 'AniLibria'});
assert.equal(result.group, null);
assert.equal(result.unavailable, true);
env.api.setDefaults({source: 'Unknown Provider', voice: {value: ''}});
assert.equal(env.api.defaults().source, 'auto', 'settings accept only known source choices or Auto');

env = environment();
env.api.setDefaults({voice: 'AniLibria', source: 'sibnet'});
env.api.rememberTarget(card, 'external');
assert.equal(env.api.target(card, 'internal'), 'external');
assert.equal(env.api.resolve(card, groups).group, libriaSibnet,
    'an entry containing only a player target must not suppress global dub/source defaults');
assert.equal(env.api.resolve(card, groups).origin, 'default');
assert.equal(env.api.target({yani_id: 43}, 'internal'), 'internal', 'player targets stay isolated per anime');
env.api.remember(card, studioKodik);
assert.equal(env.api.target(card, 'internal'), 'external', 'changing the dub/source preserves the anime player target');
env.api.rememberTarget(card, 'internal');
assert.equal(env.api.saved(card).voice, 'Studio Band', 'changing the player target preserves dub/source');
assert.equal(env.api.saved(card).source, 'kodik');
env.api.rememberTarget(card, 'ask');
assert.equal(env.api.target(card, 'external'), 'ask');
env.api.rememberTarget(card, 'bad');
assert.equal(env.api.target(card, 'external'), 'ask', 'unsupported player targets are ignored');
assert.equal(environment(env.store).api.target(card, 'internal'), 'ask', 'player targets persist across reload');
env.api.reset(card);
assert.equal(env.api.target(card, 'internal'), 'internal', 'reset clears the title target together with its dub/source');

env = environment();
env.api.observe([studioKodik, libriaKodik, libriaSibnet]);
assert.deepEqual(Array.from(env.api.knownVoices()), ['AniLibria', 'Studio Band'], 'known voices come from actual distinct API groups');
const observedWrites = env.writes.length;
env.api.observe([libriaSibnet, group(' anilibria ', 'Kodik'), studioKodik]);
assert.equal(env.writes.length, observedWrites, 'opening the same voices again does not rewrite the voice catalogue');
assert.deepEqual(Array.from(environment(env.store).api.knownVoices()), ['AniLibria', 'Studio Band']);
const manyVoices = Array.from({length: 200}, (_, index) => group('Observed ' + index, 'Kodik'));
env.api.observe(manyVoices);
assert.equal(env.api.knownVoices().length, 160, 'the local voice catalogue is bounded');
const boundedVoiceWrites = env.writes.length;
env.api.observe(manyVoices);
assert.equal(env.writes.length, boundedVoiceWrites, 'the same oversized voice response must not churn the bounded catalogue');
for (let id = 1; id <= 201; id++) env.api.remember({yani_id: id}, group('Studio ' + id, 'Kodik'));
const persistedChoices = JSON.parse(env.store.yani_playback_preferences_v1);
assert.equal(Object.keys(persistedChoices.items).length, 200, 'per-title persistence has a fixed upper bound');
assert.equal(env.api.saved({yani_id: 1}), null, 'the oldest explicit choice is evicted even if several writes share one clock millisecond');
assert.equal(env.api.saved({yani_id: 201}).voice, 'Studio 201', 'the most recent explicit choice is retained');
assert.ok(!JSON.stringify(persistedChoices).includes('https://'), 'saved choices retain no episode URLs');
const stableWrites = env.writes.length;
env.api.remember({yani_id: 201}, group('Studio 201', 'Kodik'));
assert.equal(env.writes.length, stableWrites, 'an unchanged explicit choice causes no storage churn');
env.api.remember({yani_id: '__proto__'}, studioKodik);
assert.equal(env.api.saved({yani_id: '__proto__'}), null);

env = environment({yani_playback_preferences_v1: '{bad', yani_known_voices_v1: '{bad', yani_default_source: 'invalid', yani_default_voice: {invalid: true}});
assert.equal(env.api.saved(card), null, 'corrupt storage cannot break playback');
assert.deepEqual(Array.from(env.api.knownVoices()), []);
assert.equal(env.api.defaults().voice, '');
assert.equal(env.api.defaults().source, 'auto');
assert.equal(env.api.resolve(card, groups).group, studioKodik);

env = environment({yani_default_source: 'kodik', yani_default_voice: 'Studio Band'});
const successfulSet = env.storage.set;
env.storage.set = () => { throw new Error('QuotaExceededError'); };
env.api.setDefaults({voice: 'AniLibria', source: 'sibnet'});
assert.equal(env.store.yani_default_source, 'kodik', 'quota failures leave the previous native value readable');
assert.equal(env.api.defaults().source, 'sibnet', 'a rejected write keeps the new default source usable in this session');
assert.equal(env.api.defaults().voice, 'AniLibria');
assert.equal(env.api.resolve(card, groups).group, libriaSibnet);
env.api.remember(card, studioKodik);
env.api.rememberTarget(card, 'external');
assert.equal(env.api.resolve(card, groups).group, studioKodik, 'anime choices remain available after a failed persistence write');
assert.equal(env.api.target(card, 'internal'), 'external', 'failed target writes use the same in-memory entry');
env.api.observe([studioKodik, libriaSibnet]);
assert.deepEqual(Array.from(env.api.knownVoices()), ['AniLibria', 'Studio Band'], 'observed voices also survive a quota failure for this session');
env.api.reset(card);
assert.equal(env.api.saved(card), null, 'reset updates a dirty in-memory title map');
env.storage.set = successfulSet;
env.api.setDefaults({voice: 'Subtitles Team', source: 'cvh'});
assert.equal(env.store.yani_default_source, 'cvh', 'a later successful write resumes native persistence');
env.store.yani_default_source = 'sibnet';
env.store.yani_default_voice = 'AniLibria';
assert.equal(env.api.defaults().source, 'sibnet', 'successful writes clear dirty state so later native Settings updates stay visible');
assert.equal(env.api.defaults().voice, 'AniLibria');

env = environment();
env.api.setDefaults({voice: 'Studio Band', source: 'kodik'});
env.store.yani_default_voice = 'AniLibria';
env.store.yani_default_source = 'sibnet';
assert.equal(env.api.resolve(card, groups).group, libriaSibnet,
    'a clean key must read native Settings edits instead of a stale transient copy');

env = environment();
const animeVost = group('Озвучка AnimeVost', 'Kodik');
const ndaVoice = group('NDA Studio', 'Kodik');
const ndaDub = group('Дубляж NDA Studio', 'Kodik');
const ndaSubs = group('Субтитры NDA Studio', 'Kodik');
const labeledGroups = [ndaDub, ndaSubs, ndaVoice, animeVost];
env.api.setDefaults({voice: 'AnimeVost'});
assert.equal(env.api.resolve(card, labeledGroups).group, animeVost,
    'a manually entered team name matches its optional generic API voice-over prefix');
assert.equal(env.api.normalizeVoice('Озвучення AnimeVost'), 'animevost');
assert.equal(env.api.normalizeVoice('ОзвучкаAnimeVost'), 'озвучкаanimevost', 'only a separate leading generic label is optional');
assert.equal(animeVost.title, 'Озвучка AnimeVost', 'matching does not change the displayed API title');
env.api.setDefaults({voice: 'NDA Studio'});
assert.equal(env.api.resolve(card, labeledGroups).group, ndaVoice, 'bare names must not also match dubbed or subtitled releases');
env.api.setDefaults({voice: 'Дубляж NDA Studio'});
assert.equal(env.api.resolve(card, labeledGroups).group, ndaDub, 'an explicit dub stays distinct');
env.api.setDefaults({voice: 'Субтитры NDA Studio'});
assert.equal(env.api.resolve(card, labeledGroups).group, ndaSubs, 'an explicit subtitle team stays distinct');
env.api.setDefaults({voice: 'FRONDA'});
const frondaStudio = group('FrondaStudio', 'Kodik');
const fronda = group('Озвучка FRONDA', 'Sibnet');
assert.equal(env.api.resolve(card, [frondaStudio, fronda]).group, fronda,
    'normalization must not fuzzy-merge unrelated team names');
assert.notEqual(env.api.normalizeVoice('FRONDA'), env.api.normalizeVoice('FrondaStudio'));

console.log('Playback preferences runtime checks passed');

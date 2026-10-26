'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function Node(tag) { this.tag = tag || 'div'; this.attrs = {}; this.classes = []; this.children = []; this.parentNode = null; this.text = ''; this.events = []; }
function text(node) { return node.text + node.children.map(text).join(''); }
function match(node, selector) {
    const attr = selector.match(/^\[([^=]+)="([^"]*)"\]$/);
    if (attr) return node.attrs[attr[1]] === attr[2];
    if (selector[0] === '.') return selector.slice(1).split('.').every(name => node.classes.includes(name));
    return node.tag === selector;
}
function find(node, selector, result = []) { node.children.forEach(child => { if (match(child, selector)) result.push(child); find(child, selector, result); }); return result; }
function parse(html) {
    const holder = new Node('fragment'), stack = [holder];
    for (const part of html.matchAll(/<\/?[^>]+>|[^<]+/g)) {
        const token = part[0];
        if (token.startsWith('</')) { stack.pop(); continue; }
        if (token[0] !== '<') { stack[stack.length - 1].text += token; continue; }
        const name = token.match(/^<([\w-]+)/); if (!name) continue;
        const node = new Node(name[1]);
        for (const attr of token.matchAll(/([\w-]+)="([^"]*)"/g)) node.attrs[attr[1]] = attr[2];
        node.classes = (node.attrs.class || '').split(/\s+/).filter(Boolean);
        node.parentNode = stack[stack.length - 1]; node.parentNode.children.push(node);
        if (!['img', 'input', 'path', 'br'].includes(node.tag)) stack.push(node);
    }
    holder.children.forEach(node => { node.parentNode = null; }); return holder.children;
}
function Wrapper(nodes) { this.nodes = nodes || []; this.length = this.nodes.length; this.jquery = true; this.nodes.forEach((node, i) => { this[i] = node; }); }
function $(value) { return value instanceof Wrapper ? value : new Wrapper(value instanceof Node ? [value] : typeof value === 'string' && value[0] === '<' ? parse(value) : []); }
function detach(node) { if (!node.parentNode) return; node.parentNode.children.splice(node.parentNode.children.indexOf(node), 1); node.parentNode = null; }
Wrapper.prototype.append = function (...values) { this.nodes.forEach(parent => values.forEach(value => $(value).nodes.forEach(node => { detach(node); node.parentNode = parent; parent.children.push(node); }))); return this; };
Wrapper.prototype.empty = function () { this.nodes.forEach(node => { node.children.forEach(child => { child.parentNode = null; }); node.children = []; node.text = ''; }); return this; };
Wrapper.prototype.text = function (value) { if (value === undefined) return this.nodes.map(text).join(''); this.empty(); this.nodes.forEach(node => { node.text = String(value); }); return this; };
Wrapper.prototype.addClass = function (names) { this.nodes.forEach(node => String(names || '').split(/\s+/).filter(Boolean).forEach(name => { if (!node.classes.includes(name)) node.classes.push(name); })); return this; };
Wrapper.prototype.toggleClass = function (name, enabled) { this.nodes.forEach(node => { node.classes = node.classes.filter(value => value !== name); if (enabled) node.classes.push(name); }); return this; };
Wrapper.prototype.attr = function (key, value) { if (typeof key === 'object') { Object.keys(key).forEach(name => this.attr(name, key[name])); return this; } if (value === undefined) return this[0] && this[0].attrs[key]; this.nodes.forEach(node => { node.attrs[key] = String(value); }); return this; };
Wrapper.prototype.on = function (event, callback) { this.nodes.forEach(node => { node.events.push({event, callback}); }); return this; };
Wrapper.prototype.trigger = function (event) { this.nodes.forEach(node => node.events.filter(handler => handler.event === event).forEach(handler => handler.callback.call(node, {currentTarget: node, target: node}))); return this; };
Wrapper.prototype.find = function (selector) { return new Wrapper(this.nodes.flatMap(node => find(node, selector))); };
Wrapper.prototype.first = function () { return new Wrapper(this.nodes.slice(0, 1)); };
Wrapper.prototype.each = function (callback) { this.nodes.forEach((node, index) => callback.call(node, index, node)); return this; };
Wrapper.prototype.remove = function () { this.nodes.forEach(detach); return this; };

function environment(options = {}) {
    const documentRoot = new Node('document'), timers = new Map(), launches = [], remembered = [], defaults = [], storage = {}, notices = [], controllers = {}, panels = [];
    let sequence = 0, enabled = 'content', currentTarget = 'internal', selectedAnime = false, resets = 0, playlistCalls = 0;
    const prefs = {
        normalizeVoice: value => String(value).toLowerCase().trim(), source: group => String(group.playerId || group.player).toLowerCase(),
        saved: () => selectedAnime ? {} : null,
        remember: (card, group) => { selectedAnime = true; remembered.push([card.yani_id, group.title, group.playerId]); },
        setDefaults: patch => defaults.push(patch),
        reset: () => { selectedAnime = false; resets++; currentTarget = 'internal'; },
        resolve: (card, groups) => ({group: groups[0], origin: 'default', unavailable: false})
    };
    const Lampa = {
        Scroll: function (options) { assert.equal(options.mask, false); assert.equal(options.notransition, true); const root = $('<div class="scroll"></div>'); this.minus = () => {}; this.update = () => {}; this.append = value => root.append(value); this.render = js => js ? root[0] : root; this.destroy = () => root.remove(); },
        Controller: {enabled: () => ({name: enabled}), add: (name, controller) => { controllers[name] = controller; }, toggle: name => { enabled = name; if (controllers[name] && controllers[name].toggle) controllers[name].toggle(); }, collectionSet: () => {}, collectionFocus: element => { find(documentRoot, '.focus').forEach(node => { node.classes = node.classes.filter(name => name !== 'focus'); }); if (element) { $(element).addClass('focus'); $(element).trigger('hover:focus'); } }},
        Storage: {get: (key, fallback) => Object.prototype.hasOwnProperty.call(storage,key) ? storage[key] : fallback, set: (key, value) => { storage[key] = value; }}, Noty: {show: message => notices.push(message)}
    };
    const context = {window: {}, Lampa, $, document: {documentElement: {contains: node => { for (let current = node; current; current = current.parentNode) if (current === documentRoot) return true; return false; }}},
        setTimeout: fn => { const id = ++sequence; timers.set(id, fn); return id; }, clearTimeout: id => timers.delete(id),
        console, Navigator: {canmove: () => true, move: () => {}, add: () => {}}};
    context.window = context;
    if (options.panel) context.LampaYaniChoicePanel = {show: params => {
        const record = {params, destroyed: false};
        record.select = index => {
            if (record.destroyed) return;
            record.destroyed = true; enabled = 'content';
            Lampa.Controller.collectionFocus(params.origin[0]);
            if (params.onClose) params.onClose('select');
            params.onSelect(params.items[index]);
        };
        record.back = () => {
            if (record.destroyed) return;
            record.destroyed = true; enabled = 'content';
            Lampa.Controller.collectionFocus(params.origin[0]);
            if (params.onClose) params.onClose('back');
            if (params.onBack) params.onBack();
        };
        record.handle = {destroy: () => { record.destroyed = true; if (params.onClose) params.onClose('destroy'); }};
        panels.push(record); enabled = 'yani_choice_panel';
        return record.handle;
    }};
    if (options.auth) context.LampaYaniAuth = {get: () => options.auth, token: () => options.auth.token || ''};
    vm.runInNewContext(fs.readFileSync('src/episode.js', 'utf8') + '\n' + fs.readFileSync('src/ui-playback-picker.js', 'utf8'), context);
    if (options.progress) vm.runInNewContext(fs.readFileSync('src/ui-episode-progress.js','utf8'), context);
    const allVideos = length => Array.from({length}, (_, index) => ({number: index + 1, video_id: 'v' + (index + 1)}));
    const groups = [
        {title: 'Studio A', player: 'Kodik', playerId: 'kodik', videos: allVideos(1403)},
        {title: 'Studio A', player: 'Sibnet', playerId: 'sibnet', videos: allVideos(3)},
        {title: 'Studio B', player: 'Kodik', playerId: 'kodik', videos: allVideos(1403)}
    ];
    if (options.extraVoices) for (let index = 0; index < options.extraVoices; index++) groups.push({title: 'Extra Studio ' + index, player: 'Kodik', playerId: 'kodik', videos: allVideos(3)});
    (options.watched || []).forEach(entry => Object.assign(groups[0].videos[entry.index], entry.video));
    const object = {card: {yani_id: 42, title: 'Fixture'}, groups, selection: {group: JSON.parse(JSON.stringify(groups[options.selectionIndex || 0])), origin: 'default', unavailable: false}};
    const component = context.LampaYaniPlaybackPicker.create(object, {
        t: key => key, preferences: prefs, progress: options.progress ? context.LampaYaniEpisodeProgress : null, loadProgress: options.loadProgress, sourceId: group => group.playerId, sourceLabel: group => group.player,
        playlist: (card, group) => { playlistCalls++; return group.videos; }, getPlayback: () => options.playback || ({number: 1075, time: 31, duration: 100}),
        episodeTitle: (card, video) => 'Episode ' + video.number, groupSubtitle: group => group.videos.length + ' episodes',
        targetPreference: () => currentTarget, rememberTarget: (card, value) => { currentTarget = value; selectedAnime = true; }, externalAvailable: () => true,
        launch: (...args) => launches.push(args), goBack: () => {}
    });
    component.activity = {loader: () => {}, toggle: () => component.start()};
    component.create(); $(documentRoot).append(component.render()); component.start();
    const flush = () => { const work = Array.from(timers.values()); timers.clear(); work.forEach(fn => fn()); };
    flush();
    const root = component.render();
    const enter = key => { const element = root.find('[data-yani-focus-key="' + key + '"]'); assert.equal(element.length, 1, key + ' must identify one action'); element.trigger('hover:enter'); flush(); };
    return {component, root, groups, progress: context.LampaYaniEpisodeProgress, enter, flush, launches, remembered, defaults, storage, notices, controllers, timers, panels, resetCount: () => resets, playlistCalls: () => playlistCalls};
}

let env = environment();
assert.equal(env.root.find('.yani-playback__episode').length, 12, 'only twelve episodes are rendered for a 1403-episode title');
assert.equal(env.root.find('.focus').attr('data-yani-focus-key'), 'watch', 'saved/default choice opens with one-OK playback');
assert.match(env.root.find('.yani-playback__watch').text(), /1075/);
assert.equal(env.playlistCalls(), 1, 'serialized selected group is reconciled with cached real groups');
env.enter('episode:1074');
assert.equal(env.launches.length, 1);
assert.equal(env.launches[0][2].length, 1403, 'the complete playlist reaches playback despite paging');
assert.equal(env.launches[0][3].number, 1075);
assert.equal(env.launches[0][3].watched.end_time, 31, 'resume position is carried to the same episode');
assert.ok(env.launches[0][4].jquery && env.launches[0][5].jquery, 'actual episode and Scroll collection are supplied for return focus');
env.enter('watch');
assert.equal(env.launches.length, 1, 'repeated OK cannot start a second resolver while playback is pending');
env.component.playbackRestored(); env.enter('watch');
assert.equal(env.launches.length, 2, 'confirmed playback return unlocks the next explicit launch');

env = environment();
env.enter('episode:1075');
assert.match(env.root.find('.yani-playback__watch-episode').text(), /1076/, 'clicking a different episode updates the persistent Watch action');
assert.equal(env.root.find('[data-yani-focus-key="episode:1075"]').attr('aria-pressed'), 'true');
assert.equal(env.root.find('[data-yani-focus-key="episode:1074"]').attr('aria-pressed'), 'false');
env.component.start();
assert.match(env.root.find('.yani-playback__watch-episode').text(), /1076/, 'the launched episode stays visible after player return');

env = environment({extraVoices: 35, selectionIndex: 36});
env.enter('voice');
assert.ok(env.root.find('.yani-playback__option').length <= 30);
assert.match(env.root.find('.yani-playback__option.is-selected').text(), /Extra Studio 33/, 'an existing selection opens its own option page rather than page zero');
assert.match(env.root.find('.focus').text(), /Extra Studio 33/, 'the current voice is immediately focused even beyond the first thirty');

env = environment();
env.enter('voice');
assert.equal(env.root.find('.yani-playback__option').length, 2, 'duplicate providers do not duplicate dubbing choices');
env.enter('option:1');
assert.deepEqual(env.remembered[0], [42, 'Studio B', 'kodik']);
assert.equal(env.launches.length, 0, 'changing a preference never starts playback');
assert.match(env.root.find('.yani-playback__watch').text(), /1075/, 'episode number survives a dub change');
env.enter('source');
assert.equal(env.root.find('.yani-playback__option').length, 1, 'unavailable dub/provider combinations are never offered');
env.controllers.content.back(); env.flush();
env.enter('voice'); env.enter('option:0'); env.enter('source'); env.enter('option:1');
assert.deepEqual(env.remembered.slice(-1)[0], [42, 'Studio A', 'sibnet']);
assert.match(env.root.find('.yani-playback__watch').text(), /3/);
assert.equal(env.root.find('.yani-playback__notice').text(), 'playback_episode_missing', 'a missing episode explains fallback');
assert.equal(env.root.find('.yani-playback__episode').length, 3, 'source-specific episode counts remain independent');
env.enter('target'); env.enter('option:1');
assert.equal(env.root.find('[data-yani-focus-key="save-defaults"]').length, 0, 'global preferences belong only in Settings');
assert.equal(env.defaults.length, 0, 'anime voice/source changes cannot overwrite global defaults');
assert.equal(env.storage.yani_playback_target, undefined, 'per-anime player changes cannot overwrite the global player setting');
env.enter('defaults'); assert.equal(env.resetCount(), 1);
assert.match(env.root.find('.yani-playback__field-value').text(), /Kodik/);
assert.equal(env.remembered.length, 3, 'resetting uses defaults without saving fallback as a new override');
env.component.pause(); env.enter('voice');
assert.equal(env.root.find('.yani-playback__options').length, 0, 'paused screens cannot take input');
env.component.destroy(); env.flush();
assert.equal(env.root.find('.selector').length, 0, 'destroy drops all screen controls');
assert.equal(env.timers.size, 0, 'destroy cancels deferred focus and launch guards');

// A real side panel must leave the source screen and its primary controls in place.
env = environment({panel: true});
const watchNode = env.root.find('[data-yani-focus-key="watch"]')[0];
const voiceNode = env.root.find('[data-yani-focus-key="voice"]')[0];
const sourceNode = env.root.find('[data-yani-focus-key="source"]')[0];
const episodeGrid = env.root.find('.yani-playback__episodes')[0];
const titleNode = env.root.find('.yani-playback__title')[0];
env.enter('voice');
assert.equal(env.panels.length, 1);
assert.equal(env.panels[0].params.title, 'playback_voice');
assert.equal(env.panels[0].params.items.length, 2);
assert.equal(env.root.find('.yani-playback__option').length, 0, 'the main page must not become an options page');
assert.strictEqual(env.root.find('.yani-playback__episodes')[0], episodeGrid, 'episodes remain behind the panel');
assert.strictEqual(env.root.find('.yani-playback__title')[0], titleNode);
env.enter('watch');
assert.equal(env.launches.length, 0, 'a background Enter cannot launch while choices have focus');
env.panels[0].select(1); env.flush();
assert.deepEqual(env.remembered[0], [42, 'Studio B', 'kodik']);
assert.strictEqual(env.root.find('[data-yani-focus-key="watch"]')[0], watchNode);
assert.strictEqual(env.root.find('[data-yani-focus-key="voice"]')[0], voiceNode, 'voice choice preserves the invoking control');
assert.strictEqual(env.root.find('[data-yani-focus-key="source"]')[0], sourceNode);
assert.strictEqual(env.root.find('.yani-playback__episodes')[0], episodeGrid, 'only episode children change for a new pair');
assert.equal(env.root.find('.focus').attr('data-yani-focus-key'), 'voice');
assert.match(env.root.find('.yani-playback__watch').text(), /1075/, 'a real episode number survives the new translation');
assert.equal(env.defaults.length, 0);
env.enter('source');
assert.equal(env.panels[1].params.items.length, 1, 'source options stay limited to the selected voice');
env.panels[1].back(); env.flush();
assert.equal(env.root.find('.focus').attr('data-yani-focus-key'), 'source');
env.enter('voice');
const stalePanel = env.panels[2];
env.component.pause();
assert.equal(stalePanel.destroyed, true, 'pausing destroys the owned panel without restoring focus');
stalePanel.params.onSelect(stalePanel.params.items[0]);
assert.equal(env.remembered.length, 1, 'a late panel choice cannot mutate a hidden screen');
env.component.start(); env.enter('voice');
const destroyedPanel = env.panels[3]; env.component.destroy();
assert.equal(destroyedPanel.destroyed, true);
destroyedPanel.params.onSelect(destroyedPanel.params.items[0]);
assert.equal(env.remembered.length, 1, 'destroy invalidates captured panel callbacks');
console.log('Playback picker runtime: bounded episodes, real combinations, in-place side panels, return focus and lifecycle passed');


(async function watchedEpisodeChecks() {
    let loads = 0, resolveFresh;
    const watched = [{index:0, video:{duration:100,watched:{end_time:98}}},
        {index:2,video:{watched:{completed:true}}}, {index:3,video:{duration:100,watched:{end_time:37}}}];
    const env = environment({progress:true, playback:{number:1,time:0,duration:100}, watched,
        loadProgress: () => {loads++;return new Promise(resolve => {resolveFresh=resolve;});}});
    const tile = i => env.root.find('[data-yani-focus-key="episode:'+i+'"]');
    assert.equal(loads,0,'initial fresh groups do not trigger a second request');
    assert.equal(tile(0).attr('data-yani-episode-state'),'completed');
    assert.equal(tile(1).attr('data-yani-episode-state'),'none','sparse watches must not fill earlier/later gaps');
    assert.equal(tile(2).attr('data-yani-episode-state'),'completed','explicit completion needs no duration');
    assert.equal(tile(3).attr('data-yani-episode-state'),'started');
    assert.match(tile(3).find('.yani-playback__episode-status').text(),/37%/);
    assert.match(tile(0).attr('aria-label'),/playback_episode_completed/);
    const existing=tile(0)[0], focused=env.root.find('.focus')[0];
    const refresh=env.component.refreshProgress();const joined=env.component.refreshProgress();
    assert.strictEqual(refresh,joined,'manual and return refreshes share a single request');
    await Promise.resolve(); assert.equal(loads,1);
    resolveFresh([{number:2,duration:100,watched:{end_time:99}}]); await refresh;
    assert.strictEqual(tile(0)[0],existing,'fresh server states do not replace episode nodes');
    assert.strictEqual(env.root.find('.focus')[0],focused,'progress refresh never steals focus');
    assert.equal(tile(0).attr('data-yani-episode-state'),'none','fresh snapshot replaces old server-only flags');
    assert.equal(tile(1).attr('data-yani-episode-state'),'completed');
    env.progress.record(42,{number:3,duration:100,watched:{end_time:99}});
    env.component.progressChanged({yani_id:42});
    assert.equal(tile(2).attr('data-yani-episode-state'),'completed','local completion appears without a server request');
    assert.equal(loads,1);
    env.component.progressChanged({yani_id:999}); assert.equal(loads,1);
    const pending=env.component.refreshProgress(); await Promise.resolve();
    env.component.destroy(); resolveFresh([{number:4,duration:100,watched:{end_time:99}}]);
    assert.equal(await pending,false,'late replies cannot paint a destroyed screen');

    const auth={login:'Alice',token:'secret-a'};
    let resolveOld;
    const scoped=environment({progress:true,auth,playback:{number:1},watched,
        loadProgress:()=>new Promise(resolve=>{resolveOld=resolve;})});
    const old=scoped.component.refreshProgress();await Promise.resolve();
    auth.login='Bob';auth.token='secret-b';
    scoped.component.progressChanged({yani_id:42});
    assert.equal(scoped.root.find('[data-yani-focus-key="episode:0"]').attr('data-yani-episode-state'),'none');
    resolveOld([{number:1,watched:{completed:true}}]);assert.equal(await old,false);
    assert.equal(scoped.root.find('[data-yani-focus-key="episode:0"]').attr('data-yani-episode-state'),'none','old account reply cannot recolor a new account');
    scoped.component.destroy();
    console.log('Watched episode UI: sparse colors, partial progress, server refresh, stable nodes/focus and owner lifecycle passed');
}()).catch(error=>{console.error(error);process.exitCode=1;});

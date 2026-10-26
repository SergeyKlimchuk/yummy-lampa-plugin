'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const repoRoot = process.env.YANI_REPO_ROOT || path.resolve(__dirname, '..');
const sourceRoot = process.env.YANI_SOURCE_ROOT || path.join(repoRoot, 'src');
const {tvEnvironment, $} = require(path.join(repoRoot, 'tests/helpers/tv-dom'));

function setup() {
    const env = tvEnvironment(), appended = [], selected = [];
    const panel = $('<div class="player-panel"><div class="player-panel__left"><div class="player-panel__playlist-buttons hide"><div class="button selector native-playlist"></div></div></div><div class="player-panel__center"><div class="button selector native-playpause"></div></div></div>');
    $(env.document.body).append(panel);
    let clock = 1000, owner = true, nativeCalls = 0;
    panel.find('.native-playlist').on('hover:enter', () => { nativeCalls++; });
    env.context.Lampa.PlayerPanel = {render: () => panel};
    env.context.Lampa.Controller.collectionAppend = element => appended.push(element);
    env.context.Date = env.context.window.Date = {now: () => clock};
    vm.runInNewContext(fs.readFileSync(path.join(sourceRoot, 'ui-player-episodes.js'), 'utf8'), env.context);
    const videos = [{number: 1}, {number: 2}, {number: 3}];
    function bind(position, extra) {
        return env.context.window.LampaYaniPlayerEpisodes.bind(Object.assign({
            context: {videos, selected: videos[position]},
            items: videos.map(video => ({video, label: String(video.number)})),
            selected: videos[position], valid: () => owner,
            onSelect: video => { selected.push(video); }, t: key => key
        }, extra));
    }
    return {env, panel, videos, selected, appended, bind,
        previous: () => panel.find('.yani-player-episode--previous'),
        next: () => panel.find('.yani-player-episode--next'),
        group: () => panel.find('.yani-player-episodes'),
        advance: () => { clock += 400; }, invalidate: () => { owner = false; }, nativeCalls: () => nativeCalls};
}

{
    const h = setup();
    h.env.context.Lampa.Controller.toggle('player_panel');
    h.env.context.Lampa.Controller.collectionFocus(h.panel.find('.native-playpause')[0]);
    const focusCount = h.env.focusCalls.length;
    const handle = h.bind(0);
    assert.ok(handle);
    assert.equal(h.group().length, 1);
    assert.strictEqual(h.group().parent()[0], h.panel.find('.player-panel__left')[0], 'own group is a sibling of the hidden native playlist');
    assert.equal(h.previous().attr('aria-disabled'), 'true');
    assert.equal(h.previous().hasClass('selector'), false, 'boundary controls do not receive remote focus');
    assert.equal(h.next().find('.yani-player-episode__label').text(), '2');
    assert.equal(h.next().attr('aria-label'), 'Следующая серия: 2');
    assert.equal(h.appended.length, 1, 'only an enabled control enters an already open native panel');
    assert.equal(h.env.focusCalls.length, focusCount, 'binding does not steal native play/pause focus');
    h.previous().trigger('hover:enter'); assert.equal(h.selected.length, 0);
    h.next().trigger('click').trigger('hover:enter');
    assert.deepEqual(h.selected, [h.videos[1]], 'a synthetic hover:enter following click starts one transition');
    assert.equal(h.group().attr('aria-busy'), 'true');
    assert.equal(h.next().hasClass('selector'), false);
    h.advance(); h.next().trigger('hover:enter'); assert.equal(h.selected.length, 1, 'busy remains locked during asynchronous handoff');
    handle.setBusy(false); h.advance(); h.next().trigger('hover:enter'); assert.equal(h.selected.length, 2);
    const oldButton = h.next();
    handle.destroy(); handle.destroy();
    assert.equal(h.group().length, 0);
    oldButton.trigger('click').trigger('hover:enter'); assert.equal(h.selected.length, 2, 'destroy detaches both handlers');
    h.panel.find('.native-playlist').trigger('hover:enter'); assert.equal(h.nativeCalls(), 1, 'native handlers survive cleanup');
}

{
    const h = setup(), first = h.bind(1), firstPrevious = h.previous();
    assert.equal(h.previous().find('.yani-player-episode__label').text(), '1');
    assert.equal(h.next().find('.yani-player-episode__label').text(), '3');
    h.previous().trigger('hover:enter'); assert.strictEqual(h.selected[0], h.videos[0]);
    const second = h.bind(2);
    assert.equal(h.group().length, 1, 'persistent native panels receive exactly one owned group');
    assert.equal(h.next().attr('aria-disabled'), 'true');
    assert.equal(h.next().hasClass('selector'), false);
    assert.equal(h.previous().find('.yani-player-episode__label').text(), '2');
    firstPrevious.trigger('click'); assert.equal(h.selected.length, 1, 'replaced binding cannot navigate');
    first.destroy(); assert.equal(h.group().length, 1, 'a stale destroy cannot remove a new owner');
    h.next().trigger('click'); assert.equal(h.selected.length, 1, 'last episode does not wrap');
    h.previous().trigger('click'); assert.strictEqual(h.selected[1], h.videos[1]);
    second.destroy(); assert.equal(h.group().length, 0);
}

{
    const h = setup(); h.bind(1);
    h.invalidate();
    h.next().trigger('hover:enter'); assert.equal(h.selected.length, 0, 'session/account validity guards every action');
    const invalid = h.bind(1);
    assert.strictEqual(invalid, null); assert.equal(h.group().length, 0, 'an invalid replacement retires old UI');
}

{
    const h = setup();
    h.env.context.Lampa.Controller.toggle('player_panel');
    let handle = h.bind(1, {onSelect: () => false});
    h.env.context.Lampa.Controller.collectionFocus(h.next()[0]);
    h.next().trigger('click');
    assert.equal(h.next().attr('aria-disabled'), 'false');
    assert.equal(h.next().hasClass('focus'), true, 'rejected action restores its own focus');
    const calls = h.env.focusCalls.length;
    handle.setBusy(true);
    h.env.context.Lampa.Controller.collectionFocus(h.panel.find('.native-playpause')[0]);
    handle.setBusy(false);
    assert.equal(h.env.focusCalls.length, calls + 1, 'unlock cannot steal focus moved by the user');
    handle.destroy();
    handle = h.bind(1, {onSelect: () => { throw new Error('Cancelled'); }});
    h.next().trigger('hover:enter'); assert.equal(h.next().hasClass('selector'), true, 'failed handler unlocks safely');
    handle.destroy();
    assert.equal(h.appended.every(node => $(node).hasClass('button')), true, 'native selector collection receives the actual buttons');
}

{
    const h = setup();
    assert.strictEqual(h.bind(0, {items: [{video: h.videos[0], label: '1'}]}), null, 'single episode adds no empty navigation');
    assert.strictEqual(h.bind(0, {selected: {number: 1}}), null, 'unmatched selection cannot target the wrong episode');
    delete h.env.context.Lampa.PlayerPanel;
    assert.strictEqual(h.bind(0), null, 'a host without native panel support keeps playback working');
    h.env.context.Lampa.PlayerPanel = {render: () => { throw new Error('Old host'); }};
    assert.strictEqual(h.bind(0), null, 'incompatible panel implementations do not break launch');
}

console.log('Native episode controls: boundaries, persistent panel ownership, focus, busy/session guards and cleanup passed');

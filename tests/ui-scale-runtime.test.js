'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('src/ui-scale.js', 'utf8');
const key = 'yani_interface_scale';

// Run the production module with a deterministic event loop. No browser or
// account is needed to check persistence, profile boundaries or resize churn.
function environment(width, height, saved) {
    const store = saved || {};
    const native = {}, lampa = {}, timers = new Map(), writes = [], callbacks = [];
    let timerId = 0;
    const document = {
        documentElement: {
            style: {setProperty: (name, value) => writes.push([name, value])}
        }
    };
    const Lampa = {
        Storage: {
            get: (name, fallback) => Object.prototype.hasOwnProperty.call(store, name) ? store[name] : fallback,
            set: (name, value) => { store[name] = value; }
        },
        Listener: {follow: (name, fn) => (lampa[name] || (lampa[name] = [])).push(fn)}
    };
    const schedule = (fn, delay) => { const id = ++timerId; timers.set(id, {fn, delay}); return id; };
    const cancel = id => timers.delete(id);
    const window = {
        innerWidth: width, innerHeight: height, document, Lampa,
        addEventListener: (name, fn) => (native[name] || (native[name] = [])).push(fn),
        setTimeout: schedule, clearTimeout: cancel
    };
    vm.runInNewContext(source, {window, document, Lampa, console, setTimeout: schedule, clearTimeout: cancel});
    const api = window.LampaYaniScale;
    assert.ok(api, 'the scale module must expose its API');
    function flush() {
        // A bound catches accidental polling instead of hanging the test run.
        for (let pass = 0; timers.size && pass < 12; pass++) {
            const pending = Array.from(timers.values());
            timers.clear(); pending.forEach(timer => timer.fn());
        }
        assert.equal(timers.size, 0, 'scale updates must settle without polling');
    }
    function fire(events, name) { (events[name] || []).slice().forEach(fn => fn()); }
    return {
        api, store, window, writes, callbacks, timers, native, lampa, flush,
        start: () => api.start(state => callbacks.push(state)),
        resize: (nextWidth, nextHeight) => {
            window.innerWidth = nextWidth; window.innerHeight = nextHeight;
            fire(native, 'resize');
        },
        resizeEnd: () => fire(lampa, 'resize_end')
    };
}

let env = environment(1280, 720);
[
    [844, 390, 'compact', 100], [959, 600, 'compact', 100],
    [960, 540, 'hd', 130], [1280, 720, 'hd', 130],
    [1599, 900, 'hd', 130], [1600, 899, 'hd', 130],
    [1600, 900, 'fhd', 140], [1920, 1080, 'fhd', 140],
    [2199, 1200, 'fhd', 140], [2200, 1199, 'fhd', 140],
    [2200, 1200, 'qhd', 145], [2560, 1440, 'qhd', 145],
    [3199, 1800, 'qhd', 145], [3200, 1799, 'qhd', 145],
    [3200, 1800, 'uhd', 150], [3840, 2160, 'uhd', 150],
    [1080, 1920, 'fhd', 140], [3840, 720, 'hd', 130]
].forEach(([width, height, id, percent]) => {
    const result = env.api.profile(width, height);
    assert.equal(result.id, id, width + '×' + height + ' profile');
    assert.equal(result.percent, percent, width + '×' + height + ' default scale');
});

[80, 100, 130, 200, '80', '130', '200', {value: '160'}].forEach(value => {
    const normalized = env.api.normalize(value);
    const expected = typeof value === 'object' ? value.value : value;
    assert.equal(String(normalized), String(expected), 'valid manual scale stays selectable');
});
[undefined, null, '', false, true, 0, 79, 201, 130.5, 1.3, '130%', 'bad', {}, {value: 999}].forEach(value => {
    assert.equal(env.api.normalize(value), 'auto', 'invalid scale falls back to Auto');
});
assert.equal(env.api.normalize('auto'), 'auto');
const options = env.api.values(() => 'Auto');
assert.ok(options.auto.includes('130%'), 'Auto must show the current profile default');
assert.equal(options['80'], '80%');
assert.equal(options['200'], '200%');

env.start(); env.flush();
assert.equal(env.api.apply().percent, 130, 'new installations preserve the enlarged HD interface');
assert.equal(env.writes.filter(write => write[0] === '--yani-ui-scale').length, 1,
    'unchanged startup and reads must not rewrite the style');
assert.deepEqual(env.writes[0], ['--yani-ui-scale', '1.3em']);
const initialCallbacks = env.callbacks.length;
env.api.apply({value: '180'}); env.flush();
assert.equal(String(env.store[key]), '180', 'manual scale persists through the native storage API');
assert.equal(env.api.apply().percent, 180);
assert.equal(env.callbacks.length, initialCallbacks + 1, 'a manual change refreshes layout once');
const manualWrites = env.writes.length, manualCallbacks = env.callbacks.length;
env.api.apply(180); env.start(); env.resize(3840, 2160); env.resizeEnd(); env.flush();
assert.equal(env.api.apply().percent, 180, 'resizing cannot override a manual choice');
assert.equal(env.writes.length, manualWrites, 'unchanged manual scale causes no style churn');
assert.equal(env.callbacks.length, manualCallbacks, 'unchanged manual scale causes no layout churn');
assert.equal(env.native.resize.length, 1, 'start is idempotent for native resize listeners');
assert.equal(env.lampa.resize_end.length, 1, 'start is idempotent for Lampa resize listeners');

const persisted = environment(1920, 1080, env.store);
persisted.start(); persisted.flush();
assert.equal(persisted.api.apply().percent, 180, 'the saved manual scale survives module reload');
assert.equal(String(persisted.api.apply().setting), '180');
env.api.apply('auto'); env.flush();
assert.equal(env.store[key], 'auto', 'Auto can be restored after a manual choice');
assert.equal(env.api.apply().percent, 150, 'Auto immediately restores the current 4K default');

env = environment(1280, 720);
env.start(); env.flush();
const beforeResizeWrites = env.writes.length, beforeResizeCallbacks = env.callbacks.length;
env.resize(1920, 1080); env.resize(2560, 1440); env.resizeEnd(); env.resize(3840, 2160); env.resizeEnd();
assert.equal(env.writes.length, beforeResizeWrites, 'a resize burst waits for the settled size');
assert.equal(env.timers.size, 1, 'native and Lampa resize events share one coalesced update');
env.flush();
assert.equal(env.api.apply().percent, 150);
assert.equal(env.writes.length, beforeResizeWrites + 1, 'only the final viewport profile is painted');
assert.equal(env.callbacks.length, beforeResizeCallbacks + 1, 'only one layout refresh follows the burst');
const settledWrites = env.writes.length, settledCallbacks = env.callbacks.length;
env.resize(3840, 2160); env.resizeEnd(); env.flush();
assert.equal(env.writes.length, settledWrites, 'same-profile resize does not repaint the scale');
assert.equal(env.callbacks.length, settledCallbacks, 'same-profile resize does not refresh layout');

env = environment(1920, 1080, {[key]: 'broken'});
env.start(); env.flush();
assert.equal(env.api.apply().percent, 140, 'corrupt saved preferences recover to a usable automatic scale');
assert.equal(env.api.apply().setting, 'auto');

console.log('Responsive interface scale runtime checks passed');

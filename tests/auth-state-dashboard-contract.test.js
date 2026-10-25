// Data-model/authentication coverage is retained; homepage layout and lifecycle
// behavior are covered by the lightweight-home runtime tests.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const authSource = fs.readFileSync('src/auth.js', 'utf8');
const storage = {};
const events = [];

function TestCustomEvent(type, options) {
    this.type = type;
    this.detail = options && options.detail;
}

const context = {
    window: {},
    document: {dispatchEvent: (event) => events.push(event)},
    CustomEvent: TestCustomEvent,
    Promise,
    JSON,
    String,
    Number,
    Date,
    setTimeout,
    clearTimeout,
    fetch: () => Promise.reject(new Error('network is not used by this contract')),
    Lampa: {
        Storage: {
            get: (key, fallback) => Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : fallback,
            set: (key, value) => { storage[key] = value; }
        }
    },
    LampaYaniConfig: {
        apiBase: 'https://api.yani.test',
        applicationToken: () => 'public-token',
        requestTimeout: 1000
    }
};
context.window.Lampa = context.Lampa;
context.window.LampaYaniConfig = context.LampaYaniConfig;
vm.runInNewContext(authSource, context);
const auth = context.window.LampaYaniAuth;

auth.save({token: 'token-a', login: 'viewer'});
assert.deepStrictEqual(events.map((event) => event.detail.authorized), [true], 'sign-in must emit immediately');
auth.save({token: 'token-b', login: 'viewer', display_name: 'Viewer'});
assert.strictEqual(events.length, 1, 'token refreshes must not rebuild dashboard');
auth.clear();
assert.deepStrictEqual(events.map((event) => event.detail.authorized), [true, false], 'sign-out must emit immediately');
auth.clear();
assert.strictEqual(events.length, 2, 'repeated clears must not emit duplicate state changes');


console.log('authorization dashboard state contract tests passed');
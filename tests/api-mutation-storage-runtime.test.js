'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// Lampa.Storage.get parses JSON arrays itself. Use that real return contract,
// not only a string-only localStorage mock; all network responses stay local.
function fixture(options) {
    options = options || {};
    const store = options.store || {}, calls = [], server = {};
    let mode = 'online', writesFail = false;
    const storage = {
        get: (key, fallback) => {
            if (options.throwStorage) throw new Error('storage unavailable');
            const value = Object.prototype.hasOwnProperty.call(store, key) ? store[key] : fallback;
            if (typeof value === 'string' && /^[\[{]/.test(value)) return JSON.parse(value);
            return value;
        },
        set: (key, value) => {
            if (options.throwStorage || writesFail) throw new Error('storage quota');
            store[key] = value;
        }
    };
    const response = () => ({ok: true, status: 200, json: () => Promise.resolve({ok: true})});
    const context = {
        console, Promise, Date, Math, Number, String, Object, Array, JSON,
        URLSearchParams, AbortController, setTimeout, clearTimeout,
        LampaYaniConfig: {apiBase: 'https://api.example.invalid', requestTimeout: 15,
            requestRetries: 0, applicationToken: () => 'public'},
        LampaYaniAuth: {get: () => ({login: 'Alice'}), token: () => 'alice-secret',
            refreshIfNeeded: () => Promise.resolve()},
        LampaYaniI18n: {getLanguage: () => 'ru'},
        Lampa: options.noStorage ? {} : {Storage: storage},
        fetch: (url, request) => {
            const path = url.replace('https://api.example.invalid', '');
            calls.push({path, body: JSON.parse(request.body)});
            if (mode === 'offline') return Promise.reject(new TypeError('offline'));
            if (mode === 'timeout') return new Promise((resolve, reject) => {
                request.signal.addEventListener('abort', () => {
                    const error = new Error('transport aborted'); error.name = 'AbortError'; reject(error);
                }, {once: true});
            });
            server[path] = JSON.parse(request.body);
            return Promise.resolve(response());
        }
    };
    context.window = context;
    vm.runInNewContext(fs.readFileSync('src/api.js', 'utf8'), context);
    return {api: context.LampaYaniApi, store, calls, server,
        mode: value => { mode = value; }, failWrites: value => { writesFail = value; }};
}

async function nativeParsedStorageAndReload() {
    const h = fixture();
    await h.api.syncVideoProgress(55, 120, 1440);
    assert.equal(h.calls.length, 1, 'parsed native Storage must not suppress a live mutation');
    assert.equal(h.server['/video/55'].time, 120);
    assert.equal(h.api.pendingMutations(), 0);
    h.mode('offline'); await h.api.syncVideoProgress(55, 760, 1440);
    assert.equal(h.api.pendingMutations(), 1);
    assert.doesNotMatch(JSON.stringify(h.store), /alice-secret/, 'the durable queue cannot persist bearer credentials');
    const reloaded = fixture({store: h.store});
    await reloaded.api.flushMutations();
    assert.equal(reloaded.server['/video/55'].time, 760, 'parsed persisted queue must survive a fresh API instance');
    assert.equal(reloaded.api.pendingMutations(), 0);
}

async function unavailableStorageDoesNotDisableNetwork() {
    for (const options of [{noStorage: true}, {throwStorage: true}]) {
        const h = fixture(options);
        await h.api.syncVideoProgress(55, 120, 1440);
        assert.equal(h.server['/video/55'].time, 120, 'online writes must work even without durable storage');
        h.mode('offline'); await h.api.syncVideoProgress(55, 760, 1440);
        assert.equal(h.api.pendingMutations(), 1, 'an unavailable durable store must retain pending work in this session');
        h.mode('online'); await h.api.flushMutations();
        assert.equal(h.server['/video/55'].time, 760);
        assert.equal(h.api.pendingMutations(), 0);
    }
}

async function failedWriteDoesNotReviveOldPersistedPosition() {
    const h = fixture();
    h.mode('offline'); await h.api.syncVideoProgress(55, 760, 1440);
    h.failWrites(true);
    await h.api.syncVideoProgress(55, 120, 1440);
    assert.equal(h.api.pendingMutations(), 1);
    h.mode('online'); await h.api.flushMutations();
    assert.equal(h.server['/video/55'].time, 120, 'a failed durable write must not make an old stored value current again');
    assert.equal(h.api.pendingMutations(), 0);
    h.failWrites(false);
    await h.api.syncVideoProgress(99, 20, 1440);
    await h.api.flushMutations();
    assert.equal(h.server['/video/55'].time, 120, 'storage recovery must not replay a superseded entry');
}

async function deadlineAbortIsRetryable() {
    const h = fixture(); h.mode('timeout');
    const result = await h.api.syncVideoProgress(55, 760, 1440);
    assert.equal(result.queued, true, 'an internal timeout is retryable even if fetch reports AbortError');
    assert.equal(h.api.pendingMutations(), 1);
    h.mode('online'); await h.api.flushMutations();
    assert.equal(h.server['/video/55'].time, 760);
    assert.equal(h.api.pendingMutations(), 0);
}

(async function () {
    await nativeParsedStorageAndReload();
    await unavailableStorageDoesNotDisableNetwork();
    await failedWriteDoesNotReviveOldPersistedPosition();
    await deadlineAbortIsRetryable();
    console.log('API mutation storage: native parsed values, reload, volatile fallback, recovery and deadline passed');
}()).catch(error => { console.error(error); process.exitCode = 1; });

'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const account = {login: 'Alice', token: 'alice-token'};
const calls = [], writes = [];
const payload = {response: {id: 42, counts: {'0': 7, '1': 3, '2': 0, '3': 1, '4': 2, '5': 4}}};
let mode = 'online', pending;
const response = value => ({ok: true, status: 200, json: () => Promise.resolve(value)});
const context = {
    console, Promise, Date, Math, Number, String, Object, Array, JSON, URLSearchParams, AbortController,
    setTimeout, clearTimeout,
    fetch: (url, options) => {
        calls.push({url, options});
        if (mode === 'offline') return Promise.reject(new TypeError('offline'));
        if (mode === 'deferred') return new Promise((resolve, reject) => {
            pending = {resolve, reject};
            options.signal.addEventListener('abort', () => {
                const error = new Error('Aborted'); error.name = 'AbortError'; reject(error);
            }, {once: true});
        });
        return Promise.resolve(response(payload));
    },
    LampaYaniConfig: {apiBase: 'https://api.example.invalid', requestTimeout: 1000, requestRetries: 0, applicationToken: () => 'public-app'},
    LampaYaniAuth: {get: () => account, token: () => account.token, refreshIfNeeded: () => Promise.resolve()},
    LampaYaniI18n: {getLanguage: () => 'en'},
    Lampa: {Storage: {get: (key, fallback) => fallback, set: (key, value) => writes.push({key, value})}}
};
context.window = context;
vm.runInNewContext(fs.readFileSync('src/api.js', 'utf8'), context);
const api = context.LampaYaniApi;
const settle = async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve(); };

(async function () {
    const result = await api.userListCounts(42);
    assert.strictEqual(result, payload, 'the API must retain the profile counts envelope for the shared parser');
    assert.strictEqual(calls[0].url, 'https://api.example.invalid/users/id42?need_counts=true');
    assert.strictEqual(calls[0].options.method, 'GET', 'count loading is read-only');
    assert.strictEqual(calls[0].options.body, undefined);
    assert.strictEqual(calls[0].options.headers.Authorization, 'Bearer alice-token');
    assert.strictEqual(calls[0].options.headers['X-Application'], 'public-app');
    await api.userListCounts(42);
    assert.strictEqual(calls.length, 2, 'a later opening must request current counts');
    assert.strictEqual(writes.length, 0, 'personal counts are not written into the general API cache');

    await api.userListStats(42);
    assert.strictEqual(calls[2].url, 'https://api.example.invalid/users/42/stats/lists', 'watch-time statistics keep their separate endpoint');

    mode = 'deferred';
    const controller = new AbortController();
    const cancelled = api.userListCounts(42, {signal: controller.signal});
    await settle();
    controller.abort();
    await assert.rejects(cancelled, error => error.name === 'AbortError');
    assert.strictEqual(calls[3].options.signal.aborted, true, 'screen cancellation reaches the request');

    const stale = api.userListCounts(42);
    await settle();
    account.login = 'Bob'; account.token = 'bob-token';
    pending.resolve(response(payload));
    await assert.rejects(stale, error => error.name === 'AbortError', 'late counts from a previous account are rejected');

    mode = 'offline';
    await assert.rejects(api.userListCounts(77), /offline/);
    assert.strictEqual(api.pendingMutations(), 0, 'failed reads never enter the mutation queue');
    assert.strictEqual(writes.length, 0);
    console.log('API list counts: compact read-only route, account scope, cancellation and fresh reads passed');
}()).catch(error => { console.error(error); process.exitCode = 1; });

'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// Exercise the public API against controlled HTTP responses. No real account
// or network is used, and each scenario gets independent storage and locks.
function fixture() {
    const store = {}, calls = [], pending = [], server = {};
    const account = {login: 'Alice', token: 'alice-secret'};
    let mode = 'online';
    const response = status => ({ok: status >= 200 && status < 300, status,
        json: () => Promise.resolve({ok: true})});
    function commit(call) {
        if (call.method === 'POST' && call.path === '/video') {
            (call.body.videos || []).forEach(video => {
                server[call.auth + '|/video/' + video.video_id] = {time: video.time, date: video.date};
            });
        } else server[call.auth + '|' + call.path] = call.method === 'DELETE' ? null : call.body;
        return response(200);
    }
    const context = {
        console, Promise, Date, Math, Number, String, Object, Array, JSON,
        URLSearchParams, AbortController, setTimeout, clearTimeout,
        LampaYaniConfig: {apiBase: 'https://api.example.invalid', requestTimeout: 10000,
            requestRetries: 0, applicationToken: () => 'public'},
        LampaYaniAuth: {get: () => account, token: () => account.token,
            refreshIfNeeded: () => Promise.resolve()},
        LampaYaniI18n: {getLanguage: () => 'ru'},
        Lampa: {Storage: {
            get: (key, fallback) => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : fallback,
            set: (key, value) => { store[key] = value; },
            remove: key => { delete store[key]; }
        }},
        fetch: (url, options) => {
            const call = {path: url.replace('https://api.example.invalid', ''),
                auth: options.headers.Authorization, method: options.method,
                body: options.body ? JSON.parse(options.body) : null};
            calls.push(call);
            if (mode === 'offline') return Promise.reject(new TypeError('offline'));
            if (mode === 'abort') {
                const error = new Error('user cancelled'); error.name = 'AbortError';
                return Promise.reject(error);
            }
            if (mode === 'deferred') return new Promise((resolve, reject) => pending.push({
                call, reject, succeed: () => resolve(commit(call))
            }));
            if (typeof mode === 'number') return Promise.resolve(response(mode));
            return Promise.resolve(commit(call));
        }
    };
    context.window = context;
    vm.runInNewContext(fs.readFileSync('src/api.js', 'utf8'), context);
    return {api: context.LampaYaniApi, account, calls, pending, store,
        mode: value => { mode = value; },
        saved: path => server['Bearer ' + account.token + '|' + path],
        queued: () => JSON.parse(store.yani_pending_mutations_v1 || '[]')};
}
async function settle() { for (let index = 0; index < 40; index += 1) await Promise.resolve(); }

async function newerOnlineMutationWins() {
    const h = fixture();
    h.mode('offline');
    await h.api.syncVideoProgress(55, 760, 1440);
    h.mode('online');
    await h.api.syncVideoProgress(55, 900, 1440);
    await h.api.flushMutations();
    assert.equal(h.saved('/video/55').time, 900, 'an old offline write must not overwrite a newer successful position');
    assert.equal(h.api.pendingMutations(), 0);

    h.mode('offline');
    await h.api.addToList(42, 'watching');
    h.mode('online');
    await h.api.removeFromList(42);
    await h.api.flushMutations();
    assert.equal(h.saved('/anime/42/list'), null, 'an old queued category must not undo a newer removal');
}

async function inFlightFlushIsOrdered() {
    const h = fixture();
    h.mode('offline');
    await h.api.syncVideoProgress(55, 760, 1440);
    h.calls.length = 0;
    h.mode('deferred');
    const flush = h.api.flushMutations();
    await settle();
    assert.equal(h.pending.length, 1);
    const latest = h.api.syncVideoProgress(55, 120, 1440);
    await settle();
    assert.equal(h.calls.length, 1, 'a newer mutation must wait for an older same-key flush already in flight');
    h.mode('online');
    h.pending[0].succeed();
    await Promise.all([flush, latest]);
    await h.api.flushMutations();
    assert.equal(h.saved('/video/55').time, 120, 'latest intent wins even when it moves playback backwards');
    assert.equal(h.api.pendingMutations(), 0);
}

async function temporaryFirstFailureIsQueued() {
    for (const status of [408, 425, 429, 500, 503]) {
        const h = fixture(); h.mode(status);
        const result = await h.api.syncVideoProgress(55, 900, 1440);
        assert.equal(result.queued, true, 'first HTTP ' + status + ' must keep the write for retry');
        assert.equal(h.api.pendingMutations(), 1);
        h.mode('online'); await h.api.flushMutations();
        assert.equal(h.saved('/video/55').time, 900);
        assert.equal(h.api.pendingMutations(), 0);
    }
    for (const status of [400, 401, 403]) {
        const h = fixture(); h.mode(status);
        await assert.rejects(h.api.syncVideoProgress(55, 900, 1440), error => error.status === status);
        assert.equal(h.api.pendingMutations(), 0, 'permanent HTTP ' + status + ' must not be queued');
    }
    const h = fixture(); h.mode('abort');
    await assert.rejects(h.api.syncVideoProgress(55, 900, 1440), error => error.name === 'AbortError');
    assert.equal(h.api.pendingMutations(), 0, 'explicit cancellation must not create a deferred write');
}

async function olderFailureCannotReplaceNewIntent() {
    const h = fixture(); h.mode('deferred');
    const old = h.api.syncVideoProgress(55, 760, 1440);
    await settle();
    const latest = h.api.syncVideoProgress(55, 120, 1440);
    await settle();
    assert.equal(h.calls.length, 1, 'same-key direct mutations must also be ordered');
    h.mode('offline');
    h.pending[0].reject(new TypeError('old request lost its connection'));
    await Promise.all([old, latest]);
    const entries = h.queued().filter(entry => entry.path === '/video/55');
    assert.equal(entries.length, 1, 'only the latest pending state is retained');
    assert.equal(JSON.parse(entries[0].body).time, 120, 'a delayed older failure cannot replace the newer failed write');
    h.mode('online'); await h.api.flushMutations();
    assert.equal(h.saved('/video/55').time, 120);
}

async function onlineBurstDoesNotLoseWrites() {
    const h = fixture();
    await Promise.all(Array.from({length: 110}, (_, index) => h.api.syncVideoProgress(1000 + index, 10 + index, 1440)));
    for (let index = 0; index < 110; index += 1) {
        assert.equal(h.saved('/video/' + (1000 + index)).time, 10 + index,
            'the durable queue bound must not suppress live online intent ' + index);
    }
    assert.equal(h.calls.length, 110, 'all unique online writes must reach the server');
    assert.equal(h.api.pendingMutations(), 0);
}

async function batchAndIndividualWritesStayOrdered() {
    const date = 1720000000;
    {
        const h = fixture(); h.mode('offline');
        await h.api.syncVideoWatches([{video_id: 55, time: 760, date}, {video_id: 66, time: 400, date}]);
        h.mode('online');
        await h.api.syncVideoProgress(55, 120, 1440);
        await h.api.flushMutations();
        assert.equal(h.saved('/video/55').time, 120, 'an old batch must not undo a newer individual position');
        assert.equal(h.saved('/video/66').time, 400, 'superseding one batch row must preserve unrelated rows');
        assert.equal(h.api.pendingMutations(), 0);
    }
    {
        const h = fixture(); h.mode('offline');
        await h.api.syncVideoProgress(55, 760, 1440);
        h.mode('online');
        await h.api.syncVideoWatches([{video_id: 55, time: 120, date}]);
        await h.api.flushMutations();
        assert.equal(h.saved('/video/55').time, 120, 'an old individual write must not undo a newer batch position');
        assert.equal(h.api.pendingMutations(), 0);
    }
    {
        const h = fixture(); h.mode('offline');
        await h.api.syncVideoWatches([{video_id: 55, time: 760, date}, {video_id: 66, time: 400, date}]);
        h.calls.length = 0; h.mode('deferred');
        const flush = h.api.flushMutations();
        await settle();
        assert.equal(h.pending.length, 1);
        const latest = h.api.syncVideoProgress(55, 120, 1440);
        await settle();
        assert.equal(h.calls.length, 1, 'an individual write must wait for an overlapping in-flight batch');
        h.mode('online'); h.pending[0].succeed();
        await Promise.all([flush, latest]);
        await h.api.flushMutations();
        assert.equal(h.saved('/video/55').time, 120);
        assert.equal(h.saved('/video/66').time, 400);
        assert.equal(h.api.pendingMutations(), 0);
    }
    {
        const h = fixture(); h.mode('offline');
        await h.api.syncVideoWatches([{video_id: 55, time: 760, date}, {video_id: 66, time: 400, date}]);
        await h.api.syncVideoWatches([{video_id: 55, time: 120, date: date + 1}, {video_id: 77, time: 80, date: date + 1}]);
        h.mode('online'); await h.api.flushMutations();
        assert.equal(h.saved('/video/55').time, 120, 'overlapping batches must preserve the latest value per video');
        assert.equal(h.saved('/video/66').time, 400, 'a newer batch must retain the earlier unrelated row');
        assert.equal(h.saved('/video/77').time, 80);
        assert.equal(h.api.pendingMutations(), 0);
    }
}

async function accountQueuesStayIsolated() {
    const h = fixture(); h.mode('offline');
    await h.api.syncVideoProgress(55, 760, 1440);
    h.account.login = 'Bob'; h.account.token = 'bob-secret';
    await h.api.syncVideoProgress(55, 100, 1440);
    h.mode('online');
    await h.api.syncVideoProgress(55, 200, 1440);
    await h.api.flushMutations();
    assert.equal(h.saved('/video/55').time, 200);
    assert.equal(h.api.pendingMutations(), 1, 'Bob must not consume or replace Alice pending write');
    const bobCalls = h.calls.filter(call => call.auth === 'Bearer bob-secret');
    assert.ok(bobCalls.length > 0);
    h.account.login = 'Alice'; h.account.token = 'alice-secret';
    await h.api.flushMutations();
    assert.equal(h.saved('/video/55').time, 760);
    assert.equal(h.api.pendingMutations(), 0);
    assert.doesNotMatch(h.store.yani_pending_mutations_v1 || '', /alice-secret|bob-secret/);
}

(async function () {
    await newerOnlineMutationWins();
    await inFlightFlushIsOrdered();
    await temporaryFirstFailureIsQueued();
    await olderFailureCannotReplaceNewIntent();
    await accountQueuesStayIsolated();
    await onlineBurstDoesNotLoseWrites();
    await batchAndIndividualWritesStayOrdered();
    console.log('API mutation order runtime tests passed');
}()).catch(error => { console.error(error); process.exitCode = 1; });

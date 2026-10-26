'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const store = {}, account = {login: 'Alice', token: 'secret-a'};
const calls = [], pending = [];
let mode = 'offline';
const context = {
    window: {}, console, Promise, Date, Math, Number, String, Object, Array, JSON, URLSearchParams, AbortController,
    setTimeout, clearTimeout,
    fetch: (url, options) => {
        calls.push({url, auth: options.headers.Authorization, body: options.body});
        if (mode === 'offline') return Promise.reject(new TypeError('offline'));
        if (mode === 'deferred') return new Promise((resolve, reject) => pending.push({resolve, reject}));
        return Promise.resolve({ok: true, status: 200, json: () => Promise.resolve({response: 'ok'})});
    },
    LampaYaniConfig: {apiBase: 'https://api.example.invalid', requestTimeout: 1000, requestRetries: 0, applicationToken: () => 'public'},
    LampaYaniAuth: {get: () => account, token: () => account.token, refreshIfNeeded: () => Promise.resolve()},
    LampaYaniI18n: {getLanguage: () => 'ru'},
    Lampa: {Storage: {get: (key, fallback) => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : fallback, set: (key, value) => {store[key] = value;}, remove: key => {delete store[key];}}}
};
context.window = context;
vm.runInNewContext(fs.readFileSync('src/api.js','utf8'),context);
const api = context.LampaYaniApi;
const settle = async () => {for(let i=0;i<8;i++) await Promise.resolve();};
const response = value => ({ok:true,status:200,json:()=>Promise.resolve({response:value})});

(async function () {
    await api.syncVideoProgress(55,99,100);
    account.login='Bob'; account.token='secret-b';
    await api.syncVideoProgress(55,20,100);
    assert.equal(api.pendingMutations(),2,'two accounts cannot overwrite one queued episode progress');
    assert.doesNotMatch(store.yani_pending_mutations_v1,/secret-a|secret-b/,'the persisted queue must not contain credentials');
    mode='online';calls.length=0;
    const bob=await api.flushMutations();
    assert.equal(bob.pending,1);
    assert.equal(calls.length,1);assert.equal(calls[0].auth,'Bearer secret-b');
    assert.equal(JSON.parse(calls[0].body).time,20,'only Bob progress is uploaded in Bob session');
    account.login='Alice';account.token='secret-a';calls.length=0;
    await api.flushMutations();assert.equal(api.pendingMutations(),0);
    assert.equal(calls.length,1);assert.equal(calls[0].auth,'Bearer secret-a');
    assert.equal(JSON.parse(calls[0].body).time,99);

    mode='deferred';
    const old=api.videos(42).then(()=>({wrong:true}),error=>error);
    await settle();assert.equal(pending.length,1);
    account.login='Bob';account.token='secret-b';
    const fresh=api.videos(42);await settle();
    assert.equal(pending.length,2,'authenticated GET deduplication is account-specific');
    pending[1].resolve(response('Bob'));assert.equal((await fresh).response,'Bob');
    pending[0].resolve(response('Alice'));assert.equal((await old).name,'AbortError','old account payload is rejected');

    const failed=api.syncVideoProgress(77,90,100).then(()=>({wrong:true}),error=>error);
    await settle();
    account.login='Alice';account.token='secret-a';
    pending[2].reject(new TypeError('offline'));assert.equal((await failed).name,'AbortError');
    assert.equal(api.pendingMutations(),0,'a late network failure cannot be queued for the next account');

    // An older plugin did not record owners. Those entries cannot safely be
    // attributed to whichever account happens to reconnect first.
    store.yani_pending_mutations_v1=JSON.stringify([{id:'old',key:'progress:9',path:'/video/9',method:'PUT',body:'{}'}]);
    mode='online';calls.length=0;
    const legacy=await api.flushMutations();assert.equal(legacy.skipped,true);assert.equal(calls.length,0);
    assert.doesNotMatch(JSON.stringify(store),/secret-a|secret-b/);
    console.log('API progress ownership: isolated queues, GETs and stale account responses passed');
}()).catch(error=>{console.error(error);process.exitCode=1;});

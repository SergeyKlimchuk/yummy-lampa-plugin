const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('src/ui-video-data.js', 'utf8');
const api = fs.readFileSync('src/api.js', 'utf8');
const ui = fs.readFileSync('src/ui.js', 'utf8');
const detail = fs.readFileSync('src/ui-detail.js', 'utf8');
const menu = fs.readFileSync('src/ui-playback-menu.js', 'utf8');
const renderers = fs.readFileSync('src/ui-card-renderers.js', 'utf8');
const build = fs.readFileSync('build.js', 'utf8');
const config = fs.readFileSync('src/config.js', 'utf8');

assert.match(build, /src\/ui-video-data\.js/);
assert.match(config, /videosCacheTtl: 120000/);
assert.match(config, /videosCacheEntries: 20/);
assert.doesNotMatch(api, /videosMemory/);
assert.match(ui, /LampaYaniVideoData\.create/);
assert.match(ui, /loadVideos: function \(id, options\) \{ return videoData\.payload\(id, options\); \}/);
assert.match(ui, /loadVideos: function \(id, options\) \{ return videoData\.list\(id, options\); \}/);
assert.match(detail, /function loadDetailVideos\(\)/);
assert.match(detail, /videosAbort\.abort\(\)/);
assert.match(menu, /loadVideosForPlayback\(card\.yani_id\)/);
assert.match(renderers, /loadVideos\(card\.yani_id\)/);

function abortError() {
    const error = new Error('Aborted');
    error.name = 'AbortError';
    return error;
}

function createManager(options, auth) {
    const context = {
        window: {LampaYaniConfig: {videosCacheTtl: 120000, videosCacheEntries: 20}},
        AbortController: AbortController,
        Promise: Promise,
        Error: Error
    };
    if (auth) context.window.LampaYaniAuth = auth;
    vm.runInNewContext(source, context);
    return context.window.LampaYaniVideoData.create(options);
}

function deferredFetch() {
    const calls = [];
    const fetch = function (id, options) {
        const item = {id: id, options: options};
        item.promise = new Promise(function (resolve, reject) {
            item.resolve = resolve;
            item.reject = reject;
            if (options && options.signal) {
                if (options.signal.aborted) {
                    reject(abortError());
                    return;
                }
                options.signal.addEventListener('abort', function () { reject(abortError()); });
            }
        });
        calls.push(item);
        return item.promise;
    };
    return {fetch: fetch, calls: calls};
}

(async function () {
    const clock = {now: 1000};
    const pending = deferredFetch();
    const manager = createManager({
        fetch: pending.fetch,
        ttl: 1000,
        maxEntries: 2,
        now: function () { return clock.now; }
    });

    const first = manager.list(42);
    const second = manager.payload(42);
    assert.strictEqual(pending.calls.length, 1, 'one in-flight /videos request must be shared');
    pending.calls[0].resolve({response: [{number: 10}, {number: 13}]});
    assert.deepStrictEqual(JSON.parse(JSON.stringify(await first)), [{number: 10}, {number: 13}]);
    assert.deepStrictEqual(JSON.parse(JSON.stringify((await second).response)), [{number: 10}, {number: 13}]);

    clock.now = 1500;
    await manager.list(42);
    assert.strictEqual(pending.calls.length, 1, 'TTL cache must reuse the completed payload');

    clock.now = 2500;
    const refreshed = manager.list(42);
    assert.strictEqual(pending.calls.length, 2, 'expired TTL must refetch');
    pending.calls[1].resolve({response: [{number: 1}]});
    assert.deepStrictEqual(JSON.parse(JSON.stringify(await refreshed)), [{number: 1}]);

    pending.calls[1].resolve = pending.calls[1].resolve;
    const third = manager.payload(7);
    const fourth = manager.payload(8);
    pending.calls[2].resolve({response: [{id: 7}]});
    pending.calls[3].resolve({response: [{id: 8}]});
    await third;
    await fourth;
    clock.now = 2600;
    const evicted = manager.payload(42);
    assert.ok(pending.calls.length >= 5, 'cache size limit must drop the oldest title');
    pending.calls[pending.calls.length - 1].resolve({response: [{number: 42}]});
    await evicted;

    const aborting = deferredFetch();
    const abortManager = createManager({fetch: aborting.fetch, ttl: 5000, maxEntries: 8, now: function () { return 1; }});
    const controller = new AbortController();
    const kept = abortManager.list(9);
    const cancelled = abortManager.list(9, {signal: controller.signal});
    assert.strictEqual(aborting.calls.length, 1);
    controller.abort();
    await assert.rejects(cancelled, function (error) { return error.name === 'AbortError'; });
    aborting.calls[0].resolve({response: [{number: 9}]});
    assert.deepStrictEqual(JSON.parse(JSON.stringify(await kept)), [{number: 9}], 'aborting one waiter must not cancel remaining consumers');

    const last = deferredFetch();
    const lastManager = createManager({fetch: last.fetch, ttl: 5000, maxEntries: 8, now: function () { return 1; }});
    const lastController = new AbortController();
    const only = lastManager.list(11, {signal: lastController.signal});
    lastController.abort();
    await assert.rejects(only, function (error) { return error.name === 'AbortError'; });
    await Promise.resolve();
    assert.strictEqual(last.calls[0].options.signal.aborted, true, 'closing the last waiter must abort the network request');

    const freshFetch = deferredFetch();
    const freshManager = createManager({fetch: freshFetch.fetch});
    const original = freshManager.payload(51);
    freshFetch.calls[0].resolve({response: [{video_id: 5101, watched: {end_time: 0}}]});
    await original;
    const cachedRead = freshManager.payload(51);
    const freshRead = freshManager.payload(51, {fresh: true});
    const sharedFreshRead = freshManager.list(51, {fresh: true});
    assert.strictEqual(freshFetch.calls.length, 2, 'fresh must bypass the completed TTL and coalesce a matching in-flight refresh');
    assert.strictEqual((await cachedRead).response[0].watched.end_time, 0, 'an already requested same-owner cached read may finish while a fresh request starts');
    freshFetch.calls[1].resolve({response: [{video_id: 5101, watched: {end_time: 1200}}]});
    assert.strictEqual((await freshRead).response[0].watched.end_time, 1200);
    assert.strictEqual((await sharedFreshRead)[0].watched.end_time, 1200);
    assert.strictEqual((await freshManager.payload(51)).response[0].watched.end_time, 1200, 'fresh payload becomes the shared cached value');

    // Ignore abort on purpose: late responses from older webviews must not
    // repopulate the previous owner's cache or delete the next owner's request.
    const accountCalls = [];
    let owner = {id: 'alpha', login: 'first', token: 'first-token'};
    const accountManager = createManager({
        owner: () => owner,
        fetch: (id, options) => new Promise((resolve, reject) => accountCalls.push({id, options, resolve, reject}))
    });
    const oldPending = accountManager.payload(61);
    const oldRejected = assert.rejects(oldPending, error => error.name === 'AbortError');
    owner = {id: 'beta', login: 'second', token: 'second-token'};
    const nextPending = accountManager.payload(61);
    assert.strictEqual(accountCalls.length, 2, 'an account transition starts a separate same-title request');
    assert.strictEqual(accountCalls[0].options.signal.aborted, true, 'the old account network request is aborted');
    await oldRejected;
    accountCalls[0].resolve({response: [{video_id: 6101, watched: {end_time: 600}}]});
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    const coalescedNew = accountManager.payload(61, {fresh: true});
    assert.strictEqual(accountCalls.length, 2, 'a late old response cannot remove the new owner request');
    accountCalls[1].resolve({response: [{video_id: 6101, watched: {end_time: 0}}]});
    assert.strictEqual((await nextPending).response[0].watched.end_time, 0);
    assert.strictEqual((await coalescedNew).response[0].watched.end_time, 0);
    owner = {id: 'beta', login: 'second', token: 'refreshed-token'};
    await accountManager.payload(61);
    assert.strictEqual(accountCalls.length, 2, 'refreshing the token for the same account does not discard its completed cache');
    owner = {id: 'gamma', login: 'third', token: 'third-token'};
    const thirdOwner = accountManager.payload(61);
    assert.strictEqual(accountCalls.length, 3, 'completed payloads are not reused by another account');
    accountCalls[2].resolve({response: [{video_id: 6101, watched: {end_time: 40}}]});
    assert.strictEqual((await thirdOwner).response[0].watched.end_time, 40);

    const transitionCalls = [];
    let transitionOwner = 'one';
    const transitionManager = createManager({
        owner: () => transitionOwner,
        fetch: (id, options) => new Promise(resolve => transitionCalls.push({id, options, resolve}))
    });
    const transitionPending = transitionManager.payload(71);
    const transitionRejected = assert.rejects(transitionPending, error => error.name === 'AbortError');
    transitionOwner = 'two';
    transitionCalls[0].resolve({response: [{video_id: 7101}]});
    await transitionRejected;
    const transitionNext = transitionManager.payload(71);
    assert.strictEqual(transitionCalls.length, 2, 'a late response detects owner changes even without another intervening caller');
    transitionCalls[1].resolve({response: [{video_id: 7201}]});
    assert.strictEqual((await transitionNext).response[0].video_id, 7201);

    const cacheOwnerRead = transitionManager.payload(71);
    const cacheOwnerRejected = assert.rejects(cacheOwnerRead, error => error.name === 'AbortError');
    transitionOwner = 'three';
    await cacheOwnerRejected;

    const invalidated = deferredFetch();
    const invalidateManager = createManager({fetch: invalidated.fetch});
    const sharedPending = invalidateManager.payload(81);
    invalidateManager.invalidate();
    const sharedAgain = invalidateManager.payload(81, {fresh: true});
    assert.strictEqual(invalidated.calls.length, 1, 'ordinary invalidation must not abort other active consumers');
    invalidated.calls[0].resolve({response: [{video_id: 8101}]});
    await sharedPending; await sharedAgain;
    invalidateManager.invalidate(81);
    const invalidatedRead = invalidateManager.payload(81);
    assert.strictEqual(invalidated.calls.length, 2, 'ordinary invalidation still removes completed entries');
    invalidated.calls[1].resolve({response: [{video_id: 8102}]});
    await invalidatedRead;

    const defaultOwnerFetch = deferredFetch();
    let account = {user_id: 901, login: 'same-account', token: 'initial'};
    const defaultOwnerManager = createManager({fetch: defaultOwnerFetch.fetch}, {get: () => account, token: () => account.token || ''});
    const signedIn = defaultOwnerManager.payload(91);
    defaultOwnerFetch.calls[0].resolve({response: [{video_id: 9101, watched: {end_time: 999}}]});
    await signedIn;
    account = {user_id: 901, login: 'same-account', token: 'renewed'};
    await defaultOwnerManager.payload(91);
    assert.strictEqual(defaultOwnerFetch.calls.length, 1, 'default auth ownership treats token rotation as the same signed-in account');
    account = {};
    const signedOut = defaultOwnerManager.payload(91);
    assert.strictEqual(defaultOwnerFetch.calls.length, 2, 'default auth ownership drops private watched data on logout');
    defaultOwnerFetch.calls[1].resolve({response: [{video_id: 9101}]});
    assert.strictEqual((await signedOut).response[0].watched, undefined);

    console.log('video data manager contract tests passed');
})().catch(function (error) {
    console.error(error);
    process.exit(1);
});

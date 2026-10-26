'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const helperRoot = process.env.YANI_REPO_ROOT || path.resolve(__dirname, '..');
const {tvEnvironment, $, deferred, settle} = require(path.join(helperRoot, 'tests/helpers/tv-dom'));
const sourceRoot = process.env.YANI_SOURCE_ROOT || path.resolve(__dirname, '../src');
function setup(account) {
    const env = tvEnvironment(), listeners = {}, requests = [];
    let current = account || {}, clock = 1000;
    env.document.addEventListener = (key, fn) => { (listeners[key] || (listeners[key] = [])).push(fn); };
    env.document.removeEventListener = (key, fn) => { listeners[key] = (listeners[key] || []).filter(value => value !== fn); };
    const auth = {get: () => current, token: () => current.token || ''};
    const api = {profile: () => { const task = deferred(); requests.push(task); return task.promise; }};
    env.context.Date = env.context.window.Date = {now: () => clock};
    env.context.window.LampaYaniAuth = auth; env.context.window.LampaYaniApi = api;
    env.context.Lampa.Storage.set = () => { throw new Error('Identity never persists profile data or credentials'); };
    vm.runInNewContext(fs.readFileSync(path.join(sourceRoot, 'ui-account-identity.js'), 'utf8'), env.context);
    const identity = env.context.window.LampaYaniAccountIdentity;
    function bind() {
        const root = $('<div class="selector account"><span class="nav-icon"></span><span class="nav-label"></span></div>');
        $(env.document.body).append(root);
        const handle = identity.bind(root, {auth, api, t: key => key === 'account' ? 'Аккаунт' : key, iconSelector: '.nav-icon', labelSelector: '.nav-label'});
        return {root, handle, label: () => root.find('.nav-label').text(), avatar: () => root.find('.yani-account-nav__avatar')};
    }
    return {identity, bind, requests, listeners, env, account: value => { current = value; }, clock: value => { clock = value; }, changed: () => { (listeners['yani:auth-changed'] || []).slice().forEach(fn => fn()); }};
}
(async () => {
    let h = setup(), guest = h.bind(); await settle();
    assert.equal(guest.label(), 'Аккаунт'); assert.equal(guest.root.find('svg').length, 1, 'guest has a silhouette, not a text glyph');
    assert.equal(h.requests.length, 0, 'guest navigation never fetches a private profile');
    assert.ok(h.identity.icon('settings').includes('<circle')); assert.ok(h.identity.icon('settings').includes('stroke='));
    assert.equal(h.identity.avatarUrl('javascript:bad'), ''); assert.equal(h.identity.avatarUrl('data:image/svg+xml,bad'), '');
    guest.handle.destroy(); assert.equal(h.listeners['yani:auth-changed'].length, 0);

    h = setup({user_id: 42, token: 'a', login: 'alice'}); const a = h.bind(), b = h.bind();
    await settle(); assert.equal(h.requests.length, 1, 'Home and another rail share one in-flight profile lookup');
    assert.equal(a.label(), 'alice');
    h.requests[0].resolve({response: {id: 42, nickname: 'Алиса', avatars: {small: '//images.example/alice.png', big: 'https://images.example/large.png'}}}); await settle();
    assert.equal(a.label(), 'Алиса'); assert.equal(b.label(), 'Алиса');
    assert.equal(a.avatar().attr('src'), 'https://images.example/alice.png', 'small remote avatar is preferred for the tiny fixed slot');
    const origin = a.root[0]; a.handle.refresh(); assert.strictEqual(a.root[0], origin, 'identity changes preserve the remote focus element');
    a.avatar().trigger('error');
    assert.equal(a.avatar().length, 0); assert.equal(a.root.find('svg').length, 1, 'broken avatars fall back to the silhouette');
    assert.equal(a.label(), 'Алиса', 'avatar failure does not remove the nickname');
    a.handle.refresh(); assert.equal(a.avatar().length, 0, 'a broken avatar is not retried on every focus return');
    a.handle.destroy(); b.handle.destroy(); assert.equal(h.listeners['yani:auth-changed'].length, 0);
    const cached = h.bind(); await settle(); assert.equal(cached.label(), 'Алиса'); assert.equal(h.requests.length, 1, 'fresh cached identity does not refetch per screen');
    h.account({}); h.changed(); await settle(); assert.equal(cached.label(), 'Аккаунт'); assert.equal(cached.avatar().length, 0, 'logout clears avatar and nickname immediately'); cached.handle.destroy();

    h = setup({user_id: 42, token: 'a', login: 'alice'}); const race = h.bind(); await settle();
    h.account({user_id: 77, token: 'b', login: 'bob'}); h.changed(); await settle();
    assert.equal(h.requests.length, 2); assert.equal(race.label(), 'bob');
    h.requests[0].resolve({response: {id: 42, nickname: 'Wrong account', avatars: {small: 'https://images.example/private.png'}}}); await settle();
    assert.equal(race.label(), 'bob'); assert.equal(race.avatar().length, 0, 'late old-account responses cannot paint another account');
    h.requests[1].resolve({response: {id: 77, nickname: '<Bob>', avatars: {small: 'javascript:bad'}}}); await settle();
    assert.equal(race.label(), '<Bob>', 'nickname is text rather than HTML'); assert.equal(race.root.find('svg').length, 1);
    race.handle.destroy();

    h = setup({user_id: 42, token: 'a', login: 'alice'}); const retired = h.bind(); await settle(); retired.handle.destroy();
    h.requests[0].resolve({response: {id: 42, nickname: 'Late', avatars: {small: 'https://images.example/alice.png'}}}); await settle();
    assert.equal(retired.label(), 'alice', 'a destroyed binding never receives async DOM updates');
    const renewed = h.bind(); assert.equal(renewed.label(), 'Late', 'finished identity may be reused by the next screen'); renewed.handle.destroy();
    h = setup({token: 'unknown-a'}); const unknown = h.bind(); await settle();
    h.requests[0].resolve({response: {id: 42, nickname: 'Unknown Alice'}}); await settle(); assert.equal(unknown.label(), 'Unknown Alice', 'a valid profile still supplies a nickname before an auth ID is hydrated');
    h.account({token: 'unknown-b'}); const anotherUnknown = h.bind(); await settle();
    assert.equal(anotherUnknown.label(), 'Аккаунт', 'an unkeyed cache is never shared into a later unknown session'); assert.equal(h.requests.length, 2);
    h.requests[1].resolve({response: {id: 77, nickname: 'Unknown Bob'}}); await settle(); assert.equal(unknown.label(), 'Unknown Bob');
    unknown.handle.destroy(); anotherUnknown.handle.destroy();

    h = setup({user_id: 42, token: 'a', login: 'alice'}); const offline = h.bind(); await settle();
    h.requests[0].reject(new Error('Offline')); await settle(); assert.equal(offline.label(), 'alice'); assert.equal(offline.root.find('svg').length, 1);
    const nextOffline = h.bind(); await settle(); assert.equal(h.requests.length, 1, 'failed profiles have a short retry backoff rather than a request per screen');
    h.clock(40000); nextOffline.handle.refresh(); await settle(); assert.equal(h.requests.length, 2, 'profile loading can recover after the backoff');
    offline.handle.destroy(); nextOffline.handle.destroy();

    console.log('Account identity: shared requests/cache, silhouette/avatar fallback, account ownership and teardown passed');
})().catch(error => { console.error(error); process.exitCode = 1; });

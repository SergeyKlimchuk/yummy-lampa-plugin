'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');

function Node(tag) { this.tag = tag || 'div'; this.attrs = {}; this.classes = []; this.nodes = []; this.parentNode = null; this.textValue = ''; this.events = []; this.values = {}; this.styles = {}; }
function text(node) { return node.textValue + node.nodes.map(text).join(''); }
function matches(node, selector) {
    if (!selector) return true;
    if (selector.indexOf(',') >= 0) return selector.split(',').some(s => matches(node, s.trim()));
    const attr = selector.match(/^\[([^=]+)="([^"]*)"\]$/);
    if (attr) return node.attrs[attr[1]] === attr[2];
    if (selector[0] === '.') return selector.slice(1).split('.').every(c => node.classes.includes(c));
    return node.tag === selector;
}
function descendants(node, selector, result) { node.nodes.forEach(child => { if (matches(child, selector)) result.push(child); descendants(child, selector, result); }); return result; }
function parse(value) {
    const holder = new Node('fragment'), stack = [holder];
    for (const part of value.matchAll(/<\/?[^>]+>|[^<]+/g)) {
        const token = part[0];
        if (token.startsWith('</')) { if (stack.length > 1) stack.pop(); continue; }
        if (!token.startsWith('<')) { stack[stack.length - 1].textValue += token; continue; }
        const match = token.match(/^<([\w-]+)/); if (!match) continue;
        const node = new Node(match[1]);
        for (const attr of token.matchAll(/([\w-]+)="([^"]*)"/g)) node.attrs[attr[1]] = attr[2];
        node.classes = (node.attrs.class || '').split(/\s+/).filter(Boolean);
        node.parentNode = stack[stack.length - 1]; node.parentNode.nodes.push(node);
        if (!['img', 'input', 'br', 'path'].includes(node.tag)) stack.push(node);
    }
    holder.nodes.forEach(n => { n.parentNode = null; }); return holder.nodes;
}
let currentDocument, liveAppends = 0;
function Wrapper(nodes) { this.nodes = nodes || []; this.length = this.nodes.length; this.jquery = true; this.nodes.forEach((node, index) => { this[index] = node; }); }
function $(value) { return value instanceof Wrapper ? value : new Wrapper(value instanceof Node ? [value] : Array.isArray(value) ? value : typeof value === 'string' && value[0] === '<' ? parse(value) : []); }
function detach(node) { if (node.parentNode) { const index = node.parentNode.nodes.indexOf(node); if (index >= 0) node.parentNode.nodes.splice(index, 1); node.parentNode = null; } }
Wrapper.prototype.append = function (...values) { this.nodes.forEach(parent => { if (currentDocument && currentDocument.documentElement.contains(parent)) liveAppends++; values.forEach(value => $(value).nodes.slice().forEach(node => { const added = node.tag === 'fragment' ? node.nodes.slice() : [node]; added.forEach(child => { detach(child); child.parentNode = parent; parent.nodes.push(child); }); })); }); return this; };
Wrapper.prototype.prepend = function (value) { this.nodes.forEach(parent => $(value).nodes.slice().reverse().forEach(node => { detach(node); node.parentNode = parent; parent.nodes.unshift(node); })); return this; };
Wrapper.prototype.empty = function () { this.nodes.forEach(node => { node.nodes.forEach(child => { child.parentNode = null; }); node.nodes = []; node.textValue = ''; }); return this; };
Wrapper.prototype.text = function (value) { if (value === undefined) return this.nodes.map(text).join(''); this.empty(); this.nodes.forEach(node => { node.textValue = String(value); }); return this; };
Wrapper.prototype.html = function (value) { return this.empty().append(value); };
Wrapper.prototype.attr = function (key, value) { if (value === undefined) return this[0] && this[0].attrs[key]; this.nodes.forEach(node => { node.attrs[key] = String(value); }); return this; };
Wrapper.prototype.removeAttr = function (key) { this.nodes.forEach(node => { delete node.attrs[key]; }); return this; };
Wrapper.prototype.data = function (key, value) { if (value === undefined) return this[0] && this[0].values[key]; this.nodes.forEach(node => { node.values[key] = value; }); return this; };
Wrapper.prototype.addClass = function (value) { this.nodes.forEach(node => value.split(/\s+/).forEach(c => { if (!node.classes.includes(c)) node.classes.push(c); })); return this; };
Wrapper.prototype.removeClass = function (value) { this.nodes.forEach(node => { node.classes = node.classes.filter(c => !value.split(/\s+/).includes(c)); }); return this; };
Wrapper.prototype.toggleClass = function (value, enabled) { return enabled ? this.addClass(value) : this.removeClass(value); };
Wrapper.prototype.css = function (name, value) { this.nodes.forEach(node => { node.styles[name] = value; }); return this; };
Wrapper.prototype.find = function (selector) { const found = []; this.nodes.forEach(node => descendants(node, selector, found)); return new Wrapper(found); };
Wrapper.prototype.children = function (selector) { return new Wrapper(this.nodes.flatMap(node => node.nodes.filter(child => matches(child, selector)))); };
Wrapper.prototype.first = function () { return new Wrapper(this.nodes.slice(0, 1)); };
Wrapper.prototype.parent = function () { return new Wrapper(this.nodes.map(node => node.parentNode).filter(Boolean)); };
Wrapper.prototype.prev = function (selector) { const node = this[0], parent = node && node.parentNode; return new Wrapper(parent ? parent.nodes.slice(0, parent.nodes.indexOf(node)).reverse().filter(sibling => matches(sibling, selector)).slice(0, 1) : []); };
Wrapper.prototype.each = function (callback) { this.nodes.forEach((node, index) => callback.call(node, index, node)); return this; };
Wrapper.prototype.remove = function () { this.nodes.forEach(detach); return this; };
Wrapper.prototype.on = function (names, callback) { this.nodes.forEach(node => names.split(/\s+/).forEach(name => node.events.push({name: name.split('.')[0], callback}))); return this; };
Wrapper.prototype.trigger = function (name) { this.nodes.forEach(node => node.events.filter(event => event.name === name).forEach(event => event.callback.call(node, {currentTarget: node, target: node}))); return this; };
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return {promise, resolve, reject}; }
async function settle() { for (let index = 0; index < 12; index++) await Promise.resolve(); }
function environment() {
    const documentElement = new Node('document');
    documentElement.contains = function (node) { for (let current = node; current; current = current.parentNode) if (current === documentElement) return true; return false; };
    const document = {documentElement, createDocumentFragment: () => new Node('fragment')}; currentDocument = document;
    const timers = [], calls = [], auth = {token: 'token-42', user_id: 42, login: 'example'};
    const Lampa = {
        Scroll: function (options) { calls.push(['scroll', options]); const element = $('<div class="scroll"></div>'); this.minus = () => {}; this.update = () => {}; this.append = value => element.append(value); this.render = js => js ? element[0] : element; this.destroy = () => element.remove(); },
        Controller: {add: () => {}, toggle: () => {}, collectionSet: () => calls.push(['collection']), collectionFocus: () => calls.push(['focus'])},
        Noty: {show: value => calls.push(['notice', value])}, Loading: {start: () => {}, stop: () => {}}
    };
    const context = {window: {AbortController}, document, $, Lampa, Promise, Date, Math, Number, String, Array, Object, console,
        setTimeout: fn => { const timer = {fn, live: true}; timers.push(timer); return timer; }, clearTimeout: timer => { timer.live = false; },
        Navigator: {canmove: () => true, move: () => {}},
        LampaYaniAuth: {token: () => auth.token, get: () => auth},
        LampaYaniNavigation: {moveDown: () => {}, bindFocus: () => {}},
        LampaYaniSectionState: {fromCache: () => false, create: () => ({root: $('<div class="selector"></div>'), show: () => {}})}
    };
    const activity = {loader: value => calls.push(['loader', value]), toggle: () => calls.push(['toggle'])};
    function mount(component) { component.activity = activity; component.create(); $(documentElement).append(component.render()); return component; }
    return {context, document, auth, calls, mount, timers, flush: () => { timers.splice(0).forEach(timer => { if (timer.live) timer.fn(); }); }};
}
function loadModule(env, name) { vm.runInNewContext(fs.readFileSync(path.join(root, 'src', name), 'utf8'), env.context); }
function countNodes(component) { return descendants(component.render()[0], '', []).length; }

(async function () {
    const ui = fs.readFileSync(path.join(root, 'src/ui.js'), 'utf8');
    const accountSource = ui.slice(ui.indexOf('    function Account(object)'), ui.indexOf('    function AuthPage(object)'));
    const definitions = ['watching', 'planned', 'completed', 'dropped', 'favorites', 'postponed'].map((key, id) => ({id, key, title: key}));
    function accountEnvironment(statsPromise, countsPromise) {
        const env = environment(), profile = deferred();
        loadModule(env, 'ui-home-insights.js'); env.context.LampaYaniHomeInsights = env.context.window.LampaYaniHomeInsights;
        Object.assign(env.context, {
            t: key => key, localizedAuthText: key => key, openAccountLogin: () => {}, openNotifications: () => {}, openSubscriptions: () => {}, openUserReviews: () => {}, autoProgressSyncEnabled: () => true, syncPlaybackHistoryManually: () => {}, logoutFromAccount: () => {}, goBack: () => {},
            accountListDefinitions: () => definitions, formatAccountDate: String, formatWatchTime: String,
            cacheHomeListCounts: (id, counts) => env.calls.push(['cache', id, counts]),
            openUserListShortcut: definition => env.calls.push(['open-list', definition.id]),
            LampaYaniApi: {profile: () => profile.promise, userListStats: (id, control) => { env.calls.push(['stats', id, control]); return statsPromise || Promise.resolve({response: [{list: {id: 0}, seconds: 3600}, {list: {id: 4}, seconds: 0}]}); },
                userListCounts: (id, control) => { env.calls.push(['counts', id, control]); return countsPromise || Promise.resolve({response: {id, counts: {'0': 7, '1': 3, '2': 9, '3': 1, '4': 2, '5': 0}}}); },
                userLists: () => { throw new Error('Account may not download every list entry'); }, userStatsGenres: () => Promise.resolve([]), userStatsRatings: () => Promise.resolve([]), userStatsTypes: () => Promise.resolve([])}
        });
        vm.runInNewContext(accountSource + '\nthis.TestAccount = Account;', env.context);
        env.component = env.mount(new env.context.TestAccount({})); env.profile = profile;
        return env;
    }
    let env = accountEnvironment();
    env.profile.resolve({response: {id: 42, nickname: 'Viewer'}}); await settle();
    assert.equal(env.component.render().find('.yani-account__list').length, 6);
    assert.equal(env.component.render().find('.yani-account__list-count').first().text(), '7 anime_count');
    assert.equal(env.calls.find(call => call[0] === 'cache')[2][4], 2, 'favorite count stays independent');
    env.component.render().find('.yani-account__list').first().trigger('hover:enter');
    assert.deepEqual(env.calls.filter(call => call[0] === 'open-list'), [['open-list', 0]], 'category payload loads only after activation');
    const accountNodes = countNodes(env.component);
    assert.ok(accountNodes < 135, 'compact account DOM stays bounded without list previews');
    assert.equal(env.calls.find(call => call[0] === 'scroll')[1].mask, false);
    assert.equal(env.calls.find(call => call[0] === 'scroll')[1].notransition, true);

    env = accountEnvironment(); delete env.auth.user_id;
    env.profile.resolve({response: {id: 42}}); await settle(); env.auth.user_id = 42;
    let restoredController = false; env.context.Lampa.Controller.add = () => { restoredController = true; };
    env.component.start();
    assert.equal(restoredController, true, 'adding a user id to the same login cannot freeze Account navigation');
    env = accountEnvironment(); env.auth.token = 'rotated-token-42';
    env.profile.resolve({response: {id: 42}}); await settle();
    assert.equal(env.component.render().find('.yani-account__profile').length, 1, 'routine token rotation preserves the same account owner');
    env = accountEnvironment(); env.component.pause(); env.profile.resolve({response: {id: 42}}); await settle();
    assert.equal(env.calls.filter(call => call[0] === 'toggle').length, 0, 'paused Account cannot steal focus while its data arrives');
    env = accountEnvironment(); env.component.destroy(); env.profile.resolve({response: {id: 42}}); await settle();
    assert.equal(env.calls.filter(call => call[0] === 'stats').length, 0, 'closed Account does not start statistics requests');
    assert.equal(env.calls.filter(call => call[0] === 'toggle').length, 0, 'closed Account cannot steal controller focus');
    const slowStats = deferred(); env = accountEnvironment(slowStats.promise);
    env.profile.resolve({response: {id: 42}}); await settle(); env.auth.token = 'token-77'; env.auth.user_id = 77;
    slowStats.resolve({response: [{list: {id: 0}, count: 999}]}); await settle();
    assert.equal(env.component.render().find('.yani-account__profile').length, 0, 'late account response cannot render another owner');
    assert.equal(env.calls.filter(call => call[0] === 'cache').length, 0, 'late response cannot pollute account count cache');
    env = accountEnvironment(Promise.reject(new Error('offline'))); env.profile.resolve({response: {id: 42}}); await settle();
    assert.equal(env.component.render().find('.yani-account__list-count').first().text(), '7 anime_count', 'watch-time failure does not hide independent title counts');
    assert.ok(env.component.render().find('.yani-account__list-time').first().text().includes('—'));
    env = accountEnvironment(undefined, Promise.reject(new Error('counts offline'))); env.profile.resolve({response: {id: 42}}); await settle();
    assert.equal(env.component.render().find('.yani-account__list-count').first().text(), '— anime_count', 'failed title counts remain unknown');
    assert.ok(env.component.render().find('.yani-account__list-time').first().text().includes('3600'), 'watch time remains visible when counts fail');
    assert.equal(env.calls.filter(call => call[0] === 'cache').length, 0, 'unavailable counts cannot cache fabricated zeros');
    env = accountEnvironment(undefined, Promise.resolve({response: {id: 42}})); env.profile.resolve({response: {id: 42}}); await settle();
    assert.equal(env.component.render().find('.yani-account__list-count').first().text(), '— anime_count', 'missing count fields stay unknown');

    env = environment(); const initial = deferred(), next = deferred(); let fetches = 0, markAllCalls = 0;
    loadModule(env, 'ui-notifications.js');
    const rows = Array.from({length: 30}, (_, index) => ({id: index + 1, title: 'Notification ' + index, type: 'anime_episode', anime_id: index + 1, date: Date.now() / 1000}));
    const notificationModule = env.context.window.LampaYaniNotifications;
    const deps = {t: key => key, normalize: notificationModule.normalize, formatDate: String, ownerKey: () => env.auth.user_id,
        fetch: () => { fetches++; return fetches === 1 ? initial.promise : next.promise; }, markRead: () => Promise.resolve(), markAllRead: () => { markAllCalls++; return Promise.resolve(); }, deleteAll: () => Promise.resolve(), toCard: value => value, openDetail: () => {}, goBack: () => {}};
    const notifications = env.mount(notificationModule.create({}, deps));
    initial.resolve({response: rows}); await settle(); env.flush();
    assert.equal(notifications.render().find('.yani-notification').length, 30);
    const more = notifications.render().find('.yani-notifications__more'); more.trigger('hover:enter').trigger('hover:enter');
    assert.equal(fetches, 2, 'holding Enter cannot issue overlapping notification pages');
    notifications.render().find('.yani-notifications__action').first().trigger('hover:enter');
    assert.equal(markAllCalls, 0, 'mark-all waits until an older in-flight page finishes');
    liveAppends = 0;
    next.resolve({response: rows.map(row => Object.assign({}, row, {id: row.id + 30}))}); await settle();
    assert.equal(notifications.render().find('.yani-notification').length, 60);
    assert.ok(liveAppends <= 3, 'notification page commits one detached fragment, not thirty live rows');
    const notificationNodes = countNodes(notifications), notificationPageCommits = liveAppends;
    notifications.render().find('.yani-notifications__action').first().trigger('hover:enter'); await settle();
    assert.equal(markAllCalls, 1);
    assert.equal(notifications.render().find('.yani-notification.unread').length, 0, 'completed mark-all covers every appended row');
    assert.ok(notificationNodes < 1200, '60 notifications stay below 1200 elements');
    const lateEnv = environment(), late = deferred(); loadModule(lateEnv, 'ui-notifications.js');
    const lateNotifications = lateEnv.mount(lateEnv.context.window.LampaYaniNotifications.create({}, Object.assign({}, deps, {ownerKey: () => lateEnv.auth.user_id, fetch: () => late.promise})));
    lateNotifications.destroy(); late.resolve({response: rows}); await settle();
    assert.equal(lateEnv.calls.filter(call => call[0] === 'toggle').length, 0, 'late notification response cannot reactivate a destroyed page');
    const switchedEnv = environment(), switchedRequest = deferred(); loadModule(switchedEnv, 'ui-notifications.js');
    const switchedNotifications = switchedEnv.mount(switchedEnv.context.window.LampaYaniNotifications.create({}, Object.assign({}, deps, {ownerKey: () => switchedEnv.auth.user_id, fetch: () => switchedRequest.promise})));
    switchedEnv.auth.user_id = 77; switchedRequest.resolve({response: rows}); await settle();
    assert.equal(switchedNotifications.render().find('.yani-notification').length, 0, 'notification response remains bound to its originating account');

    env = environment(); const membershipStore = {}, requestKinds = []; let memberItems = [{id: 1, list: 0, favorite: true}];
    env.context.Lampa.Storage = {get: (key, fallback) => membershipStore[key] || fallback, set: (key, value) => { membershipStore[key] = value; }, remove: key => { delete membershipStore[key]; }};
    Object.assign(env.context, {resolveUserListsUserId: () => Promise.resolve(42), normalizeUserList: value => value.response,
        filterAccountListItems: (definition, items) => items.filter(item => definition.id === 4 ? item.favorite : item.list === definition.id),
        LampaYaniApi: {userList: (id, listId) => { requestKinds.push('category:' + listId); return Promise.resolve({response: memberItems}); }, userLists: () => { requestKinds.push('favorites'); return Promise.resolve({response: memberItems}); }}});
    vm.runInNewContext(ui.slice(ui.indexOf('    function loadUserListShortcutItems('), ui.indexOf('    function normalizeUserList(')) + '\nthis.loadCategory = loadUserListShortcutItems;', env.context);
    assert.equal((await env.context.loadCategory(definitions[0])).length, 1);
    memberItems = [{id: 1, list: 2, favorite: true}];
    assert.equal((await env.context.loadCategory(definitions[0])).length, 0, 'reopening a category sees saved membership changes');
    assert.equal((await env.context.loadCategory(definitions[4])).length, 1, 'favorites remain independent and load lazily');
    assert.deepEqual(requestKinds, ['category:0', 'category:0', 'favorites']);
    const invalidation = ui.slice(ui.indexOf('    function invalidateUserListsSnapshot()'), ui.indexOf("    if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('yani:auth-changed', invalidateUserListsSnapshot);"));
    membershipStore.yani_lite_counts_v1 = 'old counts'; membershipStore.yani_home_list_counts = 'old counts';
    vm.runInNewContext("var userListsSnapshot = {old: true}; var homeListCountsCacheKey = 'yani_home_list_counts';" + invalidation + '\nthis.invalidateLists = invalidateUserListsSnapshot;', env.context);
    env.context.invalidateLists();
    assert.equal(env.context.userListsSnapshot, null); assert.equal(membershipStore.yani_lite_counts_v1, undefined);
    assert.equal(membershipStore.yani_home_list_counts, undefined, 'mutation invalidation clears both compact count caches');

    env = environment(); const statusRequest = deferred(); env.context.LampaYaniApi = {status: () => statusRequest.promise}; loadModule(env, 'ui-status.js');
    const statusModule = env.context.window.LampaYaniStatus;
    const history = Array.from({length: 10000}, (_, index) => ({time: index, status: index === 4567 ? 'down' : 'up'}));
    const compacted = statusModule.compactHistory(history, 48);
    assert.equal(compacted.length, 48); assert.equal(compacted[0].time, 0); assert.equal(compacted[47].end_time, 9999);
    assert.equal(compacted.filter(point => point.status === 'down').length, 1, 'condensed history preserves short outages');
    const status = env.mount(statusModule.create({}, {t: key => key, locale: () => 'en', goBack: () => {}}));
    statusRequest.resolve({summary: {status: 'up', checks: 10000, uptime_percent: 99.99}, domains: [{domain: 'api.yani.tv', status: 'up', history}]}); await settle();
    assert.equal(status.render().find('.yani-status__bar').length, 48);
    assert.equal(status.render().find('.yani-status__ring').length, 0, 'no gradient donut is constructed');
    const statusNodes = countNodes(status);
    assert.ok(statusNodes < 120, '10,000 history points cannot expand the status DOM');
    const lateStatusEnv = environment(), lateStatusRequest = deferred(); lateStatusEnv.context.LampaYaniApi = {status: () => lateStatusRequest.promise}; loadModule(lateStatusEnv, 'ui-status.js');
    const lateStatus = lateStatusEnv.mount(lateStatusEnv.context.window.LampaYaniStatus.create({}, {t: key => key, locale: () => 'en', goBack: () => {}}));
    lateStatus.destroy(); lateStatusRequest.resolve({summary: {}, domains: []}); await settle();
    assert.equal(lateStatusEnv.calls.filter(call => call[0] === 'toggle').length, 0);

    env = environment(); const refreshed = deferred(); let refreshCalls = 0;
    env.context.LampaYaniAuth.refresh = () => { refreshCalls++; return refreshed.promise; };
    loadModule(env, 'ui-auth.js');
    const authPage = env.mount(env.context.window.LampaYaniAuthPage.create({}, {t: key => key, input: () => {}, goBack: () => {}}));
    const refresh = authPage.render().find('[data-yani-focus-key="refresh"]'); refresh.trigger('hover:enter').trigger('hover:enter');
    assert.equal(refreshCalls, 1, 'token refresh action cannot overlap');
    authPage.destroy(); refreshed.resolve(); await settle(); env.flush();
    assert.equal(env.calls.filter(call => call[0] === 'notice').length, 0, 'closed authorization screen does not redraw or notify');
    console.log(JSON.stringify({accountNodes, notificationRows: 60, notificationNodes, notificationPageCommits, statusHistoryPoints: 10000, statusBars: 48, statusNodes}));
    console.log('PASS lightweight private runtime: bounded account/status DOM, batched notification pages, owner/destroy guards and duplicate-action protection');
})().catch(error => { console.error(error); process.exitCode = 1; });

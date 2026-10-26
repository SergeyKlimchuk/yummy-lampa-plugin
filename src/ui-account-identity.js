(function (window) {
    'use strict';

    var states = [];
    var freshFor = 5 * 60 * 1000;
    var retryAfter = 30 * 1000;
    var icons = {
        account: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="7.5" r="4" fill="currentColor"/><path d="M4 21v-2.1a8 8 0 0 1 16 0V21Z" fill="currentColor"/></svg>',
        settings: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M9.2 2h5.6l.5 2.2 1.8 1 2.1-.6L22 9.4 20.4 11v2l1.6 1.6-2.8 4.8-2.1-.6-1.8 1-.5 2.2H9.2l-.5-2.2-1.8-1-2.1.6L2 14.6 3.6 13v-2L2 9.4l2.8-4.8 2.1.6 1.8-1Z"/><circle cx="12" cy="12" r="3.2"/></svg>'
    };

    function icon(name) { return icons[name] || icons.account; }
    function unwrap(value) {
        var result = value && value.response !== undefined ? value.response : value;
        return result && (result.profile || result.user) || result || {};
    }
    function avatarUrl(value) {
        if (value && typeof value === 'object') value = value.small || value.medium || value.big || value.full || value.url || '';
        value = String(value || '').trim();
        if (value.indexOf('//') === 0) value = 'https:' + value;
        return /^https?:\/\/[^\s]+$/i.test(value) ? value : '';
    }
    function session(auth) {
        var account = auth && auth.get ? auth.get() || {} : {};
        var token = auth && auth.token ? auth.token() || '' : '';
        var id = token ? String(account.user_id || account.id || '') : '';
        var login = token ? String(account.login || '').toLowerCase() : '';
        return {authorized: Boolean(token), id: id, login: login, key: token ? id ? 'id:' + id : login ? 'login:' + login : '' : 'guest', token: token, account: account};
    }
    function sameSession(left, right) {
        if (left.authorized !== right.authorized) return false;
        if (!left.authorized) return true;
        if (left.id && right.id) return left.id === right.id;
        if (left.login && right.login) return left.login === right.login;
        return left.token === right.token;
    }
    function stateFor(auth, api) {
        var result;
        states.some(function (state) { if (state.auth === auth && state.api === api) { result = state; return true; } return false; });
        if (result) return result;
        result = {auth: auth, api: api, subscribers: [], cache: null, task: null, key: null, generation: 0, retryAt: 0, listening: false};
        result.changed = function () {
            result.cache = null; result.retryAt = 0; result.generation += 1; result.task = null;
            notify(result); ensure(result);
        };
        states.push(result);
        return result;
    }
    function notify(state) { state.subscribers.slice().forEach(function (subscriber) { subscriber.paint(); }); }
    function ensure(state) {
        var owner = session(state.auth);
        if (state.key !== owner.key) {
            state.key = owner.key; state.cache = null; state.task = null; state.retryAt = 0; state.generation += 1;
        }
        // Without a stable ID/login, use a response only for the current paint.
        // A later binding/refresh must revalidate instead of sharing an anonymous cache.
        if (!owner.key && state.cache) state.cache = null;
        if (!owner.authorized || !state.api || !state.api.profile) return;
        if (state.cache && state.cache.key === owner.key && Date.now() - state.cache.at < freshFor) return;
        if ((state.task && sameSession(state.task.owner, owner)) || Date.now() < state.retryAt) return;
        var task = {owner: owner, generation: state.generation};
        state.task = task;
        task.promise = Promise.resolve().then(function () {
            if (state.task !== task || task.generation !== state.generation || !sameSession(owner, session(state.auth))) return null;
            return state.api.profile({retry: false});
        }).then(function (payload) {
            if (!payload || state.task !== task || task.generation !== state.generation || !sameSession(owner, session(state.auth))) return;
            var profile = unwrap(payload), id = String(profile.id || profile.user_id || '');
            if (owner.id && id && owner.id !== id) return;
            // Only public identity is cached, in memory, under an account key.
            // A token is retained solely by the pending-request ownership guard.
            state.cache = {key: owner.key, at: Date.now(), identity: {
                nickname: String(profile.nickname || profile.display_name || profile.login || '').trim(),
                avatar: avatarUrl(profile.avatars || profile.avatar)
            }};
        }).catch(function () {
            if (state.task === task && task.generation === state.generation) state.retryAt = Date.now() + retryAfter;
        }).then(function () {
            if (state.task !== task) return;
            state.task = null; task.owner = null;
            notify(state);
        });
    }
    function bind(button, options) {
        options = options || {};
        var $ = window.$;
        var auth = options.auth || window.LampaYaniAuth;
        var api = options.api || window.LampaYaniApi;
        var state = stateFor(auth, api), root = button && button.jquery ? button : $(button);
        var symbol = root.find(options.iconSelector || '.yani-account-nav__icon').first();
        var label = root.find(options.labelSelector || '.yani-account-nav__label').first();
        var destroyed = false, painted = '', failedAvatar = '', image = null;
        function fallbackLabel() { var value = options.t ? options.t('account') : ''; return value && value !== 'account' ? value : 'Аккаунт'; }
        function paint() {
            if (destroyed) return;
            var owner = session(auth), cached = state.cache && state.cache.key === owner.key ? state.cache.identity : {};
            var account = owner.account;
            var nickname = owner.authorized ? cached.nickname || account.nickname || account.display_name || account.login || fallbackLabel() : fallbackLabel();
            var avatar = owner.authorized ? cached.avatar || avatarUrl(account.avatars || account.avatar) : '';
            if (avatar === failedAvatar) avatar = '';
            var signature = [owner.key, owner.authorized, nickname, avatar].join('\n');
            if (signature === painted) return;
            painted = signature;
            if (image) image.off('.yaniAccountIdentity');
            image = null;
            label.text(nickname); root.attr('title', nickname);
            symbol.empty().append($(icon('account')));
            if (avatar) {
                image = $('<img class="yani-account-nav__avatar" alt="" decoding="async">').attr('src', avatar);
                var requested = avatar, requestedOwner = owner;
                image.on('error.yaniAccountIdentity', function () {
                    if (destroyed || !sameSession(requestedOwner, session(auth))) return;
                    failedAvatar = requested; painted = ''; paint();
                });
                symbol.empty().append(image);
            }
        }
        var subscriber = {paint: paint};
        state.subscribers.push(subscriber);
        var doc = window.document;
        if (!state.listening && doc && doc.addEventListener) { doc.addEventListener('yani:auth-changed', state.changed); state.listening = true; }
        function refresh() { if (!destroyed) { ensure(state); paint(); } }
        refresh();
        return {
            refresh: refresh,
            destroy: function () {
                if (destroyed) return; destroyed = true;
                if (image) image.off('.yaniAccountIdentity');
                image = null;
                var index = state.subscribers.indexOf(subscriber);
                if (index >= 0) state.subscribers.splice(index, 1);
                if (!state.subscribers.length && state.listening && doc && doc.removeEventListener) { doc.removeEventListener('yani:auth-changed', state.changed); state.listening = false; }
                root = symbol = label = null;
            }
        };
    }
    window.LampaYaniAccountIdentity = {bind: bind, icon: icon, avatarUrl: avatarUrl};
}(window));

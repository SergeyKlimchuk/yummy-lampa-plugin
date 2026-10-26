(function (window) {
    'use strict';

    // One in-flight /videos request per title, shared by catalog cards,
    // detail episode stats, translation chips, and the Watch menu.
    // Completed payloads stay in a small TTL cache; closing a title card
    // drops that card's waiters and aborts the network request when nobody
    // else still needs it.

    function abortError() {
        var error = new Error('Aborted');
        error.name = 'AbortError';
        return error;
    }

    function isAbort(error) {
        return Boolean(error && (error.name === 'AbortError' || /aborted/i.test(String(error.message || ''))));
    }

    function videosFromPayload(payload) {
        var videos = payload && payload.response ? payload.response : payload;
        if (Object.prototype.toString.call(videos) === '[object Array]') return videos;
        return videos && (videos.videos || videos.items) || [];
    }

    function create(deps) {
        deps = deps || {};
        var config = window.LampaYaniConfig || {};
        var fetchVideos = deps.fetch || function (id, options) {
            return window.LampaYaniApi.videos(id, options);
        };
        var ttl = Number(deps.ttl || config.videosCacheTtl || 120000);
        var maxEntries = Number(deps.maxEntries || config.videosCacheEntries || 20);
        var now = deps.now || function () { return Date.now(); };
        var entries = {};
        var order = [];
        var cacheOwner = null;

        function readOwner() {
            var auth = window.LampaYaniAuth;
            var value = deps.owner ? deps.owner() : auth && auth.get ? auth.get() || {} : {};
            if (typeof value !== 'object' || value === null) return {key: String(value || '')};
            return {
                id: String(value.user_id || value.id || ''),
                login: String(value.login || ''),
                token: String(deps.owner ? value.token || '' : auth && auth.token ? auth.token() || '' : value.token || '')
            };
        }

        function sameOwner(left, right) {
            if (!left || !right) return false;
            if (Object.prototype.hasOwnProperty.call(left, 'key') || Object.prototype.hasOwnProperty.call(right, 'key')) return left.key === right.key;
            if (Boolean(left.token) !== Boolean(right.token)) return false;
            if (left.id && right.id) return left.id === right.id;
            if (left.login && right.login) return left.login === right.login;
            return left.token === right.token;
        }

        function retire(key, entry) {
            if (!entry) return;
            forget(key, entry);
            entry.retired = true;
            if (entry.controller && entry.controller.abort) entry.controller.abort();
            entry.controller = null;
            entry.inflight = false;
            settleWaiters(entry, abortError());
        }

        function ensureOwner() {
            var current = readOwner();
            if (!sameOwner(cacheOwner, current)) {
                var previous = entries;
                entries = {};
                order = [];
                Object.keys(previous).forEach(function (key) { retire(key, previous[key]); });
            }
            cacheOwner = current;
            return current;
        }

        function remember(key) {
            var index = order.indexOf(key);
            if (index >= 0) order.splice(index, 1);
            order.push(key);
            evict();
        }

        function forget(key, entry) {
            if (entry && entries[key] !== entry) return;
            delete entries[key];
            var index = order.indexOf(key);
            if (index >= 0) order.splice(index, 1);
        }

        function evict() {
            var skipped = 0;
            while (order.length > maxEntries && skipped < order.length) {
                var oldest = order[0];
                var entry = entries[oldest];
                if (entry && entry.inflight) {
                    order.push(order.shift());
                    skipped += 1;
                    continue;
                }
                order.shift();
                delete entries[oldest];
            }
        }

        function clearWaiter(waiter) {
            if (!waiter || waiter.cleared) return;
            waiter.cleared = true;
            if (waiter.abortListener && waiter.signal && waiter.signal.removeEventListener) {
                waiter.signal.removeEventListener('abort', waiter.abortListener);
            }
        }

        function settleWaiters(entry, error, payload) {
            var waiters = entry.waiters || [];
            entry.waiters = [];
            waiters.forEach(function (waiter) {
                if (waiter.cleared) return;
                clearWaiter(waiter);
                if (error) waiter.reject(error);
                else waiter.resolve(payload);
            });
        }

        function cancelWaiter(key, entry, waiter) {
            if (!waiter || waiter.cleared) return;
            clearWaiter(waiter);
            entry.waiters = (entry.waiters || []).filter(function (item) { return item !== waiter; });
            waiter.reject(abortError());
            if (entry.inflight && !entry.waiters.length) retire(key, entry);
        }

        function attachWaiter(key, entry, signal) {
            return new Promise(function (resolve, reject) {
                if (signal && signal.aborted) {
                    reject(abortError());
                    if (entry.inflight && !(entry.waiters && entry.waiters.length) && entry.controller && entry.controller.abort) {
                        entry.controller.abort();
                    }
                    return;
                }
                var waiter = {resolve: resolve, reject: reject, signal: signal, cleared: false};
                waiter.abortListener = function () { cancelWaiter(key, entry, waiter); };
                if (signal && signal.addEventListener) signal.addEventListener('abort', waiter.abortListener);
                entry.waiters.push(waiter);
            });
        }

        function start(key, id, owner) {
            var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            var entry = {
                inflight: true,
                controller: controller,
                waiters: [],
                at: 0,
                payload: null,
                owner: owner,
                retired: false
            };
            entries[key] = entry;
            remember(key);
            Promise.resolve(fetchVideos(id, {signal: controller && controller.signal})).then(function (payload) {
                var owner = ensureOwner();
                // An aborted request may still resolve on older webviews. It
                // must never repopulate the cache or touch a newer same-title request.
                if (entry.retired || entries[key] !== entry || !sameOwner(entry.owner, owner) ||
                    controller && controller.signal && controller.signal.aborted) throw abortError();
                entry.inflight = false;
                entry.controller = null;
                entry.payload = payload;
                entry.at = now();
                remember(key);
                settleWaiters(entry, null, payload);
            }).catch(function (error) {
                entry.inflight = false;
                entry.controller = null;
                forget(key, entry);
                settleWaiters(entry, isAbort(error) ? abortError() : error);
            });
            return entry;
        }

        function payload(id, options) {
            options = options || {};
            var key = String(id || '');
            if (!key) return Promise.reject(new Error('YummyAnime video id is missing'));
            var owner = ensureOwner();
            if (options.signal && options.signal.aborted) return Promise.reject(abortError());
            var entry = entries[key];
            if (!options.fresh && entry && !entry.inflight && entry.payload && now() - entry.at < ttl) {
                remember(key);
                return Promise.resolve().then(function () {
                    if (!sameOwner(owner, ensureOwner())) throw abortError();
                    return entry.payload;
                });
            }
            if (entry && entry.inflight) return attachWaiter(key, entry, options.signal);
            entry = start(key, id, owner);
            return attachWaiter(key, entry, options.signal);
        }

        function list(id, options) {
            return payload(id, options).then(videosFromPayload);
        }

        function invalidate(id) {
            ensureOwner();
            // Normal invalidation leaves shared in-flight consumers alone.
            // Only an account transition retires those requests immediately.
            var key = String(id || '');
            if (!key) {
                Object.keys(entries).forEach(function (item) {
                    if (entries[item] && !entries[item].inflight) forget(item, entries[item]);
                });
                return;
            }
            var entry = entries[key];
            if (entry && !entry.inflight) forget(key, entry);
        }

        return {
            payload: payload,
            list: list,
            invalidate: invalidate,
            videosFromPayload: videosFromPayload
        };
    }

    window.LampaYani = window.LampaYani || {};
    window.LampaYani.VideoData = window.LampaYaniVideoData = {create: create, videosFromPayload: videosFromPayload};
}(window));

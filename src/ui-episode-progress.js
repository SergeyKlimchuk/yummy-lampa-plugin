(function (window) {
    'use strict';

    // A sparse, account-owned journal complements the server's full /videos
    // snapshot. It remembers observations, never an inferred range of episodes.
    var storagePrefix = 'yani_episode_progress_v1:';
    var maxTitles = 200;
    var maxEpisodes = 5000;
    var writeInterval = 30000;
    var currentOwner = null;
    var journal = null;
    var dirty = false;
    var lastWrite = 0;
    var lastSerialized = '';
    var episodeCount = 0;
    var lastObservationAt = 0;
    var unknownToken = '';
    var unknownSession = 0;
    var emptyState = {state: 'none', percent: 0, time: 0, duration: 0};

    function dictionary() { return Object.create(null); }
    function positive(value) {
        value = Number(value);
        return isFinite(value) && value > 0 ? value : 0;
    }
    function flag(value) { return value === true || value === 1 || value === 'true' || value === '1'; }
    function identity(value) {
        return typeof value === 'string' || typeof value === 'number' ? String(value).trim().slice(0, 200) : '';
    }
    function owner() {
        var auth = window.LampaYaniAuth;
        var data = {}, token = '';
        try {
            data = auth && auth.get ? auth.get() || {} : {};
            token = auth && auth.token ? auth.token() || '' : data.token || data.access_token || '';
        } catch (error) {}
        if (!token) return {key: 'anonymous', persist: true};
        var login = identity(data.login || data.email || data.nickname).toLowerCase();
        if (login) return {key: 'login:' + login, persist: true};
        var id = identity(data.user_id || data.userId || data.id || data.user && data.user.id || data.profile && data.profile.id);
        if (id) return {key: 'user:' + id, persist: true};
        // Do not persist an authenticated journal under "anonymous", or store
        // credentials in a storage key when the API has not provided an identity.
        if (token !== unknownToken) { unknownToken = token; unknownSession += 1; }
        return {key: 'session:' + unknownSession, persist: false};
    }
    function sameOwner(left, right) { return Boolean(left && right && left.key && left.key === right.key); }
    function storageKey(scope) { return storagePrefix + encodeURIComponent(scope.key); }
    function read(scope) {
        if (!scope.persist || !window.Lampa || !window.Lampa.Storage || !window.Lampa.Storage.get) return null;
        try {
            var value = window.Lampa.Storage.get(storageKey(scope), null);
            return typeof value === 'string' ? JSON.parse(value) : value;
        } catch (error) { return null; }
    }
    function cardId(card) {
        var id = card && typeof card === 'object' ? card.yani_id || card.anime_id : card;
        return /^[1-9]\d*$/.test(String(id || '')) ? String(id) : '';
    }
    function episodeKey(video) {
        var Episode = window.LampaYaniEpisode;
        var value = video && typeof video === 'object' ? Episode && Episode.valueOf ? Episode.valueOf(video) : video.number || video.episode || video.index : video;
        var key = Episode && Episode.key ? Episode.key(value) : String(value === undefined || value === null ? '' : value).trim().toLowerCase();
        if (key) return key.slice(0, 160);
        var id = video && (video.video_id || video.id);
        return id ? 'video:' + identity(id) : '';
    }
    function publicState(value) {
        if (!value) return emptyState;
        var time = positive(value.t), duration = positive(value.d);
        return {state: value.s === 2 ? 'completed' : 'started', percent: value.s === 2 ? 100 : duration ? Math.min(100, Math.round(time / duration * 100)) : 0, time: time, duration: duration};
    }
    function observation(video) {
        video = video || {};
        var watched = video.watched && typeof video.watched === 'object' ? video.watched : {};
        var time = positive(watched.end_time || watched.time || watched.position);
        var duration = positive(video.duration) || positive(watched.duration);
        var flags = {completed: flag(watched.completed) || flag(video.completed), finished: flag(watched.finished) || flag(video.finished)};
        var utils = window.LampaYaniUiUtils;
        var complete = utils && utils.isEpisodeFinished ? utils.isEpisodeFinished(time, duration, flags) : flags.completed || flags.finished || duration > 0 && time / duration >= 0.95;
        return complete || time ? {s: complete ? 2 : 1, t: time, d: duration, a: 0} : null;
    }
    function prefer(left, right) {
        if (!left) return right;
        if (!right) return left;
        if (left.s !== right.s) return left.s > right.s ? left : right;
        var leftPercent = left.d ? left.t / left.d : 0, rightPercent = right.d ? right.t / right.d : 0;
        if (leftPercent !== rightPercent) return leftPercent > rightPercent ? left : right;
        return left.t >= right.t ? left : right;
    }
    function prune() {
        var ids = Object.keys(journal.titles).sort(function (left, right) { return journal.titles[right].a - journal.titles[left].a; });
        ids.slice(maxTitles).forEach(function (id) { delete journal.titles[id]; });
        var entries = [];
        ids.slice(0, maxTitles).forEach(function (id) {
            Object.keys(journal.titles[id].episodes).forEach(function (key) { entries.push({id: id, key: key, at: journal.titles[id].episodes[key].a}); });
        });
        entries.sort(function (left, right) { return right.at - left.at; });
        entries.slice(maxEpisodes).forEach(function (entry) { delete journal.titles[entry.id].episodes[entry.key]; });
        Object.keys(journal.titles).forEach(function (id) { if (!Object.keys(journal.titles[id].episodes).length) delete journal.titles[id]; });
        episodeCount = Math.min(entries.length, maxEpisodes);
    }
    function load(scope) {
        var saved = read(scope);
        journal = {version: 1, titles: dictionary()};
        episodeCount = 0;
        lastObservationAt = 0;
        if (saved && saved.version === 1 && saved.titles && typeof saved.titles === 'object') {
            Object.keys(saved.titles).forEach(function (id) {
                var raw = saved.titles[id];
                if (!cardId(id) || !raw || !raw.episodes || typeof raw.episodes !== 'object') return;
                var title = {a: positive(raw.a), episodes: dictionary()};
                Object.keys(raw.episodes).forEach(function (key) {
                    var entry = raw.episodes[key];
                    if (!key || key.length > 160 || !entry || (entry.s !== 1 && entry.s !== 2)) return;
                    title.episodes[key] = {s: entry.s, t: positive(entry.t), d: positive(entry.d), a: positive(entry.a)};
                    lastObservationAt = Math.max(lastObservationAt, title.episodes[key].a);
                    episodeCount += 1;
                });
                if (Object.keys(title.episodes).length) journal.titles[id] = title;
            });
        }
        prune();
        dirty = false;
        lastWrite = 0;
        lastSerialized = JSON.stringify(journal);
    }
    function persist(force) {
        if (!dirty || !currentOwner || !currentOwner.persist) return;
        var now = Date.now();
        if (!force && lastWrite && now - lastWrite < writeInterval) return;
        var serialized = JSON.stringify(journal);
        if (serialized === lastSerialized) { dirty = false; return; }
        if (!window.Lampa || !window.Lampa.Storage || !window.Lampa.Storage.set) return;
        try {
            window.Lampa.Storage.set(storageKey(currentOwner), serialized);
            lastWrite = now;
            lastSerialized = serialized;
            dirty = false;
        } catch (error) {
            // Quota failures must not erase the in-session completion state.
        }
    }
    function ensure() {
        var scope = owner();
        if (!sameOwner(scope, currentOwner)) {
            persist(true);
            currentOwner = scope;
            load(scope);
        }
        return scope;
    }
    function record(card, video, options) {
        options = options || {};
        var scope = ensure();
        if (options.owner && !sameOwner(options.owner, scope)) return null;
        var id = cardId(card), key = episodeKey(video), next = observation(video);
        if (!id || !key || !next) { if (options.flush) persist(true); return null; }
        var title = journal.titles[id] || {a: 0, episodes: dictionary()};
        var previous = title.episodes[key];
        var merged = prefer(previous, next);
        var changed = !previous || previous.s !== merged.s || previous.t !== merged.t || previous.d !== merged.d;
        if (changed) {
            var at = Math.max(Date.now(), lastObservationAt + 1);
            lastObservationAt = at;
            if (!previous) episodeCount += 1;
            title.episodes[key] = {s: merged.s, t: merged.t, d: merged.d, a: at};
            title.a = at;
            journal.titles[id] = title;
            dirty = true;
            if (Object.keys(journal.titles).length > maxTitles || episodeCount > maxEpisodes) prune();
        }
        persist(Boolean(options.flush || changed && merged.s === 2));
        return publicState(title.episodes[key]);
    }
    function legacyAllowed(playback, scope) {
        if (!playback) return false;
        var tagged = playback.progressOwner || playback.owner || playback.ownerKey || playback.owner_key;
        if (typeof tagged === 'string') tagged = {key: tagged};
        return scope.key === 'anonymous' || sameOwner(tagged, scope);
    }
    function index(card, videos, localPlayback) {
        var scope = ensure(), result = dictionary(), observations = dictionary();
        var id = cardId(card), title = id && journal.titles[id];
        function merge(key, value) { if (key && value) observations[key] = prefer(observations[key], value); }
        (Array.isArray(videos) ? videos : []).forEach(function (video) { merge(episodeKey(video), observation(video)); });
        if (title) Object.keys(title.episodes).forEach(function (key) { merge(key, title.episodes[key]); });
        if (legacyAllowed(localPlayback, scope)) {
            merge(episodeKey(localPlayback), observation({duration: localPlayback.duration, watched: {end_time: localPlayback.time, completed: localPlayback.completed, finished: localPlayback.finished}}));
        }
        Object.keys(observations).forEach(function (key) { result[key] = publicState(observations[key]); });
        return result;
    }
    function state(states, video) { return states && states[episodeKey(video)] || emptyState; }

    if (window.document && window.document.addEventListener) window.document.addEventListener('yani:auth-changed', ensure);
    window.LampaYaniEpisodeProgress = {owner: owner, sameOwner: sameOwner, record: record, index: index, state: state};
}(window));

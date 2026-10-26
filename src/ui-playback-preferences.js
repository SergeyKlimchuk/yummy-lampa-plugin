(function (window) {
    'use strict';

    var choicesKey = 'yani_playback_preferences_v1';
    var voicesKey = 'yani_known_voices_v1';
    var maxTitles = 200;
    var maxVoices = 160;
    var providers = ['kodik', 'vk', 'alloha', 'cvh', 'sibnet', 'aksor'];
    var transient = {};
    var dirty = {};

    function read(key, fallback) {
        // A full TV storage can reject writes while continuing to return the
        // previous value. Keep that key's new choice usable for this session.
        // Clean keys still read native Settings updates directly from Storage.
        if (dirty[key]) return transient[key];
        try {
            if (window.Lampa && window.Lampa.Storage && window.Lampa.Storage.get) return window.Lampa.Storage.get(key, fallback);
        } catch (error) {}
        return Object.prototype.hasOwnProperty.call(transient, key) ? transient[key] : fallback;
    }

    function write(key, value) {
        transient[key] = value;
        dirty[key] = true;
        try {
            if (window.Lampa && window.Lampa.Storage && window.Lampa.Storage.set) {
                window.Lampa.Storage.set(key, value);
                delete dirty[key];
            }
        } catch (error) {}
    }

    function name(value) {
        if (value && typeof value === 'object') value = value.value;
        return typeof value === 'string' ? value.replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160) : '';
    }

    function normalizeVoice(value) {
        // API team names may include a generic voice-over label that a person
        // naturally omits in Settings. Dubbed and subtitled releases keep their
        // prefixes because those labels identify a different translation.
        return name(value).toLowerCase().replace(/^(?:озвучка|озвучення)\s+/, '');
    }

    function knownSource(value) {
        value = normalizeVoice(value);
        for (var index = 0; index < providers.length; index++) {
            var id = providers[index];
            if (id === 'vk' ? /(?:^|[^a-z])vk(?:video|ontakte)?(?:[^a-z]|$)/.test(value) : value.indexOf(id) >= 0) return id;
        }
        return '';
    }

    function source(group) {
        var fields = typeof group === 'string' ? [group] : group ? [group.playerId, group.player_id, group.player, group.source] : [];
        // Some responses use a numeric player_id alongside a readable player.
        // Prefer a recognised provider before retaining an opaque fallback id.
        for (var index = 0; index < fields.length; index++) {
            var recognised = knownSource(fields[index]);
            if (recognised) return recognised;
        }
        for (var fallback = 0; fallback < fields.length; fallback++) {
            if (fields[fallback] === undefined || fields[fallback] === null) continue;
            var value = name(String(fields[fallback])).toLowerCase();
            if (value) return value.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        }
        return '';
    }

    function defaultSource(value) {
        if (value && typeof value === 'object') value = value.value;
        value = normalizeVoice(value);
        return providers.indexOf(value) >= 0 ? value : 'auto';
    }

    function defaults() {
        return {voice: name(read('yani_default_voice', '')), source: defaultSource(read('yani_default_source', 'auto'))};
    }

    function setDefaults(patch) {
        patch = patch || {};
        if (Object.prototype.hasOwnProperty.call(patch, 'voice')) {
            var voice = name(patch.voice);
            if (read('yani_default_voice', '') !== voice) write('yani_default_voice', voice);
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'source')) {
            var selectedSource = defaultSource(patch.source);
            if (read('yani_default_source', 'auto') !== selectedSource) write('yani_default_source', selectedSource);
        }
        return defaults();
    }

    function storedObject(key, fallback) {
        var value = read(key, null);
        try { if (typeof value === 'string') value = JSON.parse(value); } catch (error) { value = null; }
        return value && typeof value === 'object' ? value : fallback;
    }

    function knownVoices() {
        var items = storedObject(voicesKey, []);
        if (!Array.isArray(items)) return [];
        var seen = Object.create(null);
        return items.map(name).filter(function (value) {
            var key = normalizeVoice(value);
            if (!key || seen[key]) return false;
            seen[key] = true;
            return true;
        }).slice(-maxVoices).sort(function (left, right) { return left.localeCompare(right); });
    }

    function observe(groups) {
        var before = knownVoices();
        var items = before.slice();
        var seen = Object.create(null);
        var incoming = Object.create(null);
        var incomingCount = 0;
        items.forEach(function (value) { seen[normalizeVoice(value)] = true; });
        (groups || []).forEach(function (group) {
            var voice = name(group && group.title);
            var key = normalizeVoice(voice);
            if (!key || incoming[key] || incomingCount >= maxVoices) return;
            incoming[key] = true;
            incomingCount += 1;
            if (!key || seen[key]) return;
            seen[key] = true;
            items.push(voice);
        });
        items = items.slice(-maxVoices).sort(function (left, right) { return left.localeCompare(right); });
        if (JSON.stringify(items) !== JSON.stringify(before)) write(voicesKey, JSON.stringify(items));
        return items;
    }

    function cardId(card) {
        var value = card && typeof card === 'object' ? card.yani_id || card.anime_id : card;
        return /^[1-9]\d*$/.test(String(value || '')) ? String(value) : '';
    }

    function validTarget(value) {
        return value === 'internal' || value === 'external' || value === 'ask' ? value : '';
    }

    function entries() {
        var value = storedObject(choicesKey, {});
        var raw = value.version === 1 && value.items && typeof value.items === 'object' ? value.items : {};
        var result = {};
        Object.keys(raw).forEach(function (id) {
            var entry = raw[id];
            if (!cardId(id) || !entry || typeof entry !== 'object') return;
            var voice = name(entry.voice);
            var provider = source(typeof entry.source === 'string' ? entry.source : '');
            // Old builds stored an application override here. Application choice
            // is global now; retain only the title's translation/provider pair.
            if (!voice && !provider) return;
            result[id] = {voice: voice, source: provider, updatedAt: Math.max(0, Number(entry.updatedAt) || 0)};
        });
        return result;
    }

    function saveEntries(items) {
        var keep = Object.keys(items).sort(function (left, right) { return items[right].updatedAt - items[left].updatedAt; }).slice(0, maxTitles);
        var bounded = {};
        keep.forEach(function (id) { bounded[id] = items[id]; });
        write(choicesKey, JSON.stringify({version: 1, items: bounded}));
    }

    function saved(card) {
        var id = cardId(card);
        return id ? entries()[id] || null : null;
    }

    function nextTime(items) {
        var latest = Date.now() - 1;
        Object.keys(items).forEach(function (id) { latest = Math.max(latest, items[id].updatedAt); });
        return latest + 1;
    }

    function remember(card, group) {
        var id = cardId(card);
        var voice = name(group && group.title);
        var provider = source(group);
        if (!id || !voice) return null;
        var items = entries();
        var previous = items[id];
        if (previous && previous.voice === voice && previous.source === provider) return previous;
        var entry = {voice: voice, source: provider, updatedAt: nextTime(items)};
        items[id] = entry;
        saveEntries(items);
        return entry;
    }

    // Compatibility for a mixed cached source-loader: old callers must not
    // silently create another per-title application override.
    function rememberTarget(card) { return saved(card); }

    function target(card, fallback) {
        return validTarget(fallback) || validTarget(read('yani_playback_target', 'ask')) || 'ask';
    }

    function reset(card) {
        var id = cardId(card);
        var items = entries();
        if (id && Object.prototype.hasOwnProperty.call(items, id)) {
            delete items[id];
            saveEntries(items);
        }
    }

    function hasRequest(request) {
        return Boolean(request && (normalizeVoice(request.voice) || request.source && request.source !== 'auto'));
    }

    function byRequest(groups, request, allowSourceOnly) {
        var voice = normalizeVoice(request && request.voice);
        var provider = request && request.source !== 'auto' ? source(request.source || '') : '';
        var named = voice ? groups.filter(function (group) { return normalizeVoice(group.title) === voice; }) : groups;
        var exact = provider ? named.filter(function (group) { return source(group) === provider; })[0] : named[0];
        if (exact) return {group: exact, unavailable: false};
        if (voice && named.length) return {group: named[0], unavailable: Boolean(provider)};
        if (provider && allowSourceOnly) {
            var matchingSource = groups.filter(function (group) { return source(group) === provider; })[0];
            if (matchingSource) return {group: matchingSource, unavailable: Boolean(voice)};
        }
        return null;
    }

    function fromHistory(groups, playback) {
        if (!playback) return null;
        var videoId = playback.video_id === undefined || playback.video_id === null ? '' : String(playback.video_id);
        if (videoId) {
            var matchingVideo = groups.filter(function (group) {
                return (group.videos || []).some(function (video) { return String(video.video_id || video.id || '') === videoId; });
            })[0];
            if (matchingVideo) return matchingVideo;
        }
        // A provider alone does not identify the dub. In particular, several
        // unrelated voices can all come from Kodik.
        if (!normalizeVoice(playback.voice)) return null;
        var choice = byRequest(groups, {voice: playback.voice, source: playback.player || 'auto'}, false);
        return choice && choice.group || null;
    }

    function resolve(card, groups, playback, legacySource) {
        groups = (groups || []).filter(function (group) { return Boolean(group && typeof group === 'object'); });
        var anime = saved(card);
        var global = defaults();
        var requested = hasRequest(anime) ? {voice: anime.voice, source: anime.source || 'auto'}
            : hasRequest(global) ? {voice: global.voice, source: global.source} : null;
        var unavailable = false;
        if (hasRequest(anime)) {
            var own = byRequest(groups, anime, false);
            if (own) return {group: own.group, origin: 'anime', unavailable: own.unavailable, requested: requested};
            unavailable = true;
        }
        // A watched video identifies a title-specific dubbing/provider pair in
        // the account history. Recover that exact pair before defaults for a
        // new device, without writing a fake watch to save a mere selection.
        if (!hasRequest(anime) && playback && playback.video_id) {
            var exactHistory = fromHistory(groups, {video_id: playback.video_id});
            if (exactHistory) return {group: exactHistory, origin: 'history', unavailable: false, requested: null};
        }
        if (hasRequest(global)) {
            var configured = byRequest(groups, global, true);
            if (configured) return {group: configured.group, origin: 'default', unavailable: unavailable || configured.unavailable, requested: requested};
            unavailable = true;
        }
        var history = fromHistory(groups, playback);
        if (history) return {group: history, origin: 'history', unavailable: unavailable, requested: requested};
        var legacy = legacySource ? byRequest(groups, {voice: '', source: source(legacySource)}, true) : null;
        return {group: legacy && legacy.group || groups[0] || null, origin: 'auto', unavailable: unavailable || Boolean(requested && !groups.length), requested: requested};
    }

    window.LampaYaniPlaybackPreferences = {
        normalizeVoice: normalizeVoice,
        source: source,
        defaults: defaults,
        setDefaults: setDefaults,
        observe: observe,
        knownVoices: knownVoices,
        saved: saved,
        remember: remember,
        rememberTarget: rememberTarget,
        target: target,
        reset: reset,
        resolve: resolve
    };
}(window));

(function (window) {
    'use strict';

    // Supply native Player.playlist entries; Lampa owns selection, teardown,
    // continue_play and video parameters. Only resolve source pages here.
    function create(options) {
        options = options || {};
        var videos = options.videos || [];
        var selected = options.selected;
        var currentVideo = selected;
        var currentItem = null;
        var items = [];
        var active = true;
        var pending = null;
        var sequence = 0;

        function valid() {
            return active && (!options.valid || options.valid() !== false);
        }
        function fail(error, request) {
            if (pending !== request) return;
            pending = null;
            if (!valid()) return;
            active = false;
            if (options.onError) options.onError(error);
        }
        function rearm(item) {
            item.url = item.yaniResolve;
            delete item.quality;
        }
        videos.forEach(function (video, index) {
            var item = {
                title: options.title ? options.title(video) : String(video.number || index + 1),
                episode: options.episode ? options.episode(video) : String(video.number || index + 1),
                season: 0
            };
            function resolve(call) {
                if (!valid() || pending) return;
                var request = {sequence: ++sequence, item: item};
                pending = request;
                Promise.resolve().then(function () {
                    if (!valid() || pending !== request) return null;
                    return options.resolve(video);
                }).then(function (normalized) {
                    if (!valid() || pending !== request) return;
                    if (!normalized || typeof normalized.url !== 'string' || !normalized.url) throw new Error('No direct episode stream');
                    if (options.beforeSelect) options.beforeSelect(video, item);
                    if (!valid() || pending !== request) return;
                    // Never call the native continuation with an embed URL or a
                    // function. Player.play keeps this very object as its work.
                    Object.assign(item, normalized);
                    item.url = normalized.url;
                    call();
                }).catch(function (error) { fail(error, request); });
            }
            // Store the lazy hook separately: native play may change item.url
            // when quality changes, while the active item's URL must stay text.
            item.yaniResolve = resolve;
            item.callback = function () {
                if (!valid()) return;
                var previousItem = currentItem;
                currentItem = item;
                currentVideo = video;
                pending = null;
                if (previousItem && previousItem !== item) rearm(previousItem);
                if (options.onSelect) options.onSelect(video, item);
            };
            if (video === selected) {
                Object.assign(item, options.current);
                currentItem = item;
            } else item.url = resolve;
            items.push(item);
        });
        if (!currentItem || typeof currentItem.url !== 'string') return null;
        return {
            items: items,
            current: currentItem,
            pending: function () { return Boolean(pending); },
            selected: function () { return currentVideo; },
            destroy: function () { active = false; pending = null; }
        };
    }

    window.LampaYaniNativePlaylist = {create: create};
})(window);

(function (window) {
    'use strict';

    var active = null;

    // The native panel persists between launches. Own one small group, without
    // changing its playlist, global auto-next preference, or other plugins.
    function bind(options) {
        options = options || {};
        if (active) active.destroy();
        var $ = window.$;
        var lampa = window.Lampa;
        if (!$ || !lampa) return null;
        var context = options.context || {};
        var selected = options.selected || context.selected;
        var items = options.items || (context.videos || []).map(function (video) {
            return {video: video, label: String(video.number || video.index || '?')};
        });
        var position = -1;
        for (var index = 0; index < items.length; index++) {
            if (items[index].video === selected) { position = index; break; }
        }
        if (position < 0 || items.length < 2) return null;
        var destroyed = false;
        var busy = false;
        var busyFocus = null;
        var lastActionAt = -Infinity;
        function valid() {
            if (destroyed) return false;
            try { return !options.valid || options.valid() !== false; } catch (ignore) { return false; }
        }
        if (!valid()) return null;

        var panel;
        try {
            if (lampa.PlayerPanel && lampa.PlayerPanel.render) panel = $(lampa.PlayerPanel.render());
        } catch (ignorePanel) {}
        var anchor = panel && panel.find('.player-panel__left').first();
        if (!anchor || !anchor.length) {
            var document = window.document;
            var node = document && document.querySelector && document.querySelector('.player .player-panel__left');
            if (node) anchor = $(node);
        }
        if (!anchor || !anchor.length) return null;

        function text(key, fallback) {
            var value;
            try { value = options.t && options.t(key); } catch (ignore) {}
            return value && value !== key ? String(value) : fallback;
        }
        var group = $('<div class="player-panel__box-buttons yani-player-episodes" role="group"></div>');
        group.attr('aria-label', text('episodes', 'Серии'));
        var controls = [];
        var handle;

        function registerSelectors() {
            var controller = lampa.Controller;
            try {
                var enabled = controller && controller.enabled && controller.enabled();
                if (enabled && enabled.name === 'player_panel' && controller.collectionAppend) {
                    controls.forEach(function (control) {
                        if (control.button.hasClass('selector')) controller.collectionAppend(control.button[0]);
                    });
                }
            } catch (ignoreController) {}
        }
        function paint() {
            var allowed = valid() && !busy;
            controls.forEach(function (control) {
                var disabled = !allowed || !control.item;
                control.button.toggleClass('selector', !disabled)
                    .toggleClass('yani-player-episode--disabled', disabled)
                    .attr('aria-disabled', disabled ? 'true' : 'false');
                if (disabled) control.button.removeClass('focus hover');
            });
            group.attr('aria-busy', busy ? 'true' : 'false');
        }
        function setBusy(value) {
            if (destroyed) return;
            var wasBusy = busy;
            busy = Boolean(value);
            if (busy && !wasBusy) {
                busyFocus = null;
                controls.some(function (control) {
                    if (control.button.hasClass('focus')) { busyFocus = control; return true; }
                    return false;
                });
            }
            paint();
            if (wasBusy && !busy) {
                registerSelectors();
                // Restore only our own failed action, while the user has stayed
                // in this panel and has not moved focus to another control.
                var controller = lampa.Controller;
                try {
                    var enabled = controller && controller.enabled && controller.enabled();
                    var focusRoot = panel || anchor;
                    if (busyFocus && valid() && enabled && enabled.name === 'player_panel' &&
                        !focusRoot.find('.focus').length && controller.collectionFocus) {
                        controller.collectionFocus(busyFocus.button[0], focusRoot);
                    }
                } catch (ignoreFocus) {}
                busyFocus = null;
            }
        }
        function activate(control, event) {
            if (event && event.preventDefault) event.preventDefault();
            if (event && event.stopPropagation) event.stopPropagation();
            if (!valid() || busy || !control.item) return;
            // Some hosts synthesize hover:enter immediately after a mouse click.
            var now = Date.now();
            if (now - lastActionAt < 300) return;
            lastActionAt = now;
            setBusy(true);
            try {
                var result = options.onSelect ? options.onSelect(control.item.video) : false;
                if (result === false) setBusy(false);
                else if (result && typeof result.then === 'function') {
                    result.then(function (value) { if (value === false) setBusy(false); }, function () { setBusy(false); });
                }
            } catch (ignoreSelect) { setBusy(false); }
        }
        function add(direction, targetIndex) {
            var previous = direction === 'previous';
            var item = items[targetIndex] || null;
            var action = text(previous ? 'player_previous_episode' : 'player_next_episode', previous ? 'Предыдущая серия' : 'Следующая серия');
            var label = item ? String(item.label === undefined ? item.video.number || item.video.index || '?' : item.label) : '—';
            var button = $('<div class="button yani-player-episode yani-player-episode--' + direction + '" role="button"></div>');
            button.attr('data-yani-direction', direction).attr('aria-label', action + (item ? ': ' + label : '')).attr('title', action + (item ? ': ' + label : ''));
            var path = previous ? 'M5 5h2v14H5zM19 5v14L9 12z' : 'M17 5h2v14h-2zM5 5l10 7-10 7z';
            button.append('<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="' + path + '"></path></svg>');
            button.append($('<span class="yani-player-episode__label"></span>').text(label));
            button.append($('<div class="tooltip"></div>').text(action));
            var control = {button: button, item: item};
            control.handler = function (event) { activate(control, event); };
            button.on('click', control.handler).on('hover:enter', control.handler);
            controls.push(control);
            group.append(button);
        }
        add('previous', position - 1);
        add('next', position + 1);
        handle = {
            setBusy: setBusy,
            destroy: function () {
                if (destroyed) return;
                destroyed = true;
                controls.forEach(function (control) {
                    control.button.off('click', control.handler).off('hover:enter', control.handler);
                });
                group.remove();
                if (active === handle) active = null;
            }
        };
        active = handle;
        paint();
        anchor.append(group);
        registerSelectors();
        return handle;
    }

    window.LampaYaniPlayerEpisodes = {bind: bind};
})(window);

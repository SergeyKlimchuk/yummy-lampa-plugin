(function (window) {
    'use strict';

    var active = null;
    var controllerName = 'yani_choice_panel';
    var pageSize = 30;

    function translate(key) {
        return window.LampaYaniI18n && window.LampaYaniI18n.t ? window.LampaYaniI18n.t(key) : key;
    }

    function element(value) { return value && value.jquery ? value[0] : value && value.nodeType ? value : null; }
    function live(node) {
        if (!node) return false;
        if (node.isConnected !== undefined) return node.isConnected;
        return Boolean(window.document && document.documentElement && document.documentElement.contains(node));
    }
    function activity() {
        return window.Lampa && Lampa.Activity && Lampa.Activity.active ? Lampa.Activity.active() : null;
    }
    function captureOwner() {
        var progress = window.LampaYaniEpisodeProgress;
        if (progress && progress.owner && progress.sameOwner) return {progress: progress, value: progress.owner()};
        var auth = window.LampaYaniAuth;
        var account = auth && auth.get ? auth.get() || {} : {};
        var token = auth && auth.token ? auth.token() || '' : '';
        return {authorized: Boolean(token), id: String(account.user_id || account.id || ''), login: String(account.login || account.email || '').toLowerCase(), token: token};
    }
    function sameOwner(owner) {
        if (owner.progress) return owner.progress.sameOwner(owner.value, owner.progress.owner());
        var current = captureOwner();
        if (current.progress) return false;
        if (owner.authorized !== current.authorized) return false;
        if (!owner.authorized) return true;
        if (owner.id && current.id) return owner.id === current.id;
        if (owner.login && current.login) return owner.login === current.login;
        return owner.token === current.token;
    }
    function poster(value) {
        if (window.LampaYaniUiUtils && window.LampaYaniUiUtils.posterUrl) value = window.LampaYaniUiUtils.posterUrl(value);
        if (value && typeof value === 'object') value = value.huge || value.big || value.medium || value.small;
        value = String(value || '');
        return /^(https?:\/\/|\/\/|\.?\.?\/|data:image\/)/i.test(value) ? value : '';
    }
    function stop(event) {
        if (!event) return;
        if (event.preventDefault) event.preventDefault();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        else if (event.stopPropagation) event.stopPropagation();
    }

    function show(options) {
        options = options || {};
        if (!window.Lampa || !Lampa.Scroll || !Lampa.Controller || !window.$) return null;
        if (active) active.close({reason: 'replace', notify: false});
        var root = $('<div class="yani-choice-panel yani-lite-view"></div>');
        var surface = $('<div class="yani-choice-panel__surface" role="dialog" aria-modal="true" aria-labelledby="yani-choice-panel-title"></div>');
        var list = $('<div class="yani-choice-panel__options"></div>');
        var pager = $('<div class="yani-choice-panel__pager"></div>');
        var scroll = new Lampa.Scroll({mask: false, over: true, step: 200, notransition: true});
        var owner = captureOwner(), originActivity = activity();
        var enabled = Lampa.Controller.enabled ? Lampa.Controller.enabled() || {} : {};
        var origin = element(options.origin);
        var collection = options.collection && options.collection.jquery ? options.collection : options.collection ? $(options.collection) : origin ? $(origin).closest('.scroll, [data-yani-navigation-scope], .yani-home') : $();
        var previousController = enabled.name || 'content';
        var items = (Array.isArray(options.items) ? options.items : []).filter(Boolean).slice();
        var selected = 0, page = 0, controls = [], last = null, lastPosition = 0, closed = false, windowEntry = null;
        items.some(function (item, index) { if (item.selected || item.checked) { selected = index; return true; } return false; });
        page = Math.floor(selected / pageSize);
        if (scroll.minus) scroll.minus();

        function valid() {
            if (closed || originActivity !== activity() || !sameOwner(owner)) return false;
            try { return !options.valid || Boolean(options.valid()); } catch (error) { return false; }
        }
        function ownedController() {
            var current = Lampa.Controller.enabled ? Lampa.Controller.enabled() || {} : {};
            return current.name === controllerName;
        }
        function focus(target) {
            if (!valid() || !ownedController()) return;
            var node = element(target) || target || controls[0];
            if (!node) return;
            last = node;
            lastPosition = Math.max(0, controls.indexOf(node));
            Lampa.Controller.collectionSet(scroll.render());
            if (window.Navigator && Navigator.add) Navigator.add(node);
            Lampa.Controller.collectionFocus(node, scroll.render(), true);
            if (scroll.update) scroll.update($(node), true);
        }
        function restore() {
            Lampa.Controller.toggle(previousController);
            if (collection && collection.length && live(collection[0])) Lampa.Controller.collectionSet(collection);
            if (live(origin)) {
                if (window.Navigator && Navigator.add) Navigator.add(origin);
                Lampa.Controller.collectionFocus(origin, collection && collection.length ? collection : undefined, true);
            }
        }
        function dismiss(reason, selectedItem, settings) {
            if (closed) return;
            settings = settings || {};
            var allowed = valid();
            var shouldRestore = settings.restore !== false && allowed && ownedController();
            var onClose = options.onClose, onSelect = options.onSelect, onBack = options.onBack;
            closed = true;
            if (active === api) active = null;
            if (windowEntry && Lampa.Controller.windowClose) Lampa.Controller.windowClose(windowEntry, true);
            root.remove();
            if (scroll.destroy) scroll.destroy();
            if (shouldRestore) restore();
            root = null; surface = null; list = null; pager = null; scroll = null;
            items = []; controls = []; last = null; origin = null; collection = null; owner = null; originActivity = null; options = {};
            if (onClose) onClose(reason);
            if (!allowed) return;
            if (reason === 'select' && onSelect) onSelect(selectedItem);
            else if (reason === 'back' && settings.notify !== false && onBack) onBack();
        }
        function choose(item) {
            if (!valid()) { dismiss('invalid', null, {restore: false, notify: false}); return; }
            dismiss('select', item);
        }
        function bind(node, handler) {
            controls.push(node[0]);
            node.on('hover:focus', function (event) {
                if (!valid()) return;
                last = event.currentTarget || node[0];
                lastPosition = Math.max(0, controls.indexOf(last));
                if (scroll.update) scroll.update($(last), true);
            });
            node.on('hover:enter click.yaniChoice', function (event) { stop(event); if (valid()) handler(); else dismiss('invalid', null, {restore: false, notify: false}); });
            return node;
        }
        function draw(preferred) {
            if (!valid()) return;
            list.empty(); pager.empty(); controls = []; last = null;
            var first = page * pageSize, slice = items.slice(first, first + pageSize);
            var target = null;
            slice.forEach(function (item, offset) {
                var index = first + offset;
                var row = $('<div class="yani-choice-panel__option selector" role="button"></div>').attr('data-yani-choice-key', String(item.key !== undefined ? item.key : index));
                var selectedValue = item.selected !== undefined ? item.selected : item.checked;
                row.append($('<div class="yani-choice-panel__option-copy"></div>').append($('<div class="yani-choice-panel__option-title"></div>').text(item.title || item.name || '')));
                if (item.subtitle || item.description) row.find('.yani-choice-panel__option-copy').append($('<div class="yani-choice-panel__option-subtitle"></div>').text(item.subtitle || item.description));
                if (selectedValue !== undefined) {
                    row.attr('aria-pressed', String(Boolean(selectedValue))).toggleClass('is-selected', Boolean(selectedValue));
                    row.append($('<span class="yani-choice-panel__check" aria-hidden="true"></span>').text(selectedValue ? '✓' : ''));
                }
                bind(row, function () { choose(item); });
                list.append(row);
                if (index === preferred) target = row[0];
            });
            if (!items.length) list.append($('<div class="yani-choice-panel__empty"></div>').text(translate('choice_empty')));
            var pages = Math.ceil(items.length / pageSize);
            if (pages > 1) {
                if (page > 0) pager.append(bind($('<div class="yani-choice-panel__page selector" role="button"></div>').text('‹ ' + translate('choice_previous')), function () { page -= 1; draw(page * pageSize); }));
                pager.append($('<span class="yani-choice-panel__page-count"></span>').text((page + 1) + ' / ' + pages));
                if (page + 1 < pages) pager.append(bind($('<div class="yani-choice-panel__page selector" role="button"></div>').text(translate('choice_next') + ' ›'), function () { page += 1; draw(page * pageSize); }));
            }
            focus(target || controls[0]);
        }
        function move(delta) {
            if (!valid()) { dismiss('invalid', null, {restore: false, notify: false}); return; }
            if (!controls.length) return;
            var position = controls.indexOf(last);
            if (position < 0) position = lastPosition;
            focus(controls[Math.max(0, Math.min(controls.length - 1, position + delta))]);
        }
        var api = {
            close: function (settings) { settings = settings || {}; dismiss(settings.reason || 'back', null, settings); },
            destroy: function () { dismiss('destroy', null, {restore: false, notify: false}); },
            render: function (js) { return root ? js ? root[0] : root : js ? null : $(); }
        };
        if (!valid()) { dismiss('invalid', null, {restore: false, notify: false}); return null; }
        active = api;
        root.toggleClass('yani-choice-panel--compact', options.compact === true || options.compact !== false && items.length <= 6);
        surface.append($('<div class="yani-choice-panel__title" id="yani-choice-panel-title" role="heading" aria-level="2"></div>').text(options.title || ''));
        var context = options.context || {};
        if (context.title || context.poster) {
            var contextNode = $('<div class="yani-choice-panel__context"></div>');
            var image = poster(context.poster);
            if (image) contextNode.append($('<img alt="" decoding="async">').attr('src', image));
            if (context.title) contextNode.append($('<div class="yani-choice-panel__context-title"></div>').text(context.title));
            surface.append(contextNode);
        }
        if (options.description) surface.append($('<div class="yani-choice-panel__description"></div>').text(options.description));
        scroll.append(list); surface.append(scroll.render(true), pager);
        surface.append($('<div class="yani-choice-panel__footer"></div>').append($('<span class="yani-choice-panel__back-key"></span>').text(translate('choice_back'))));
        root.append(surface).on('click.yaniChoiceBackdrop', function (event) { if (event.target === root[0]) dismiss('back'); });
        $(document.body).append(root);
        if (Lampa.Controller.windowOpen) windowEntry = Lampa.Controller.windowOpen(controllerName, valid);
        Lampa.Controller.add(controllerName, {
            toggle: function () { if (valid()) focus(last || controls[lastPosition] || controls[0]); },
            up: function () { move(-1); }, down: function () { move(1); },
            left: function () {}, right: function () {},
            back: function () { dismiss('back'); }
        });
        Lampa.Controller.toggle(controllerName);
        draw(selected);
        return api;
    }

    window.LampaYani = window.LampaYani || {};
    window.LampaYani.ChoicePanel = window.LampaYaniChoicePanel = {show: show};
}(window));

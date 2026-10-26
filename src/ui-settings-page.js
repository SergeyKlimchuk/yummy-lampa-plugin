(function (window) {
    'use strict';

    var serial = 0;
    var sections = {
        yani_account_title: 'account', yani_interface_title: 'interface',
        yani_playback_title: 'playback', yani_display_sources_title: 'playback',
        yani_playback_services_title: 'playback', yani_lampa_card_title: 'interface',
        yani_home_sections_title: 'interface', yani_build_title: 'build', yani_about_title: 'build'
    };
    function groupDefinitions(definitions) {
        var groups = {playback: [], interface: [], account: [], build: []}, current = 'playback';
        (definitions || []).forEach(function (definition) {
            if (!definition || !definition.param) return;
            if (sections[definition.param.name]) current = sections[definition.param.name];
            groups[current].push(definition);
        });
        return groups;
    }

    function create(object, deps) {
        object = object || {}; deps = deps || {};
        var t = deps.t || function (key) { return key; };
        var Lampa = window.Lampa, $ = window.$;
        var root = $('<div class="yani-settings yani-lite-view"></div>');
        var header = $('<div class="yani-settings__header"></div>');
        var tabs = $('<div class="yani-settings__tabs" role="group"></div>');
        var body = $('<div class="yani-settings__body"></div>');
        var scroll = new Lampa.Scroll({mask: false, over: true, step: 250, notransition: true});
        var content = $('<div class="yani-settings__content"></div>');
        var labels = {playback: 'settings_playback_section', interface: 'settings_interface_section', account: 'settings_account_section', build: 'settings_build_section'};
        var groups = {}, group = Object.prototype.hasOwnProperty.call(labels, object.group) ? object.group : 'playback';
        var tabNodes = [], rowNodes = [], rowDefinitions = [], active = false, destroyed = false, panel = null;
        var lastKey = 'tab:' + group, events = {}, namespace = '.yaniSettings' + (++serial), component = {};
        if (scroll.minus) scroll.minus();
        function emit(name, value) { (events[name] || []).slice().forEach(function (callback) { callback(value); }); }
        component.on = function (name, callback) { (events[name] || (events[name] = [])).push(callback); };
        function read(param) {
            return Lampa.Storage && Lampa.Storage.get ? Lampa.Storage.get(param.name, param.default) : param.default;
        }
        function enabled(value) { return value === true || value === 'true' || value === 1 || value === '1'; }
        function text(key, fallback) { var value = t(key); return value && value !== key ? value : fallback; }
        function focus(value) {
            if (!active || destroyed || !value) return;
            var node = value.jquery ? value[0] : value;
            Lampa.Controller.collectionSet(root);
            if (window.Navigator && Navigator.add) Navigator.add(node);
            Lampa.Controller.collectionFocus(node, root, true);
            if ($.contains(content[0], node) && scroll.update) scroll.update($(node), true);
        }
        function target() {
            var result = null;
            tabNodes.concat(rowNodes).some(function (row) { if (row.attr('data-yani-settings-key') === lastKey) { result = row; return true; } return false; });
            return result || rowNodes[0] || tabNodes[0];
        }
        function renderValue(row, definition) {
            var param = definition.param, field = definition.field || {};
            row.find('.settings-param__name').text(field.name || '');
            row.find('.settings-param__descr').text(field.description || '');
            var value = row.find('.settings-param__value');
            if (param.type === 'trigger') {
                value.text(enabled(read(param)) ? text('settings_enabled', 'Включено') : text('settings_disabled', 'Выключено'));
                row.attr('aria-pressed', String(enabled(read(param))));
            } else if (param.type === 'select') {
                var stored = read(param), values = param.values || {};
                value.text(Object.prototype.hasOwnProperty.call(values, stored) ? String(values[stored]) : stored === undefined || stored === null ? '—' : String(stored));
            }
            // The native Settings definition owns dynamic descriptions/values
            // (account state, known voices, auto scale). Reuse it unchanged.
            if (definition.onRender) definition.onRender(row);
            if (param.type === 'select') {
                var current = read(param), updated = param.values || {};
                value.text(Object.prototype.hasOwnProperty.call(updated, current) ? String(updated[current]) : current === undefined || current === null ? '—' : String(current));
            }
        }
        function refreshValues() { rowDefinitions.forEach(function (definition, index) { renderValue(rowNodes[index], definition); }); }
        function closePanel() { if (panel) panel.destroy(); panel = null; }
        function applyValue(definition, row, value) {
            if (!active || destroyed) return;
            if (Lampa.Storage && Lampa.Storage.set) Lampa.Storage.set(definition.param.name, value);
            if (definition.onChange) definition.onChange(value);
            if (!destroyed) renderValue(row, definition);
        }
        function activate(row, definition) {
            if (!active || destroyed) return;
            var param = definition.param;
            lastKey = param.name;
            if (param.type === 'button') {
                if (definition.onChange) definition.onChange();
                if (!destroyed) renderValue(row, definition);
                return;
            }
            var items;
            if (param.type === 'trigger') items = [true, false].map(function (value) { return {key: String(value), value: value, title: value ? text('settings_enabled', 'Включено') : text('settings_disabled', 'Выключено'), selected: value === enabled(read(param))}; });
            else if (param.type === 'select') items = Object.keys(param.values || {}).sort(function (a, b) { return a === 'auto' ? -1 : b === 'auto' ? 1 : 0; }).map(function (value) { return {key: value, value: value, title: String(param.values[value]), selected: String(value) === String(read(param))}; });
            else return;
            var options = {title: definition.field && definition.field.name || '', description: definition.field && definition.field.description || '', origin: row, collection: root, items: items, compact: items.length <= 6,
                valid: function () { return active && !destroyed; }, onClose: function () { panel = null; }, onSelect: function (item) { applyValue(definition, row, item.value); }};
            if (window.LampaYaniChoicePanel) panel = window.LampaYaniChoicePanel.show(options);
            else if (deps.showSelect) deps.showSelect(options);
            else if (Lampa.Select) Lampa.Select.show(options);
        }
        function buildRows() {
            closePanel(); content.empty(); rowNodes = []; rowDefinitions = [];
            var section = content;
            (groups[group] || []).forEach(function (definition) {
                var param = definition.param, field = definition.field || {};
                if (param.type === 'title') {
                    if (sections[param.name]) {
                        section = $('<section class="yani-settings__section"></section>');
                        section.append($('<h2 class="yani-settings__section-title"></h2>').text(field.name || ''));
                        if (field.description) section.append($('<p class="yani-settings__section-description"></p>').text(field.description));
                        content.append(section);
                    } else section.append($('<div class="yani-settings__static"></div>').text(field.name || ''));
                    return;
                }
                var supported = param.type === 'button' || param.type === 'select' || param.type === 'trigger';
                var row = $('<div class="settings-param yani-settings__row"></div>').attr('data-yani-settings-key', param.name);
                row.append($('<div class="settings-param__copy"></div>').append($('<div class="settings-param__name"></div>'), $('<div class="settings-param__descr"></div>')), $('<div class="settings-param__value"></div>'));
                if (supported) row.addClass('selector').attr('role', 'button').on('hover:enter click' + namespace, function (event) { if (event.preventDefault) event.preventDefault(); if (event.stopImmediatePropagation) event.stopImmediatePropagation(); activate(row, definition); });
                row.on('hover:focus' + namespace, function () { lastKey = param.name; if (scroll.update) scroll.update(row, true); });
                rowNodes.push(row); rowDefinitions.push(definition); section.append(row); renderValue(row, definition);
            });
            tabNodes.forEach(function (tab) { var selected = tab.attr('data-yani-settings-key') === 'tab:' + group; tab.toggleClass('is-selected', selected).attr('aria-pressed', String(selected)); });
            if (scroll.reset) scroll.reset();
        }
        Object.keys(labels).forEach(function (key) {
            var tab = $('<div class="yani-settings__tab selector" role="button"></div>').attr('data-yani-settings-key', 'tab:' + key).text(t(labels[key]));
            tab.on('hover:focus' + namespace, function () { lastKey = 'tab:' + key; });
            tab.on('hover:enter click' + namespace, function (event) { if (event.preventDefault) event.preventDefault(); if (event.stopImmediatePropagation) event.stopImmediatePropagation(); if (!active || destroyed) return; group = key; lastKey = 'tab:' + key; buildRows(); focus(tab); });
            tabNodes.push(tab); tabs.append(tab);
        });
        header.append($('<h1 class="yani-settings__title"></h1>').text(t('settings') + ' YummyAnime'), tabs);
        scroll.append(content); body.append(scroll.render()); root.append(header, body);
        component.create = function () {
            groups = groupDefinitions(typeof deps.definitions === 'function' ? deps.definitions() : deps.definitions || []);
            buildRows();
            if (component.activity && component.activity.loader) component.activity.loader(false);
        };
        component.render = function (js) { return js ? root[0] : root; };
        component.start = function () {
            if (destroyed) return; active = true; refreshValues();
            var controller = {
                toggle: function () { focus(target()); },
                up: function () { if (window.Navigator && Navigator.canmove('up')) Navigator.move('up'); else focus(tabNodes.filter(function (tab) { return tab.attr('data-yani-settings-key') === 'tab:' + group; })[0]); },
                down: function () { if (window.Navigator && Navigator.canmove('down')) Navigator.move('down'); },
                left: function () { if (window.Navigator && Navigator.canmove('left')) Navigator.move('left'); else Lampa.Controller.toggle('menu'); },
                right: function () { if (window.Navigator && Navigator.canmove('right')) Navigator.move('right'); },
                back: function () { if (deps.goBack) deps.goBack(); else Lampa.Activity.backward(); }
            };
            Lampa.Controller.add('content', controller); Lampa.Controller.toggle('content'); emit('controller', controller);
        };
        component.pause = component.stop = function () { active = false; closePanel(); };
        component.destroy = function () { if (destroyed) return; destroyed = true; active = false; closePanel(); root.off(namespace); scroll.destroy(); root.remove(); rowNodes = []; rowDefinitions = []; tabNodes = []; groups = {}; events = {}; };
        return component;
    }
    window.LampaYaniSettingsPage = {create: create, groupDefinitions: groupDefinitions};
}(window));

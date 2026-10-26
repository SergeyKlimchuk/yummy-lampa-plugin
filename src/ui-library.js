(function (window) {
    'use strict';
    var sequence = 0;
    function create(object, deps) {
        object = object || {}; deps = deps || {};
        var t = deps.t || function (key) { return key; };
        var definitions = typeof deps.definitions === 'function' ? deps.definitions() : deps.definitions || [];
        definitions = [{id: -1, key: 'all', title: t('library_all')}].concat(definitions);
        var root = $('<div class="yani-library yani-lite-view"></div>');
        var header = $('<div class="yani-library__header"></div>');
        var title = $('<h1 class="yani-library__title"></h1>').text(t('user_lists'));
        var tabs = $('<div class="yani-library__tabs" role="group"></div>');
        var sortButton = $('<div class="yani-library__sort selector" role="button"></div>');
        var status = $('<div class="yani-library__status" aria-live="polite"></div>');
        var body = $('<div class="yani-library__body"></div>');
        var pager = $('<div class="yani-library__pager"></div>');
        var tabButtons = [], pagerButtons = [], native = null, records = [], page = 1, pageSize = 30, loaded = false;
        var selected = definitions.filter(function (entry) { return object.definition && Number(entry.id) === Number(object.definition.id); })[0] || definitions[0];
        var wanted = selected, generation = 0, destroyed = false, active = false, refreshNeeded = false, pending = false, pendingCommit = null, lastCard = null, panel = null;
        var controllerName = 'yani_library_tabs', pagerController = 'yani_library_pager', events = {}, lastPager = 0, eventName = '.yaniLibrary' + (++sequence), ownedController = null, originalUp = null, originalDown = null, originalToggle = null, tabPosition = Math.max(0, definitions.indexOf(selected));
        var sorts = ['recent', 'progress', 'rating', 'year', 'title'];
        var sortKey = String(Lampa.Storage && Lampa.Storage.get ? Lampa.Storage.get('yani_library_sort', 'recent') : 'recent');
        if (sorts.indexOf(sortKey) < 0) sortKey = 'recent';
        var auth = window.LampaYaniAuth, initial = auth && auth.get ? auth.get() || {} : {};
        var owner = {id: String(initial.user_id || initial.id || ''), login: String(initial.login || ''), token: auth && auth.token ? auth.token() || '' : ''};
        var component = {scroll: null, on: function (name, callback) { (events[name] || (events[name] = [])).push(callback); }};
        function ownsAccount() {
            if (!auth || !auth.token) return true;
            var current = auth.get ? auth.get() || {} : {}, token = auth.token() || '', id = String(current.user_id || current.id || ''), login = String(current.login || '');
            if (Boolean(owner.token) !== Boolean(token)) return false;
            return owner.id && id ? owner.id === id : owner.login && login ? owner.login === login : owner.token === token;
        }
        function current() { return !destroyed && ownsAccount(); }
        function node(value) { return value && value.jquery ? value[0] : value; }
        function cards() { return body.find('.card.selector'); }
        function focusedCard() { var value = cards().filter('.focus').first(); return value.length ? value[0] : null; }
        function firstCard() { return cards()[0] || null; }
        function focus(value, collection) {
            if (!current() || !active || !value) return;
            if (window.Navigator && Navigator.add) Navigator.add(node(value));
            Lampa.Controller.collectionSet(collection || root);
            Lampa.Controller.collectionFocus(node(value), collection || root, true);
        }
        function releaseController() {
            if (ownedController && ownedController.up === upFromGrid) ownedController.up = originalUp;
            if (ownedController && ownedController.down === downFromGrid) ownedController.down = originalDown;
            if (ownedController && ownedController.toggle === toggleFromGrid) ownedController.toggle = originalToggle;
            ownedController = null; originalUp = null; originalDown = null; originalToggle = null;
        }
        function firstRow(value) {
            var first = firstCard();
            if (!value || !first || !value.getBoundingClientRect || !first.getBoundingClientRect) return value === first;
            var rect = value.getBoundingClientRect(), top = first.getBoundingClientRect().top;
            return rect.top <= top + Math.max(8, rect.height * .25);
        }
        function focusTabs(position) {
            lastCard = focusedCard() || lastCard;
            tabPosition = Math.max(0, Math.min(tabButtons.length, position === undefined ? definitions.indexOf(selected) : position));
            Lampa.Controller.toggle(controllerName);
        }
        function upFromGrid() {
            if (firstRow(focusedCard() || lastCard)) focusTabs();
            else if (originalUp) originalUp.apply(this, arguments);
        }
        function lastRow(value) {
            var all = cards(), last = all[all.length - 1];
            if (!value || !last || !value.getBoundingClientRect || !last.getBoundingClientRect) return value === last;
            var rect = value.getBoundingClientRect(), bottom = last.getBoundingClientRect().bottom;
            return rect.bottom >= bottom - Math.max(8, rect.height * .25);
        }
        function downFromGrid() {
            if (pagerButtons.length && lastRow(focusedCard() || lastCard)) { lastCard = focusedCard() || lastCard; Lampa.Controller.toggle(pagerController); }
            else if (originalDown) originalDown.apply(this, arguments);
        }
        function toggleFromGrid() {
            if (pendingCommit && current() && active) { commit(pendingCommit); return; }
            if (originalToggle) originalToggle.apply(this, arguments);
        }
        function installController() {
            releaseController();
            var enabled = Lampa.Controller.enabled ? Lampa.Controller.enabled() || {} : {};
            var control = enabled.controller;
            if (enabled.name === 'content' && control) { ownedController = control; originalUp = control.up; originalDown = control.down; originalToggle = control.toggle; control.toggle = toggleFromGrid; control.up = upFromGrid; control.down = downFromGrid; (events.controller || []).forEach(function (callback) { callback(control); }); }
        }
        function startGrid(target) {
            if (!current() || !active) return;
            if (!native || !firstCard()) { focusTabs(); return; }
            if (native && native.start) native.start();
            else Lampa.Controller.toggle('content');
            installController();
            var destination = target && document.documentElement.contains(target) ? target : firstCard();
            if (destination) focus(destination, native && native.render ? native.render() : body);
            else focusTabs();
        }
        function sortTitle() { return t('list_sort_' + sortKey); }
        function updateTabs() {
            tabButtons.forEach(function (button, index) {
                var definition = definitions[index], isSelected = definition.key === selected.key;
                button.toggleClass('is-selected', isSelected).toggleClass('is-pending', pending && definition.key === wanted.key).attr('aria-pressed', String(isSelected));
            });
            sortButton.text(t('list_sort') + ': ' + sortTitle());
            root.attr('aria-busy', String(pending));
        }
        function renderCounts(counts) {
            counts = counts || {};
            var total = 0, known = true;
            definitions.slice(1).forEach(function (definition) {
                if (definition.key === 'favorites') return;
                if (typeof counts[definition.key] !== 'number' || !isFinite(counts[definition.key])) known = false;
                else total += counts[definition.key];
            });
            tabButtons.forEach(function (button, index) {
                var definition = definitions[index], value = definition.key === 'all' ? known ? total : null : counts[definition.key];
                button.find('.yani-library__count').text(typeof value === 'number' && isFinite(value) ? String(value) : '—');
            });
        }
        function loadCounts() {
            if (!deps.loadCounts) return;
            Promise.resolve().then(function () { return deps.loadCounts(); }).then(function (counts) { if (current()) renderCounts(counts); }).catch(function () {});
        }
        function closePanel() { if (panel) { panel.destroy(); panel = null; } }
        function showSort(event) {
            if (event && event.preventDefault) event.preventDefault();
            if (event && event.stopImmediatePropagation) event.stopImmediatePropagation();
            if (!current() || !active || pending) return;
            var options = {title: t('list_sort'), compact: true, items: sorts.map(function (key) { return {key: key, title: t('list_sort_' + key), selected: key === sortKey}; }), origin: sortButton, collection: header,
                valid: function () { return current() && active; }, onClose: function () { panel = null; }, onSelect: function (item) {
                    if (!current() || sorts.indexOf(item.key) < 0 || item.key === sortKey) return;
                    sortKey = item.key;
                    if (Lampa.Storage && Lampa.Storage.set) Lampa.Storage.set('yani_library_sort', sortKey);
                    records = sorted(records); page = 1; replaceGrid(); updateTabs(); focusTabs(tabButtons.length);
                }};
            if (window.LampaYaniChoicePanel) panel = LampaYaniChoicePanel.show(options);
            else if (deps.showSelect) deps.showSelect(options);
            else Lampa.Select.show(options);
        }
        function sorted(items) { return window.LampaYaniAccountListControls ? LampaYaniAccountListControls.sortItems(items, sortKey) : items.slice(); }
        function deduplicate(items) {
            var seen = {};
            return (Array.isArray(items) ? items : []).filter(function (item) {
                if (!item) return false;
                var value = item.anime || item, id = value.anime_id || value.yani_id || value.id;
                if (id === undefined || id === null) return true;
                if (seen[id]) return false;
                seen[id] = true; return true;
            });
        }
        function renderPager() {
            pager.empty(); pagerButtons = [];
            var pages = Math.max(1, Math.ceil(records.length / pageSize));
            if (pages <= 1) return;
            function button(label, next) {
                var element = $('<div class="yani-library__page selector" role="button"></div>').text(label);
                element.on('hover:enter click.yaniLibrary', function (event) { if (event.preventDefault) event.preventDefault(); if (event.stopImmediatePropagation) event.stopImmediatePropagation(); if (!current() || pending) return; page = next; replaceGrid(); startGrid(); });
                pagerButtons.push(element[0]); return element;
            }
            if (page > 1) pager.append(button('‹ ' + t('choice_previous'), page - 1));
            pager.append($('<span class="yani-library__page-number"></span>').text(page + ' / ' + pages));
            if (page < pages) pager.append(button(t('choice_next') + ' ›', page + 1));
        }
        function replaceGrid() {
            if (!current()) return;
            releaseController();
            var previous = native;
            var before = Lampa.Controller.enabled ? Lampa.Controller.enabled() || {} : {};
            var restoreFocus = active && (before.name === 'content' || before.name === controllerName || before.name === pagerController);
            var restoreTab = Boolean(native) && before.name === controllerName;
            var pageObject = Object.assign({}, object, {page: 1, title: t('user_lists')});
            var next = new Lampa.InteractionCategory(pageObject);
            next.activity = {loader: function () {}, toggle: function () {}};
            next.cardRender = function () { if (deps.cardRender) deps.cardRender.apply(null, arguments); };
            if (next.create) next.create();
            var results = records.slice((page - 1) * pageSize, page * pageSize).map(function (record) { return deps.toCard ? deps.toCard(record) : record; });
            if (results.length) next.build({results: results, total_pages: 1, title: selected.title || selected.label});
            if (next.render) next.render().addClass('yani-library__grid');
            body.empty(); body.append(next.render(true)); native = next; component.scroll = next.scroll;
            next.activity = component.activity;
            if (previous && previous.destroy) previous.destroy();
            // build() decorates detached cards. Measure their actual poster size
            // only after the replacement grid is mounted, without rebinding cards.
            if (deps.syncCardLayout) deps.syncCardLayout(next.render());
            lastCard = null; loaded = true;
            status.text(results.length ? '' : t('library_empty'));
            renderPager();
            // Keep paging outside native Scroll: the old host limits its selector
            // collection to cards, so paging uses an explicit small controller.
            root.append(pager);
            if (restoreFocus) { if (restoreTab) focusTabs(tabPosition); else startGrid(); }
        }
        function commit(result) {
            pendingCommit = null; records = sorted(deduplicate(result.items)); selected = result.definition; page = 1;
            replaceGrid(); updateTabs();
        }
        function canBuildNow() {
            var enabled = Lampa.Controller.enabled ? Lampa.Controller.enabled() || {} : {};
            return active && (enabled.name === 'content' || enabled.name === controllerName || enabled.name === pagerController);
        }
        function load(definition) {
            if (!current()) return;
            wanted = definition; pending = true; var request = ++generation;
            status.text(t('loading')); updateTabs();
            if (!loaded && component.activity && component.activity.loader) component.activity.loader(true);
            Promise.resolve().then(function () { return deps.loadItems(definition); }).then(function (items) {
                if (!current() || request !== generation) return;
                pending = false; var result = {items: items, definition: definition};
                // Native legacy build also updates Navigator's collection. Do
                // not even build a detached grid while a rail/window owns it.
                if (canBuildNow()) commit(result);
                else { pendingCommit = result; status.text(''); updateTabs(); }
                if (component.activity && component.activity.loader) component.activity.loader(false);
            }).catch(function (error) {
                if (!current() || request !== generation) return;
                pending = false; wanted = selected; status.text(t('library_load_error')); updateTabs();
                if (component.activity && component.activity.loader) component.activity.loader(false);
                if (deps.onError) deps.onError(error);
            });
        }
        definitions.forEach(function (definition, index) {
            var button = $('<div class="yani-library__tab selector" role="button"></div>').attr('data-category', definition.key).addClass('yani-library__tab--' + definition.key);
            button.append($('<span class="yani-library__label"></span>').text(definition.title || definition.label || definition.key), $('<span class="yani-library__count"></span>').text('—'));
            button.on('hover:focus', function () { tabPosition = index; });
            button.on('hover:enter click.yaniLibrary', function (event) { if (event.preventDefault) event.preventDefault(); if (event.stopImmediatePropagation) event.stopImmediatePropagation(); if (current() && (!pending || wanted.key !== definition.key) && (selected.key !== definition.key || !loaded)) load(definition); });
            tabButtons.push(button); tabs.append(button);
        });
        sortButton.on('hover:focus', function () { tabPosition = tabButtons.length; }).on('hover:enter click.yaniLibrary', showSort);
        header.append($('<div class="yani-library__heading"></div>').append(title, sortButton), tabs, status);
        root.append(header, body, pager); updateTabs();
        $(document).on('yani:list-state-changed' + eventName, function () { if (destroyed) return; refreshNeeded = true; if (active && !pending) { refreshNeeded = false; load(selected); loadCounts(); } });
        $(document).on('yani:auth-changed' + eventName, function () { if (!current()) { generation++; closePanel(); records = []; body.empty(); renderCounts({}); status.text(t('library_load_error')); } });
        component.create = function () { load(selected); loadCounts(); };
        component.render = function (js) { return js ? root[0] : root; };
        component.start = function () {
            if (!current()) return; active = true;
            if (pendingCommit) commit(pendingCommit);
            Lampa.Controller.add(controllerName, {
                toggle: function () { if (pendingCommit && current() && active) { commit(pendingCommit); return; } focus(tabPosition === tabButtons.length ? sortButton : tabButtons[tabPosition], header); },
                up: function () {}, down: function () { startGrid(lastCard); },
                right: function () { tabPosition = Math.min(tabButtons.length, tabPosition + 1); focus(tabPosition === tabButtons.length ? sortButton : tabButtons[tabPosition], header); },
                left: function () {
                    if (tabPosition > 0) { tabPosition--; focus(tabButtons[tabPosition], header); return; }
                    if (component.yaniEnterRail) { component.yaniEnterRail({controller: controllerName, collection: header, origin: tabButtons[tabPosition]}); return; }
                    startGrid(lastCard);
                    var enabled = Lampa.Controller.enabled ? Lampa.Controller.enabled() || {} : {};
                    if (enabled.name === 'content' && enabled.controller && enabled.controller.left) enabled.controller.left();
                },
                back: function () { if (deps.goBack) deps.goBack(); else Lampa.Activity.backward(); }
            });
            Lampa.Controller.add(pagerController, {
                toggle: function () { if (pendingCommit && current() && active) { commit(pendingCommit); return; } lastPager = Math.min(lastPager, pagerButtons.length - 1); focus(pagerButtons[Math.max(0,lastPager)], pager); },
                up: function () { startGrid(lastCard); }, down: function () {},
                left: function () { if (lastPager > 0) { lastPager--; focus(pagerButtons[lastPager], pager); } else if (component.yaniEnterRail) component.yaniEnterRail({controller: pagerController, collection: pager, origin: pagerButtons[0]}); },
                right: function () { lastPager = Math.min(pagerButtons.length - 1, lastPager + 1); focus(pagerButtons[lastPager], pager); },
                back: function () { if (deps.goBack) deps.goBack(); else Lampa.Activity.backward(); }
            });
            if (native) startGrid(lastCard); else focusTabs();
            if (refreshNeeded && !pending) { refreshNeeded = false; load(selected); loadCounts(); }
        };
        component.pause = component.stop = function () { active = false; closePanel(); releaseController(); if (native && native.pause) native.pause(); };
        component.destroy = function () {
            if (destroyed) return; destroyed = true; active = false; generation++; closePanel(); releaseController();
            $(document).off(eventName); if (native && native.destroy) native.destroy();
            records = []; pendingCommit = null; native = null; component.scroll = null; root.remove();
        };
        return component;
    }
    window.LampaYaniLibrary = {create: create};
}(window));

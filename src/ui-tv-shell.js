(function (window) {
    'use strict';

    var controllerName = 'yani_tv_rail';
    var serial = 0;
    function node(value) { return value && value.jquery ? value[0] : value && value.nodeType ? value : null; }
    function currentActivity() { return window.Lampa && Lampa.Activity && Lampa.Activity.active ? Lampa.Activity.active() : null; }
    function wrap(component, options) {
        options = options || {};
        if (!component || component.yaniTvShell || !component.render || !window.$ || !window.Lampa || !Lampa.Controller) return component;
        component.yaniTvShell = true;
        var original = {}, names = ['render', 'start', 'pause', 'stop', 'destroy'];
        names.forEach(function (name) { original[name] = component[name]; });
        var shell = null, body = null, content = null, rail = null, buttons = [];
        var lastContent = null, lastRail = null, owner = null, paused = true, destroyed = false;
        var originController = 'content', originCollection = null;
        var patched = null, originalLeft = null, patchedLeft = null;
        var namespace = '.yaniTvShell' + (++serial);
        function text(key, fallback) { var value = options.t && options.t(key); return value && value !== key ? value : fallback; }
        function valid() { return !destroyed && !paused && owner === currentActivity(); }
        function contains(parent, child) { return Boolean(parent && child && (parent === child || parent.contains && parent.contains(child) || window.$.contains && $.contains(parent, child))); }
        function inside(value) { var element = node(value); return contains(content && content[0], element) ? element : null; }
        function contentFocus() {
            var focused = content && content.find('.selector.focus').first()[0];
            return inside(focused) || inside(lastContent) || content && content.find('.selector').first()[0] || null;
        }
        function ownRail() { var enabled = Lampa.Controller.enabled && Lampa.Controller.enabled(); return enabled && enabled.name === controllerName; }
        function focusRail(target) {
            if (!valid() || !ownRail()) return;
            var element = target || lastRail || buttons[0];
            if (!element) return;
            lastRail = element;
            Lampa.Controller.collectionSet(rail);
            if (window.Navigator && Navigator.add) Navigator.add(element);
            Lampa.Controller.collectionFocus(element, rail, true);
        }
        function deactivateRail() { if (rail) rail.find('.yani-tv-rail__item').removeClass('selector'); }
        function returnToContent() {
            if (!valid()) return;
            var target = contentFocus();
            deactivateRail();
            Lampa.Controller.toggle(originController || 'content');
            // A content controller can recreate its collection in toggle. Restore
            // the actual origin after that rather than the first grid item.
            if (target && inside(target)) {
                var collection = originCollection && originCollection.length && contains(body && body[0], originCollection[0]) ? originCollection : $(target).closest('.scroll');
                if (!collection.length || !contains(body && body[0], collection[0])) collection = content;
                Lampa.Controller.collectionSet(collection);
                if (window.Navigator && Navigator.add) Navigator.add(target);
                Lampa.Controller.collectionFocus(target, collection, true);
                lastContent = target;
            }
        }
        function enterRail(origin) {
            if (!valid()) return;
            origin = origin || {};
            var enabled = Lampa.Controller.enabled && Lampa.Controller.enabled() || {};
            originController = origin.controller || (enabled.name !== controllerName && enabled.name) || 'content';
            originCollection = origin.collection && origin.collection.jquery ? origin.collection : origin.collection ? $(origin.collection) : null;
            lastContent = inside(origin.origin) || contentFocus();
            rail.find('.yani-tv-rail__item').addClass('selector');
            Lampa.Controller.add(controllerName, {
                toggle: function () { focusRail(); },
                up: function () { focusRail(buttons[Math.max(0, buttons.indexOf(lastRail) - 1)]); },
                down: function () { focusRail(buttons[Math.min(buttons.length - 1, buttons.indexOf(lastRail) + 1)]); },
                right: returnToContent,
                left: function () { if (valid()) { deactivateRail(); Lampa.Controller.toggle('menu'); } },
                back: function () { if (valid() && Lampa.Activity && Lampa.Activity.backward) Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle(controllerName);
        }
        function geometryHasLeft(focused) {
            if (!focused || !focused.getBoundingClientRect) return null;
            var rect = focused.getBoundingClientRect();
            if (!rect || !rect.width || !rect.height) return null;
            var center = rect.top + rect.height / 2, found = false;
            content.find('.selector').each(function () {
                if (found || this === focused || !this.getBoundingClientRect) return;
                var target = this.getBoundingClientRect();
                // Ignore hidden rows and offscreen siblings. Only an item in the
                // current visual row consumes Left; earlier sections do not.
                if (!target.width || !target.height || target.right > rect.left + 2) return;
                var overlap = Math.min(rect.bottom, target.bottom) - Math.max(rect.top, target.top);
                if (overlap > Math.min(rect.height, target.height) * 0.3 || center >= target.top && center <= target.bottom) found = true;
            });
            return found;
        }
        function restoreController() {
            if (patched && patched.left === patchedLeft) patched.left = originalLeft;
            patched = null; originalLeft = null; patchedLeft = null;
        }
        function patch(controller) {
            if (!valid() || !controller || controller === patched) return;
            restoreController();
            patched = controller; originalLeft = controller.left;
            patchedLeft = function () {
                if (!valid()) return;
                if (window.document && window.document.body && $(window.document.body).hasClass('yani-poster-viewer-open')) return originalLeft && originalLeft.apply(this, arguments);
                var focused = contentFocus();
                if (focused) lastContent = focused;
                var hasLeft = geometryHasLeft(focused);
                if (hasLeft === null) hasLeft = Boolean(window.Navigator && Navigator.canmove && Navigator.canmove('left'));
                if (hasLeft) return originalLeft ? originalLeft.apply(this, arguments) : window.Navigator && Navigator.move && Navigator.move('left');
                enterRail();
            };
            controller.left = patchedLeft;
        }
        function ensure() {
            if (shell || destroyed) return;
            var rendered = original.render.call(component);
            content = rendered && rendered.jquery ? rendered : $(rendered);
            shell = $('<div class="yani-tv-shell yani-lite-view"></div>');
            rail = $('<aside class="yani-tv-rail" aria-label="YummyAnime"></aside>');
            var brand = $('<div class="yani-tv-rail__brand"></div>');
            if (options.logo) brand.append($('<img alt="YummyAnime" decoding="async">').attr('src', options.logo));
            else brand.text('YummyAnime');
            rail.append(brand);
            var main = $('<nav class="yani-tv-rail__main"></nav>'), bottom = $('<div class="yani-tv-rail__bottom"></div>');
            var routes = options.routes || {};
            [
                {key: 'home', label: text('home_nav', 'Главная'), symbol: '⌂'},
                {key: 'search', label: text('search', 'Поиск'), symbol: '⌕'},
                {key: 'lists', label: text('user_lists', 'Мои списки'), symbol: '▤'},
                {key: 'catalog', label: text('catalog', 'Каталог'), symbol: '▦'},
                {key: 'more', label: text('home_lite_more', 'Ещё'), symbol: '•••'},
                {key: 'account', label: text('account', 'Аккаунт'), symbol: '○', bottom: true},
                {key: 'settings', label: text('settings', 'Настройки'), symbol: '⚙', bottom: true}
            ].forEach(function (item) {
                if (typeof routes[item.key] !== 'function') return;
                var button = $('<div class="yani-tv-rail__item" role="button"></div>').attr('data-yani-rail-key', item.key);
                button.append($('<span class="yani-tv-rail__symbol" aria-hidden="true"></span>').text(item.symbol), $('<span class="yani-tv-rail__label"></span>').text(item.label));
                if (options.active === item.key) { button.addClass('is-current').attr('aria-current', 'page'); lastRail = button[0]; }
                button.on('hover:focus' + namespace, function (event) {
                    // Native component focus scopes may use comp.render(), which
                    // is now the shell. Rail focus must not replace their saved
                    // card origin when this event bubbles.
                    if (event && event.stopPropagation) event.stopPropagation();
                    if (valid()) lastRail = button[0];
                });
                button.on('hover:enter' + namespace + ' click' + namespace, function (event) {
                    if (event && event.preventDefault) event.preventDefault();
                    if (event && event.stopImmediatePropagation) event.stopImmediatePropagation();
                    if (valid()) routes[item.key](button[0]);
                });
                buttons.push(button[0]); (item.bottom ? bottom : main).append(button);
            });
            rail.append(main, bottom);
            body = $('<div class="yani-tv-shell__body"></div>').append(content);
            body.on('hover:focus' + namespace, '.selector', function (event) { var target = inside(event.currentTarget || this); if (valid() && target) lastContent = target; });
            shell.append(rail, body);
        }
        component.yaniEnterRail = enterRail;
        component.render = function (js) { ensure(); return shell ? js ? shell[0] : shell : original.render.apply(component, arguments); };
        if (component.on) component.on('controller', patch);
        component.start = function () {
            if (destroyed) return;
            ensure(); deactivateRail(); restoreController(); owner = currentActivity(); paused = false;
            var result = original.start && original.start.apply(this, arguments);
            if (valid()) {
                var enabled = Lampa.Controller.enabled && Lampa.Controller.enabled();
                if (enabled && enabled.name === 'content') patch(enabled.controller || enabled);
            }
            return result;
        };
        ['pause', 'stop'].forEach(function (name) {
            component[name] = function () { paused = true; deactivateRail(); restoreController(); if (original[name]) return original[name].apply(this, arguments); };
        });
        component.destroy = function () {
            if (destroyed) return;
            destroyed = true; paused = true; restoreController(); component.yaniEnterRail = null;
            if (body) body.off(namespace);
            if (rail) rail.find('.yani-tv-rail__item').off(namespace);
            var result = original.destroy && original.destroy.apply(this, arguments);
            if (shell) shell.remove();
            shell = body = content = rail = lastContent = lastRail = owner = originCollection = null; buttons = [];
            return result;
        };
        return component;
    }
    window.LampaYaniTvShell = {wrap: wrap};
}(window));

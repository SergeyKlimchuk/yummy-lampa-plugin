(function (window) {
    'use strict';

    var config = {}, root = null, focused = null, lastKey = '', column = null;
    var press = null, pressTimer = null, enterCaptured = false, blockClickUntil = 0;
    var internalFocus = false, activating = false, started = false;
    var document = window.document;
    var capture = {capture: true};
    var directions = {ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', 37: 'left', 38: 'up', 39: 'right', 40: 'down'};

    function scope() { return config.scope && config.scope() || root; }
    function inside(node, region) { return Boolean(node && region && (node === region || region.contains(node))); }
    function action(node) {
        while (node && node !== document) {
            if (node.getAttribute && node.getAttribute('data-focus')) return node;
            node = node.parentElement;
        }
        return null;
    }
    function rectangle(node) { return node.getBoundingClientRect(); }
    function visible(node, region) {
        if (!inside(node, region) || node.isConnected === false || node.disabled || node.getAttribute('aria-disabled') === 'true') return false;
        var parent = node;
        while (parent && parent !== region.parentElement) {
            if (parent.hidden || parent.getAttribute && parent.getAttribute('aria-hidden') === 'true') return false;
            parent = parent.parentElement;
        }
        var rect = rectangle(node);
        return rect.width > 0 && rect.height > 0;
    }
    function actions(region) {
        if (!region) return [];
        return Array.prototype.slice.call(region.querySelectorAll('[data-focus]')).filter(function (node) { return visible(node, region); });
    }
    function mark(node, keepColumn) {
        if (focused && focused !== node) focused.classList.remove('is-focused');
        focused = node;
        lastKey = node.getAttribute('data-focus');
        node.classList.add('is-focused');
        if (!keepColumn) { var rect = rectangle(node); column = rect.left + rect.width / 2; }
    }
    function focusNode(node, keepColumn) {
        if (!visible(node, scope())) return false;
        mark(node, keepColumn);
        internalFocus = true;
        try { node.focus({preventScroll: true}); } catch (error) { node.focus(); }
        internalFocus = false;
        if (node.scrollIntoView) node.scrollIntoView({block: 'nearest', inline: 'nearest', behavior: 'auto'});
        return true;
    }
    function focus(key) {
        var list = actions(scope());
        var found = list.filter(function (node) { return node.getAttribute('data-focus') === key; })[0];
        return found ? focusNode(found, false) : false;
    }
    function cancelPress() {
        if (pressTimer !== null) window.clearTimeout(pressTimer);
        pressTimer = null;
        press = null;
        if (enterCaptured) blockClickUntil = Infinity;
    }
    function reset(key) {
        cancelPress();
        var list = actions(scope());
        var preferred = key || lastKey;
        var found = list.filter(function (node) { return node.getAttribute('data-focus') === preferred; })[0] || list[0];
        return found ? focusNode(found, false) : false;
    }
    function stop(event) {
        event.preventDefault();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    }
    function move(direction) {
        var region = scope(), list = actions(region);
        var current = visible(focused, region) ? focused : action(document.activeElement);
        if (!current || !visible(current, region)) return reset();
        var explicit = current.getAttribute('data-nav-' + direction);
        if (explicit === 'none') return false;
        if (explicit && focus(explicit)) return true;
        var rect = rectangle(current), cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        var vertical = direction === 'up' || direction === 'down';
        var anchor = column === null ? cx : column;
        var candidates = list.filter(function (node) {
            if (node === current) return false;
            var next = rectangle(node), nx = next.left + next.width / 2, ny = next.top + next.height / 2;
            if (direction === 'left') return nx < cx - 1;
            if (direction === 'right') return nx > cx + 1;
            if (direction === 'up') return ny < cy - 1;
            return ny > cy + 1;
        });
        if (vertical) {
            // Keep the vertical column, including when a row has fewer cards.
            var sameColumn = candidates.filter(function (node) { var r = rectangle(node); return r.left <= anchor && r.right >= anchor; });
            if (sameColumn.length) candidates = sameColumn;
            if (!candidates.length) return false;
            candidates.sort(function (a, b) {
                var ar = rectangle(a), br = rectangle(b);
                var ad = Math.abs(ar.top + ar.height / 2 - cy), bd = Math.abs(br.top + br.height / 2 - cy);
                return ad - bd;
            });
            var nextRow = candidates[0].getAttribute('data-row');
            var nearest = rectangle(candidates[0]), rowCenter = nearest.top + nearest.height / 2;
            candidates = candidates.filter(function (node) {
                var r = rectangle(node);
                return nextRow ? node.getAttribute('data-row') === nextRow : Math.abs(r.top + r.height / 2 - rowCenter) < 12;
            });
            candidates.sort(function (a, b) {
                var ar = rectangle(a), br = rectangle(b);
                return Math.abs(ar.left + ar.width / 2 - anchor) - Math.abs(br.left + br.width / 2 - anchor);
            });
        } else {
            var row = current.getAttribute('data-row');
            var sameRow = candidates.filter(function (node) { return row && node.getAttribute('data-row') === row; });
            if (sameRow.length) candidates = sameRow;
            else candidates = candidates.filter(function (node) { var r = rectangle(node); return Math.min(rect.bottom, r.bottom) > Math.max(rect.top, r.top); });
            candidates.sort(function (a, b) {
                var ar = rectangle(a), br = rectangle(b);
                return Math.abs(ar.left + ar.width / 2 - cx) + 2 * Math.abs(ar.top + ar.height / 2 - cy) -
                    Math.abs(br.left + br.width / 2 - cx) - 2 * Math.abs(br.top + br.height / 2 - cy);
            });
        }
        return candidates.length ? focusNode(candidates[0], vertical) : false;
    }
    function editing(node) {
        var tag = node && node.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || Boolean(node && node.isContentEditable);
    }
    function keydown(event) {
        if (!inside(event.target, root) && !inside(event.target, scope())) return;
        var key = event.key || event.code, code = event.keyCode || event.which;
        var input = editing(event.target);
        var back = key === 'Escape' || key === 'Backspace' || code === 27 || code === 8 || code === 461 || code === 10009;
        if (back && !(input && (key === 'Backspace' || code === 8))) {
            stop(event); cancelPress();
            if (config.onBack) config.onBack(event);
            return;
        }
        if (event.target && event.target.tagName === 'SELECT') return;
        if (key === 'Tab' && scope() !== root) {
            var list = actions(scope());
            if (!list.length) return stop(event);
            var index = list.indexOf(action(document.activeElement));
            stop(event);
            focusNode(list[(index + (event.shiftKey ? -1 : 1) + list.length) % list.length], false);
            return;
        }
        var direction = directions[key] || directions[code];
        if (direction) {
            if (input && (direction === 'left' || direction === 'right')) return;
            stop(event); cancelPress(); move(direction); return;
        }
        if (key !== 'Enter' && code !== 13) return;
        if (input) return;
        stop(event);
        if (enterCaptured) return;
        var node = action(document.activeElement) || focused;
        if (!visible(node, scope())) return;
        blockClickUntil = 0;
        enterCaptured = true;
        press = {node: node, region: scope(), held: false};
        var currentPress = press;
        pressTimer = window.setTimeout(function () {
            pressTimer = null;
            if (press !== currentPress || !visible(currentPress.node, scope()) || currentPress.region !== scope()) return;
            currentPress.held = true;
            blockClickUntil = Infinity;
            if (config.onHold) config.onHold(currentPress.node.getAttribute('data-focus'), currentPress.node);
        }, 800);
    }
    function keyup(event) {
        var key = event.key || event.code, code = event.keyCode || event.which;
        if ((key !== 'Enter' && code !== 13) || !enterCaptured) return;
        stop(event);
        var currentPress = press;
        enterCaptured = false;
        cancelPress();
        blockClickUntil = Date.now() + 80;
        if (!currentPress || currentPress.held || currentPress.region !== scope() || !visible(currentPress.node, scope())) return;
        activating = true;
        try { currentPress.node.click(); } finally { activating = false; }
    }
    function focusin(event) {
        var region = scope(), node = action(event.target);
        if (!inside(event.target, root) && !inside(event.target, region)) return;
        if (!node || !visible(node, region)) {
            if (region !== root) reset();
            return;
        }
        mark(node, internalFocus);
    }
    function pointerdown() { blockClickUntil = 0; cancelPress(); }
    function click(event) {
        if (!activating && Date.now() < blockClickUntil && (inside(event.target, root) || inside(event.target, scope()))) stop(event);
    }
    function destroy() {
        if (pressTimer !== null) window.clearTimeout(pressTimer);
        pressTimer = null; press = null; enterCaptured = false; blockClickUntil = 0;
        if (started) {
            document.removeEventListener('keydown', keydown, capture);
            document.removeEventListener('keyup', keyup, capture);
            document.removeEventListener('focusin', focusin, capture);
            document.removeEventListener('pointerdown', pointerdown, capture);
            document.removeEventListener('mousedown', pointerdown, capture);
            document.removeEventListener('touchstart', pointerdown, capture);
            document.removeEventListener('click', click, capture);
        }
        if (focused) focused.classList.remove('is-focused');
        started = false; root = null; focused = null; lastKey = ''; column = null;
    }
    function start(options) {
        destroy();
        config = options || {};
        root = typeof config.root === 'string' ? document.querySelector(config.root) : config.root || document.querySelector('#tv-app');
        if (!root) return api;
        document.addEventListener('keydown', keydown, capture);
        document.addEventListener('keyup', keyup, capture);
        document.addEventListener('focusin', focusin, capture);
        document.addEventListener('pointerdown', pointerdown, capture);
        document.addEventListener('mousedown', pointerdown, capture);
        document.addEventListener('touchstart', pointerdown, capture);
        document.addEventListener('click', click, capture);
        started = true;
        reset(config.initialFocus);
        return api;
    }
    var api = {start: start, focus: focus, reset: reset, move: move, destroy: destroy, current: function () { return lastKey; }};
    window.YaniTVNavigation = api;
}(window));

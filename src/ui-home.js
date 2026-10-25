(function (window) {
    'use strict';

    // Exact header paths from https://ru.yummyani.me/; bundled to avoid a logo request.
    var OFFICIAL_LOGO = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNDIgODYiIHJvbGU9ImltZyIgYXJpYS1sYWJlbD0iWXVtbXlBbmltZSI+PHN2ZyB4PSIwIiB5PSIwIiB3aWR0aD0iODYiIGhlaWdodD0iODYiIGZpbGw9IiNmZjY2NjYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDIwIDIwIj48cGF0aCBkPSJNMTguNDUgMEgxLjU1QTEuNTUgMS41NSAwIDAwMCAxLjU1djE2LjlBMS41NCAxLjU0IDAgMDAxLjU1IDIwaDE2LjlBMS41NSAxLjU1IDAgMDAyMCAxOC40NVYxLjU1QTEuNTQgMS41NCAwIDAwMTguNDUgMFptLTIuODMgNS45My0yLjEgMi42Ni0yLjMtNS40M2E2Ljk1IDYuOTUgMCAwMTQuNCAyLjc3Wm0tMi45IDYuNTdoLTRsMi4wMy00LjggMS45OCA0LjhabS0yLjM3LTkuMzRMNy44IDkuMDYgNC44NyA1LjMzYy42NC0uNyAxLjQtMS4yNiAyLjI3LTEuNjVhOC4xOCA4LjE4IDAgMDEzLjItLjUyWk0zLjU3IDcuMzlsMy4yIDQuMDYtMS41NiAzLjU4QTYuOTYgNi45NiAwIDAxMy41NyA3LjM5Wm02LjU3IDkuNTZjLTEuMDUuMDEtMi4xLS4yLTMuMDUtLjY1bC43Ni0xLjhoNS43bC40OSAxLjE1YTYuOTMgNi45MyAwIDAxLTMuOSAxLjNabTYuOC03LjA3YTcuOCA3LjggMCAwMS0xLjE3IDRMMTQuNTUgMTFsMi4xNy0yLjc3Yy4xNC41NC4yMSAxLjEuMjMgMS42NVoiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAsIDApIj48L3BhdGg+PC9zdmc+PHN2ZyB4PSIxMDIiIHk9IjE4IiB3aWR0aD0iMTQwIiBoZWlnaHQ9IjUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAxNDAgNTAiPjxwYXRoIGZpbGw9IiNmMWYxZjEiIGQ9Ik02LjEgOC4zIDEwLjMuNGgyTDcgMTAuMXY2LjFINS4ydi02TDAgLjRoMmw0LjEgNy45Wm05LTR2Ny44YzAgMSAuMiAxLjYuNiAyLjIuNC40IDEuMS43IDIgLjcgMS4zIDAgMi4yLS40IDIuNy0xIC42LS43LjktMS44LjktMy40VjQuNEgyM3YxMS45aC0xLjRsLS4zLTEuNmgtLjFjLS40LjYtLjkgMS0xLjUgMS4zYTUgNSAwIDAxLTIuMi41Yy0xLjQgMC0yLjUtLjMtMy4yLTFzLTEtMS44LTEtMy4zVjQuNEgxNVptMjYgMTJWOC40YzAtMS0uMy0xLjctLjctMi4xLS40LS41LTEtLjctMS44LS43LTEuMSAwLTIgLjMtMi41IDEtLjUuNi0uOCAxLjYtLjggMi45djYuNmgtMS44VjguNWMwLTEtLjItMS43LS42LTIuMS0uNC0uNS0xLS43LTEuOS0uNy0xIDAtMS45LjMtMi40IDEtLjUuNi0uOCAxLjgtLjggMy4zdjYuMmgtMS43VjQuNGgxLjRsLjMgMS42aC4xYy40LS42LjgtMSAxLjQtMS4zLjctLjMgMS4zLS41IDItLjUgMiAwIDMuMS42IDMuNyAyIC40LS42IDEtMS4xIDEuNi0xLjVhNSA1IDAgMDEyLjMtLjVjMS4zIDAgMi4zLjMgMyAxIC42LjcgMSAxLjggMSAzLjN2Ny43SDQxWm0xOS41IDBWOC40YzAtMS0uMS0xLjctLjYtMi4xLS40LS41LTEtLjctMS44LS43LTEuMSAwLTIgLjMtMi41IDEtLjUuNi0uOCAxLjYtLjggMi45djYuNmgtMS43VjguNWMwLTEtLjItMS43LS43LTIuMS0uMy0uNS0xLS43LTEuOC0uNy0xLjIgMC0yIC4zLTIuNSAxLS41LjYtLjggMS44LS44IDMuM3Y2LjJoLTEuN1Y0LjRINDdsLjMgMS42aC4xYy40LS42LjgtMSAxLjQtMS4zczEuMy0uNSAyLS41YzIgMCAzLjEuNiAzLjcgMiAuNC0uNi45LTEuMSAxLjYtMS41YTUgNSAwIDAxMi4zLS41YzEuMyAwIDIuMy4zIDMgMSAuNi43IDEgMS44IDEgMy4zdjcuN2gtMS45Wm0yLjktMTJoMS45bDIuNSA2LjhjLjYgMS42IDEgMi43IDEgMy40aC4ybC41LTIgMy04LjFoMS45bC01IDEzLjVjLS40IDEtMSAyLTEuOCAyLjgtLjcuNS0xLjUuOS0yLjUuOWwtMS42LS4ydi0xLjVsMS4zLjFjMS4yIDAgMi0uNyAyLjYtMmwuNy0xLjctNC44LTExLjlabTI3LjIgMTItMi01LjFoLTYuM2wtMS45IDVoLTEuOEw4NC44LjRoMS42bDYuMSAxNS44aC0xLjhaTTg4IDkuNWwtMS44LTUtLjctMi4yLS43IDIuMy0xLjggNWg1LjFabTEzLjYgNi42VjguNWMwLTEtLjMtMS42LS43LTIuMXMtMS4xLS43LTItLjdjLTEuMyAwLTIuMS4zLTIuNyAxLS42LjYtLjggMS44LS44IDMuM3Y2LjJoLTEuOFY0LjRIOTVsLjMgMS42aC4xYy40LS42IDEtMSAxLjYtMS4zYTUgNSAwIDAxMi4yLS41YzEuNCAwIDIuNC4zIDMuMSAxIC44LjcgMS4xIDEuOCAxLjEgMy4zdjcuOGgtMS44Wm00LjUtMTVjMC0uNS4xLS43LjMtMWExIDEgMCAwMS43LS4yYy4zIDAgLjYuMS44LjMuMi4yLjMuNS4zIDEgMCAuMy0uMS42LS4zLjhhMSAxIDAgMDEtMS4yLjIgMSAxIDAgMDEtLjMtLjJjLS4yLS4yLS4zLS41LS4zLTFabTIgMTVoLTEuOVY0LjRoMS44djExLjhabTE3LjkgMFY4LjVjMC0xLS4yLTEuNy0uNy0yLjEtLjMtLjUtMS0uNy0xLjgtLjctMS4xIDAtMiAuMy0yLjUgMS0uNS42LS44IDEuNi0uOCAyLjl2Ni42aC0xLjdWOC41YzAtMS0uMi0xLjctLjYtMi4xLS40LS41LTEtLjctMi0uN3MtMS44LjMtMi40IDFjLS41LjYtLjggMS44LS44IDMuM3Y2LjJIMTExVjQuNGgxLjRsLjMgMS42aC4xYy40LS42LjgtMSAxLjQtMS4zLjctLjMgMS4zLS41IDItLjUgMiAwIDMuMS42IDMuNyAyIC40LS42IDEtMS4xIDEuNi0xLjVhNSA1IDAgMDEyLjMtLjVjMS4zIDAgMi4zLjMgMyAxIC42LjcgMSAxLjggMSAzLjN2Ny43SDEyNlptOS42LjJhNS40IDUuNCAwIDAxLTQuMS0xLjZjLTEtMS0xLjUtMi41LTEuNS00LjRhNyA3IDAgMDExLjQtNC41IDQuNiA0LjYgMCAwMTMuNy0xLjdjMS41IDAgMi42LjUgMy41IDEuNSAxIDEgMS40IDIuNCAxLjMgMy44djEuMWgtOGMwIDEuNC4zIDIuNSAxIDMuMi42LjggMS41IDEuMSAyLjggMS4xczIuNS0uMyAzLjctLjh2MS42bC0xLjguNi0yIC4xWm0tLjUtMTAuN2EzIDMgMCAwMC0yLjIuOWMtLjYuNy0xIDEuNi0xIDIuNmg2YzAtMS4yLS4yLTItLjctMi42LS41LS43LTEuMi0xLTItMVpNNC4zIDQwLjNsMy01LjVoMS4zTDUgNDEuNnY0LjNIMy42di00LjJMMCAzNC44aDEuNGwyLjkgNS41Wk0xNi41IDQ2IDE1IDQyLjRoLTQuNGwtMS4zIDMuNUg4bDQuMy0xMS4xaDFsNC40IDExLjFoLTEuM1ptLTEuOC00LjctMS4zLTMuNC0uNS0xLjZjMCAuNS0uMiAxLS40IDEuNmwtMS4zIDMuNGgzLjVabTM5LjcgNC43LS4yLTEuMkg1NGMtLjQuNS0uOC45LTEuMyAxLS40LjMtLjkuMy0xLjUuMy0uOCAwLTEuNC0uMi0yLS42LS40LS40LS42LTEtLjYtMS44IDAtMS43IDEuMy0yLjYgNC0yLjZINTR2LS42YzAtLjYtLjItMS4xLS40LTEuNC0uMy0uMy0uOC0uNS0xLjQtLjUtLjcgMC0xLjQuMi0yLjMuNmwtLjQtMWMuOS0uNCAxLjgtLjYgMi44LS42czEuNy4yIDIuMi42Yy41LjUuNyAxLjIuNyAyLjFWNDZoLTFabS0yLjgtMWMuOCAwIDEuNC0uMSAxLjgtLjYuNS0uNC43LTEgLjctMS43di0uOGgtMS4zYy0xIDAtMS42LjMtMi4xLjUtLjUuMy0uNy43LS43IDEuMyAwIC41LjIuOC41IDEgLjIuMy42LjQgMSAuNFpNNjMgNDZ2LTUuNGMwLS42LS4yLTEuMS0uNS0xLjUtLjMtLjMtLjctLjUtMS40LS41LS44IDAtMS41LjItMS45LjdzLS42IDEuMy0uNiAyLjNWNDZoLTEuMnYtOC4zaDFsLjIgMS4xIDEuMS0xYy41LS4yIDEtLjMgMS42LS4zIDEgMCAxLjcuMiAyLjIuN3MuOCAxLjMuOCAyLjRWNDZINjNabTMuMi0xMC42YzAtLjIgMC0uNS4yLS42bC41LS4yYy4yIDAgLjQgMCAuNS4yLjIuMi4yLjQuMi42IDAgLjMgMCAuNS0uMi43bC0uNS4yYTEgMSAwIDAxLS41LS4yIDEgMSAwIDAxLS4yLS43Wk02Ny41IDQ2aC0xLjJ2LTguM2gxLjJWNDZabTEyLjYgMHYtNS40YzAtLjctLjEtMS4yLS40LTEuNS0uMy0uMy0uNy0uNS0xLjMtLjUtLjggMC0xLjQuMi0xLjcuNy0uNC40LS42IDEtLjYgMlY0Nkg3NXYtNS40YzAtLjYtLjItMS4xLS41LTEuNC0uMi0uMy0uNy0uNS0xLjMtLjUtLjcgMC0xLjMuMi0xLjcuNy0uNC40LS41IDEuMi0uNSAyLjNWNDZoLTEuM3YtOC4zaDFsLjIgMS4xaC4xYy4yLS4zLjYtLjcgMS0uOS40LS4yIDEtLjMgMS40LS4zIDEuMyAwIDIuMS40IDIuNiAxLjQuMy0uNS42LS44IDEuMS0xYTMgMyAwIDAxMS42LS41Yy45IDAgMS42LjMgMiAuOC41LjUuOCAxLjIuOCAyLjNWNDZIODBabTYuOC4xYTMuOCAzLjggMCAwMS0yLjktMWMtLjctMS0xLjEtMi0xLTMuMiAwLTEuMy4zLTIuNCAxLTMuMmEzLjMgMy4zIDAgMDEyLjUtMS4xIDMuMiAzLjIgMCAwMTIuNSAxYy42LjYuOSAxLjYuOSAyLjd2LjhoLTUuN2MwIDEgLjMgMS43LjggMi4yLjQuNSAxIC44IDIgLjhhNyA3IDAgMDAyLjUtLjV2MWMtLjQuMy0uOC40LTEuMi41aC0xLjRabS0uNC03LjVhMiAyIDAgMDAtMS41LjZjLS41LjUtLjcgMS4yLS43IDEuOGg0LjNjMC0uOC0uMi0xLjQtLjYtMS44LS4zLS40LS44LS42LTEuNS0uNloiPjwvcGF0aD48cGF0aCBmaWxsPSIjZmY2NjY2IiBjbGFzcz0iaGVhcnQiIGQ9Ik0zMy4xIDUwbDgtOGM1LjgtNi0yLjItMTQtOC04LTUuOC02LTEzLjggMi4xLTggOGw4IDhaIj48L3BhdGg+PC9zdmc+PC9zdmc+Cg==";
    var LIMITS = {continueWatching: 3, ongoing: 6};
    var PUBLIC_CACHE = 'yani_lite_ongoing_v1';
    var COUNTS_CACHE = 'yani_lite_counts_v1';
    var FOCUS_KEY = 'yani_lite_home_focus';
    var FRESH_FOR = 5 * 60 * 1000;

    function unwrap(payload) {
        return payload && payload.response !== undefined ? payload.response : payload;
    }

    function items(payload) {
        var data = unwrap(payload);
        if (Array.isArray(data)) return data;
        return data && (data.anime || data.items || data.results || data.data) || [];
    }

    function image(value) {
        if (value && typeof value === 'object') value = value.medium || value.small || value.big || value.url || value.original || '';
        value = String(value || '');
        if (value.indexOf('//') === 0) value = 'https:' + value;
        return /^https?:\/\//i.test(value) ? value : '';
    }

    function idOf(value) {
        return String(value && (value.anime_id || value.yani_id || value.id) || '');
    }

    function publicCard(raw) {
        raw = raw || {};
        var type = raw.type;
        if (type && typeof type === 'object') type = type.name || type.title || '';
        var rating = raw.rating && typeof raw.rating === 'object' ? raw.rating.average : raw.rating;
        return {
            anime_id: idOf(raw),
            title: String(raw.title || raw.name || raw.original_name || ''),
            poster: image(raw.poster || raw.img),
            year: raw.year || String(raw.release_date || raw.first_air_date || '').slice(0, 4),
            type: typeof type === 'string' ? type : '',
            rating: Number(rating || raw.vote_average || 0) || 0
        };
    }

    function create(object, deps) {
        deps = deps || {};
        object = object || {};
        var Lampa = window.Lampa;
        var $ = window.$;
        var self = {};
        var scroll = new Lampa.Scroll({mask: false, over: true, step: 250, nopadding: true, notransition: true});
        scroll.minus();
        var root = $('<div class="yani-home yani-home--lite"></div>');
        var header = $('<div class="yani-lite-header"></div>');
        var layout = $('<div class="yani-lite-layout"></div>');
        var sidebar = $('<div class="yani-lite-sidebar"></div>');
        var main = $('<div class="yani-lite-main"></div>');
        var sections = {};
        var targets = {};
        var active = false;
        var destroyed = false;
        var started = false;
        var generation = 0;
        var aborter = typeof window.AbortController === 'function' ? new window.AbortController() : null;
        var retryTimer = null;
        var lastKey = read(FOCUS_KEY, 'nav:catalog');
        var storedKey = lastKey;
        var currentSession = sessionKey();
        var countsGeneration = 0;
        var catalogGeneration = 0;
        var catalogPending = false;
        var countsPending = false;
        var historyPending = false;

        function text(key, fallback) {
            var value = deps.t ? deps.t(key) : '';
            return !value || value === key ? fallback : value;
        }

        function read(key, fallback) {
            try {
                var value = Lampa.Storage.get(key, fallback);
                if (typeof value === 'string' && (value.charAt(0) === '{' || value.charAt(0) === '[')) value = JSON.parse(value);
                return value === undefined || value === null ? fallback : value;
            } catch (ignore) { return fallback; }
        }

        function write(key, value) {
            try { Lampa.Storage.set(key, value); } catch (ignore) { /* A full cache must not prevent navigation. */ }
        }

        function account() { return deps.auth && deps.auth.get ? deps.auth.get() || {} : {}; }
        function authorized() { return Boolean(deps.auth && deps.auth.token && deps.auth.token()); }
        function sessionKey() {
            var user = account();
            return authorized() ? String(user.user_id || user.id || user.login || 'authorized') : 'guest';
        }
        function valid(version) { return !destroyed && version === generation && currentSession === sessionKey(); }
        function enabled(key) { return !deps.homeSectionEnabled || deps.homeSectionEnabled(key); }
        function definitions() { return deps.accountListDefinitions ? deps.accountListDefinitions() : []; }
        function requestControl() { return aborter ? {signal: aborter.signal, retry: false} : {retry: false}; }
        function cancelOwnRequests() {
            if (aborter) aborter.abort();
            aborter = typeof window.AbortController === 'function' ? new window.AbortController() : null;
            catalogPending = false;
            countsPending = false;
            countsGeneration += 1;
            catalogGeneration += 1;
        }

        function rememberFocus() {
            if (lastKey && storedKey !== lastKey) {
                write(FOCUS_KEY, lastKey);
                storedKey = lastKey;
            }
        }

        function target(key) {
            var value = targets[key];
            if (value && $.contains(root[0], value)) return value;
            return root.find('.selector')[0] || false;
        }

        function syncFocus() {
            if (!active || destroyed) return;
            var controller = Lampa.Controller.enabled && Lampa.Controller.enabled();
            if (controller && controller.name !== 'content') return;
            if (controller && controller.controller && controller.controller.yaniLiteOwner !== self) return;
            Lampa.Controller.collectionSet(root);
            Lampa.Controller.collectionFocus(target(lastKey), root, true);
        }

        function button(label, key, callback, className) {
            var element = $('<div class="selector"></div>').addClass(className || 'yani-lite-button');
            element.text(label).attr('data-yani-home-key', key);
            targets[key] = element[0];
            element.on('hover:enter', function () {
                rememberFocus();
                if (!destroyed && callback) callback();
            });
            return element;
        }

        function action(callback) {
            return function () {
                if (typeof callback === 'function') return callback();
            };
        }

        function route(component, title, extra) {
            return function () {
                var next = {url: 'yani/' + component.replace(/^yani_/, ''), component: component, title: 'YummyAnime · ' + title};
                Object.keys(extra || {}).forEach(function (key) { next[key] = extra[key]; });
                Lampa.Activity.push(next);
            };
        }

        var routes = {
            catalog: route('yani_catalog', text('catalog', 'Каталог'), {params: {limit: 30, sort: 'top', sort_forward: false}}),
            search: action(deps.openSearch),
            user_lists: action(deps.openUserLists),
            continue_watching: action(deps.openContinueWatching),
            genres: action(deps.openGenres),
            schedule: route('yani_schedule', text('schedule', 'Расписание')),
            new_translations: route('yani_new_translations', text('new_translations', 'Новые переводы')),
            new_releases: route('yani_new_releases', text('new_releases', 'Новые аниме')),
            top_rated: route('yani_top', text('top_rated', 'Топ аниме'), {topMode: true, params: {limit: 30, sort: 'top', sort_forward: true, from_year: 1900}}),
            for_you: route('yani_recommended', text('for_you', 'Для вас')),
            updates: route('yani_updates', text('updates', 'Обновления')),
            collections: action(deps.openCollections),
            notifications: action(deps.openNotifications),
            account: action(deps.openAccount),
            status: route('yani_status', text('status', 'Статус сервисов'))
        };

        function showMore() {
            var options = [
                ['genres', 'genres', 'Жанры'], ['new_translations', 'new_translations', 'Новые переводы'],
                ['new_releases', 'new_releases', 'Новые аниме'], ['for_you', 'for_you', 'Для вас'],
                ['updates', 'updates', 'Обновления'], ['notifications', 'notifications', 'Уведомления'],
                ['status', 'status', 'Статус сервисов']
            ].filter(function (entry) { return enabled(entry[0]) && (entry[0] !== 'notifications' || authorized()); });
            var params = {
                title: text('home_lite_more', 'Ещё'),
                items: options.map(function (entry) { return {title: text(entry[1], entry[2]), key: entry[0]}; }),
                onSelect: function (item) { if (item && routes[item.key]) routes[item.key](); },
                onBack: function () { self.start(); }
            };
            if (deps.showSelect) deps.showSelect(params);
            else Lampa.Select.show(params);
        }

        function buildShell() {
            targets = {};
            header.empty();
            var brand = $('<div class="yani-lite-brand"></div>').append($('<img alt="YummyAnime">').attr('src', OFFICIAL_LOGO));
            var headerActions = $('<div class="yani-lite-header-actions"></div>');
            if (enabled('account')) headerActions.append(button(account().display_name || account().login || text('account', 'Аккаунт'), 'header:account', routes.account));
            if (deps.openSettings) headerActions.append(button(text('settings', 'Настройки'), 'header:settings', deps.openSettings));
            header.append(brand).append(headerActions);
            sidebar.empty();
            [
                ['catalog', 'catalog', 'Каталог'], ['user_lists', 'user_lists', 'Мои списки'],
                ['search', 'search', 'Поиск'], ['continue_watching', 'continue_watching', 'Продолжить'],
                ['schedule', 'schedule', 'Расписание'], ['top_rated', 'top_rated', 'Топ аниме'],
                ['collections', 'collections', 'Коллекции']
            ].forEach(function (entry) {
                if (!enabled(entry[0])) return;
                sidebar.append(button(text(entry[1], entry[2]), 'nav:' + entry[0], routes[entry[0]], 'yani-lite-nav'));
            });
            sidebar.append(button(text('home_lite_more', 'Ещё'), 'nav:more', showMore, 'yani-lite-nav'));
            main.empty();
            sections = {};
            if (enabled('continue_watching')) sections.continueWatching = section(text('continue_watching', 'Продолжить просмотр'), 'continue', routes.continue_watching);
            if (enabled('user_lists')) sections.categories = section(text('user_lists', 'Мои списки'), 'lists', routes.user_lists);
            if (enabled('new_releases') || enabled('catalog')) sections.ongoing = section(text('home_lite_ongoing', 'Сейчас выходит'), 'ongoing', route('yani_catalog', text('home_lite_ongoing', 'Сейчас выходит'), {params: {status: 'ongoing', limit: 30, sort: 'top', sort_forward: false}}));
        }

        function section(title, key, more) {
            var wrapper = $('<section class="yani-lite-section"></section>');
            var head = $('<div class="yani-lite-section-head"></div>');
            head.append($('<h2 class="yani-lite-section-title"></h2>').text(title));
            if (more) head.append(button(text('home_lite_all', 'Все'), 'all:' + key, more, 'yani-lite-link'));
            var body = $('<div></div>');
            wrapper.append(head).append(body);
            main.append(wrapper);
            return {root: wrapper, body: body};
        }

        function state(sectionObject, message, retry, loading) {
            if (!sectionObject) return;
            sectionObject.body.empty().removeClass('yani-lite-continue yani-lite-categories yani-lite-posters');
            var row = $('<div class="yani-lite-state"></div>').text(message);
            if (loading) row.attr('aria-live', 'polite');
            sectionObject.body.append(row);
            if (retry) sectionObject.body.append(button(text('home_lite_retry', 'Повторить'), 'retry:' + retry.key, retry.callback));
        }

        function forgetTargets(prefix) {
            Object.keys(targets).forEach(function (key) {
                if (key.indexOf(prefix) === 0) delete targets[key];
            });
        }

        function openEntry(raw) {
            if (!raw || !idOf(raw)) return;
            var card = deps.toCard ? deps.toCard(raw) : raw;
            if (deps.openYummyDetail) deps.openYummyDetail(card, false);
        }

        function resumeEntry(raw) {
            if (!raw || !idOf(raw)) return;
            if (deps.resumeCard) deps.resumeCard(raw);
            else openEntry(raw);
        }

        function addPoster(parent, url, className) {
            var frame = $('<div></div>').addClass(className);
            var safe = image(url);
            if (safe) {
                var poster = $('<img alt="">').attr('src', safe).attr('decoding', 'async');
                poster.on('error', function () { poster.remove(); frame.addClass('yani-lite-poster--empty'); });
                frame.append(poster);
            } else frame.addClass('yani-lite-poster--empty');
            parent.append(frame);
        }

        function refreshContinue() {
            var container = sections.continueWatching;
            if (!container) return;
            if (historyPending) {
                state(container, text('loading', 'Загрузка…'), null, true);
                return;
            }
            var cards = deps.continueCards ? deps.continueCards() : deps.localHistoryCards ? deps.localHistoryCards([]).filter(function (entry) {
                return Number(entry.yani_list_progress || 0) < 0.95;
            }) : [];
            cards = (cards || []).filter(function (entry) { return idOf(entry); }).slice(0, LIMITS.continueWatching);
            forgetTargets('continue:');
            container.body.empty().addClass('yani-lite-continue');
            if (!cards.length) {
                state(container, text('home_lite_history_empty', 'Здесь появятся аниме, которые вы начали смотреть.'));
                syncFocus();
                return;
            }
            cards.forEach(function (raw) {
                var entry = publicCard(raw);
                var card = button('', 'continue:' + entry.anime_id, function () { resumeEntry(raw); }, 'yani-lite-resume');
                addPoster(card, entry.poster, 'yani-lite-resume-poster');
                var copy = $('<div class="yani-lite-resume-copy"></div>');
                copy.append($('<div class="yani-lite-title"></div>').text(entry.title));
                var note = [];
                if (raw.yani_resume_episode) note.push(text('episode', 'Серия') + ' ' + raw.yani_resume_episode);
                if (Number(raw.yani_resume_remaining) > 0) note.push(text('home_lite_remaining', 'Осталось {minutes} мин').replace('{minutes}', String(raw.yani_resume_remaining)));
                copy.append($('<div class="yani-lite-meta"></div>').text(note.length ? note.join(' · ') : text('home_lite_resume', 'Продолжить просмотр')));
                var ratio = Math.max(0, Math.min(1, Number(raw.yani_list_progress || 0)));
                var progress = $('<div class="yani-lite-progress"></div>').attr('aria-label', Math.round(ratio * 100) + '%');
                progress.append($('<i></i>').css('width', Math.round(ratio * 100) + '%'));
                copy.append(progress);
                card.append(copy);
                container.body.append(card);
            });
            syncFocus();
        }

        function renderCategories(counts) {
            var container = sections.categories;
            if (!container) return;
            forgetTargets('list:');
            container.body.empty().addClass('yani-lite-categories');
            if (!authorized()) {
                state(container, text('home_lite_sign_in', 'Войдите в аккаунт, чтобы открыть свои списки.'));
                container.body.append(button(text('auth_title', 'Войти в YummyAnime'), 'lists:login', routes.account));
                return;
            }
            definitions().forEach(function (definition) {
                var entry = button('', 'list:' + definition.key, function () { deps.openUserListShortcut(definition); }, 'yani-lite-category');
                entry.append($('<span class="yani-lite-category-title"></span>').text(definition.title));
                var count = counts && counts[definition.key];
                entry.append($('<span class="yani-lite-category-count"></span>').text(typeof count === 'number' ? String(count) : '—'));
                container.body.append(entry);
            });
            syncFocus();
        }

        function renderOngoing(list, cached) {
            var container = sections.ongoing;
            if (!container) return;
            forgetTargets('ongoing:');
            container.body.empty().addClass('yani-lite-posters');
            list.slice(0, LIMITS.ongoing).forEach(function (raw) {
                var entry = publicCard(raw);
                var card = button('', 'ongoing:' + entry.anime_id, function () { openEntry(raw); }, 'yani-lite-card');
                addPoster(card, entry.poster, 'yani-lite-poster');
                card.append($('<div class="yani-lite-title"></div>').text(entry.title));
                var meta = [entry.year, entry.type];
                if (entry.rating) meta.push(entry.rating.toFixed(1));
                card.append($('<div class="yani-lite-meta"></div>').text(meta.filter(Boolean).join(' · ')));
                container.body.append(card);
            });
            container.root.toggleClass('yani-lite-section--cached', Boolean(cached));
            if (!list.length) state(container, text('home_lite_catalog_empty', 'Сейчас нет доступных аниме.'));
            syncFocus();
        }

        function loadOngoing(force) {
            if (!sections.ongoing || catalogPending) return;
            var cached = read(PUBLIC_CACHE, null);
            if (cached && Array.isArray(cached.items) && cached.items.length) renderOngoing(cached.items, true);
            else state(sections.ongoing, text('loading', 'Загрузка…'), null, true);
            if (!force && cached && Date.now() - Number(cached.at || 0) < FRESH_FOR) return;
            catalogPending = true;
            var version = generation;
            var requestVersion = ++catalogGeneration;
            var options = requestControl();
            options.cacheTtl = FRESH_FOR;
            options.cacheFirst = true;
            options.staleFallback = true;
            options.forceRefresh = Boolean(force);
            Promise.resolve(deps.api.catalog({status: 'ongoing', limit: LIMITS.ongoing, offset: 0, sort: 'top', sort_forward: false}, options)).then(function (payload) {
                if (!valid(version) || requestVersion !== catalogGeneration) return;
                catalogPending = false;
                var list = items(payload).filter(function (entry) { return idOf(entry); }).slice(0, LIMITS.ongoing).map(publicCard);
                write(PUBLIC_CACHE, {at: Date.now(), items: list});
                renderOngoing(list, false);
            }, function () {
                if (!valid(version) || requestVersion !== catalogGeneration) return;
                catalogPending = false;
                if (cached && cached.items && cached.items.length) {
                    renderOngoing(cached.items, true);
                    sections.ongoing.body.append(button(text('home_lite_cached', 'Нет связи. Обновить сохранённое'), 'retry:ongoing', function () { loadOngoing(true); }, 'yani-lite-link'));
                } else state(sections.ongoing, text('home_lite_catalog_error', 'Не удалось загрузить аниме.'), {key: 'ongoing', callback: function () { loadOngoing(true); }});
                syncFocus();
            });
        }

        function loadCounts() {
            if (!sections.categories || !authorized() || countsPending) return;
            var owner = currentSession;
            var stored = read(COUNTS_CACHE, null);
            if (stored && stored.owner === owner) {
                renderCategories(stored.counts);
                if (Date.now() - Number(stored.at || 0) < FRESH_FOR) return;
            }
            var version = generation;
            var requestVersion = ++countsGeneration;
            countsPending = true;
            var userId = Number(account().user_id || account().id || 0);
            var profile = userId ? Promise.resolve({id: userId}) : deps.api.profile(requestControl()).then(unwrap);
            profile.then(function (user) {
                if (!valid(version) || requestVersion !== countsGeneration) return null;
                var id = Number(user && (user.id || user.user_id || user.user && user.user.id) || 0);
                if (!id) throw new Error('Missing account ID');
                return deps.api.userListStats(id, requestControl());
            }).then(function (payload) {
                if (!payload || !valid(version) || requestVersion !== countsGeneration) return;
                countsPending = false;
                var counts = deps.listCounts ? deps.listCounts(payload) : {};
                write(COUNTS_CACHE, {owner: owner, at: Date.now(), counts: counts});
                renderCategories(counts);
            }, function () {
                if (!valid(version) || requestVersion !== countsGeneration) return;
                countsPending = false;
                // The six direct list buttons remain usable when counts fail.
                if (sections.categories) sections.categories.root.addClass('yani-lite-section--cached');
            });
        }

        function onAuthChanged() {
            if (destroyed) return;
            generation += 1;
            cancelOwnRequests();
            currentSession = sessionKey();
            historyPending = authorized();
            write(COUNTS_CACHE, null);
            buildShell();
            refreshContinue();
            renderCategories();
            if (active) {
                loadOngoing(false);
                loadCounts();
                if (authorized() && deps.ensureRemoteHistory) {
                    var version = generation;
                    Promise.resolve(deps.ensureRemoteHistory(true)).then(function () {
                        if (!valid(version)) return;
                        historyPending = false;
                        refreshContinue();
                    }, function () {
                        if (!valid(version)) return;
                        historyPending = false;
                        refreshContinue();
                    });
                }
                syncFocus();
            }
        }

        function beginData() {
            if (destroyed || !active) return;
            loadOngoing(false);
            loadCounts();
            if (authorized() && deps.ensureRemoteHistory) {
                var version = generation;
                Promise.resolve(deps.ensureRemoteHistory()).then(function () {
                    if (!valid(version)) return;
                    historyPending = false;
                    refreshContinue();
                }, function () {
                    if (!valid(version)) return;
                    historyPending = false;
                    refreshContinue();
                });
            }
        }

        function onWatchProgress() {
            if (active && !destroyed) refreshContinue();
        }

        self.create = function () {
            root.append(header).append(layout.append(sidebar).append(main));
            buildShell();
            refreshContinue();
            renderCategories();
            scroll.append(root);
            root.on('hover:focus.yaniLite', '.selector', function (event) {
                var element = event.currentTarget || this;
                var key = $(element).attr('data-yani-home-key');
                if (key) lastKey = key;
                scroll.update($(element), true);
            });
            if (typeof document !== 'undefined') document.addEventListener('yani:auth-changed', onAuthChanged);
            $(document).on('yani:watch-progress.yaniLiteHome', onWatchProgress);
            if (self.activity && self.activity.loader) self.activity.loader(false);
            return self.render();
        };

        self.start = function () {
            if (destroyed) return;
            active = true;
            if (currentSession !== sessionKey()) onAuthChanged();
            Lampa.Controller.add('content', {
                yaniLiteOwner: self,
                toggle: function () {
                    Lampa.Controller.collectionSet(root);
                    Lampa.Controller.collectionFocus(target(lastKey), root, true);
                },
                up: function () { if (window.Navigator.canmove('up')) window.Navigator.move('up'); else Lampa.Controller.toggle('head'); },
                down: function () { if (window.Navigator.canmove('down')) window.Navigator.move('down'); },
                left: function () { if (window.Navigator.canmove('left')) window.Navigator.move('left'); else Lampa.Controller.toggle('menu'); },
                right: function () { if (window.Navigator.canmove('right')) window.Navigator.move('right'); },
                back: function () { rememberFocus(); Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle('content');
            if (!started) {
                started = true;
                retryTimer = setTimeout(function () { retryTimer = null; beginData(); }, 0);
            } else {
                refreshContinue();
                beginData();
            }
        };
        self.pause = self.stop = function () { active = false; rememberFocus(); };
        self.render = function (js) { return js ? scroll.render(true) : scroll.render(); };
        self.destroy = function () {
            if (destroyed) return;
            destroyed = true;
            active = false;
            generation += 1;
            rememberFocus();
            cancelOwnRequests();
            if (retryTimer) clearTimeout(retryTimer);
            if (typeof document !== 'undefined') document.removeEventListener('yani:auth-changed', onAuthChanged);
            $(document).off('yani:watch-progress.yaniLiteHome', onWatchProgress);
            root.off('.yaniLite');
            root.remove();
            scroll.destroy();
            targets = {};
            sections = {};
        };
        return self;
    }

    window.LampaYaniHome = {create: create, limits: LIMITS, publicCard: publicCard};
}(window));

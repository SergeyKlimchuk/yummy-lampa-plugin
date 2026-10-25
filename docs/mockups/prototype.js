(function (window, document) {
    'use strict';
    var data = window.YUMMY_MOCKUP_DATA || {};
    var contracts = window.YUMMY_MOCKUP_CONTRACTS || {};
    var views = Object.assign({}, window.YUMMY_CONTENT_VIEWS, window.YUMMY_PRIVATE_VIEWS);
    var main = document.getElementById('ya-main');
    var content = document.getElementById('ya-view');
    var dialog = document.getElementById('ya-dialog');
    var settings = {};
    var memory = {readNotifications: false, clearedNotifications: false, clearedHistory: false, demoAuthorized: false, notificationReadIds: {}, playbackChoices: {}, playbackDefaults: null};
    var view;
    var previousRoute = 'home';
    var modalOrigin;
    var focusKeys = {};
    var routeTrail = [];
    var navigatingBack = false;
    var privateScreens = ['account', 'user-lists', 'account-list', 'notifications', 'subscriptions', 'recommended', 'updates'];
    var stateNames = {authorized: 'Вход выполнен — пример', ready: 'Снимок / без личных данных', example: 'Пример из тестов', loading: 'Загрузка', empty: 'Пустой ответ', error: 'Ошибка', guest: 'Без входа'};
    var defaults = {state: 'ready', selectedId: String(data.detail && data.detail.anime_id || ''), category: 'watching', period: '3hour', sort: 'recent', query: '', genre: '', type: '', status: '', year: '', topType: 'all', sourceIndex: '0', choice: '', optionPage: '', episodePage: '0', trailerIndex: '0', episode: '1', day: '', collectionId: String(data.collection && data.collection.id || ''), subjectId: '', subjectTitle: '', subjectKind: 'studio', commentId: ''};
    var allowed = Object.keys(defaults);

    function esc(value) { return String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
    function attrs(values) {
        return Object.keys(values || {}).filter(function (key) { return /^(?:data-[\w-]+|aria-[\w-]+|title|type|id|role|disabled|value|name)$/.test(key); }).map(function (key) {
            return values[key] === false || values[key] === undefined || values[key] === null ? '' : ' ' + key + '="' + esc(values[key] === true ? key : values[key]) + '"';
        }).join('');
    }
    function button(label, values, className) { return '<button class="' + esc(className || 'ya-button') + '"' + attrs(values) + '>' + esc(label) + '</button>'; }
    function go(label, screen, params, className) { return button(label, {'data-screen': screen, 'data-params': JSON.stringify(params || {})}, className); }
    function section(title, body, action) { return '<section class="ya-section"><div class="ya-toolbar"><h2>' + esc(title) + '</h2>' + (action || '') + '</div>' + body + '</section>'; }
    function row(title, meta, actions) { return '<div class="ya-row"><div><h3>' + esc(title) + '</h3>' + (meta ? '<div class="ya-meta">' + esc(meta) + '</div>' : '') + '</div><div class="ya-toolbar">' + (actions || '') + '</div></div>'; }
    function empty(title, hint, actions) { return '<div class="ya-panel ya-empty"><h2>' + esc(title) + '</h2><p>' + esc(hint) + '</p>' + (actions ? '<div class="ya-toolbar">' + actions + '</div>' : '') + '</div>'; }
    function notice(text) { return '<div class="ya-notice"><p>' + esc(text) + '</p></div>'; }
    function number(value) { return value !== null && value !== undefined && isFinite(Number(value)) ? Number(value).toLocaleString('ru-RU') : '—'; }
    function date(value) {
        if (!value) return '—';
        var item = new Date(typeof value === 'number' || /^\d+$/.test(String(value)) ? Number(value) * (Number(value) < 100000000000 ? 1000 : 1) : value);
        return isNaN(item.getTime()) ? '—' : item.toLocaleString('ru-RU', {timeZone: 'Asia/Almaty', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'});
    }
    function poster(item) {
        var value = item && (item.poster || item.poster_url || item.img) || '';
        if (!value && item && item.poster_previews) value = item.poster_previews[0];
        if (value && typeof value === 'object') value = value.medium || value.small || value.big || value.fullsize || value.huge || '';
        if (String(value).indexOf('//') === 0) value = 'https:' + value;
        return /^https?:\/\//.test(String(value)) && !/\.example(?:[/:]|$)/.test(String(value)) ? String(value) : '';
    }
    function unwrap(item) { return item && item.anime ? Object.assign({}, item.anime, {user: item.user}) : item || {}; }
    function allCards() {
        var catalogFixture = data.fixtures && data.fixtures.catalog && data.fixtures.catalog.response || [];
        if (!Array.isArray(catalogFixture)) catalogFixture = catalogFixture.anime || catalogFixture.items || [];
        var listFixture = data.fixtures && data.fixtures.lists && data.fixtures.lists.list_items && data.fixtures.lists.list_items.response || [];
        return [].concat(data.catalog || [], data.ongoing || [], data.schedule || [], data.feed && data.feed.new || [], data.feed && data.feed.new_videos || [], data.collection && data.collection.animes || [], catalogFixture, listFixture, data.history || [], [data.detail || {}]);
    }
    function current() {
        if (String(data.detail && data.detail.anime_id) === String(view.selectedId)) return data.detail;
        return allCards().map(unwrap).filter(function (item) { return String(item.anime_id || item.yani_id || item.id) === String(view.selectedId); })[0] || {};
    }
    function cards(items, options) {
        options = options || {};
        var screen = options.screen || 'detail';
        return '<div class="ya-grid' + (options.compact ? ' ya-grid--compact' : '') + '">' + (items || []).filter(Boolean).map(function (raw, index) {
            var item = unwrap(raw), id = item.anime_id || item.yani_id || item.id;
            var url = poster(item), type = item.type && (item.type.name || item.type.shortname) || (typeof item.type === 'string' ? item.type : '');
            var score = Number(item.rating && typeof item.rating === 'object' ? item.rating.average : item.rating || item.vote_average || 0);
            var meta = [item.year, type, score > 0 ? score.toFixed(1) : ''].filter(Boolean).join(' · ');
            if (options.history) {
                var episode = item.number || item.episode;
                var ratio = item.duration > 0 ? Math.max(0, Math.min(100, Math.round(Number(item.time || 0) / item.duration * 100))) : null;
                meta = [episode ? 'Серия ' + episode : '', ratio !== null ? ratio + '%' : '', item.voice || item.dubbing || ''].filter(Boolean).join(' · ');
            }
            if (screen === 'collection') meta = 'Коллекция';
            var params = screen === 'collection' ? {collectionId: String(id)} : {selectedId: String(id)};
            var image = url ? '<img src="' + esc(url) + '" alt="" loading="lazy" decoding="async">' : '<span class="ya-no-poster">Нет постера</span>';
            var rank = options.rank ? '<span class="ya-card-badge">' + (index + 1) + '</span>' : '';
            var event = item.ep_title || item.dub_title || item.player_title ? '<span class="ya-meta">' + esc([item.ep_title ? 'Серия ' + item.ep_title : '', item.dub_title, item.player_title].filter(Boolean).join(' · ')) + '</span>' : '';
            var historyAction = options.history ? ' data-action="history-resume" data-record="' + esc(JSON.stringify({title: item.title, number: item.number || item.episode, time: item.time, duration: item.duration})) + '"' : '';
            return '<button class="ya-card" data-screen="' + screen + '" data-params="' + esc(JSON.stringify(params)) + '"' + historyAction + '><span class="ya-poster">' + image + rank + '</span><span class="ya-card-title">' + esc(item.title || item.name || 'Без названия') + '</span>' + (meta ? '<span class="ya-meta">' + esc(meta) + '</span>' : '') + event + '</button>';
        }).join('') + '</div>';
    }
    var helpers = {data: data, esc: esc, button: button, go: go, cards: cards, section: section, row: row, empty: empty, notice: notice, number: number, date: date, poster: poster, current: current, memory: memory};

    function parse() {
        var parts = location.hash.slice(1).split('?'), screen = contracts[parts[0]] ? parts[0] : 'home';
        var values = new URLSearchParams(parts.slice(1).join('?'));
        var next = Object.assign({screen: screen}, defaults);
        allowed.forEach(function (key) { if (values.has(key)) next[key] = values.get(key); });
        if (!stateNames[next.state]) next.state = 'ready';
        next.settings = settings;
        return next;
    }
    function navigate(screen, params, replace) {
        if (!contracts[screen]) return;
        closeDialog();
        var base = view && screen === view.screen ? view : Object.assign({}, defaults);
        if (view && ['detail', 'sources', 'episodes', 'trailers', 'player', 'comments', 'replies', 'subject-catalog'].indexOf(screen) >= 0) base = Object.assign({}, base, {selectedId: view.selectedId});
        var fields = Object.assign({}, base, params || {}), query = new URLSearchParams();
        allowed.forEach(function (key) { if (fields[key] !== defaults[key] && fields[key] !== undefined && fields[key] !== null) query.set(key, fields[key]); });
        var hash = '#' + screen + (query.toString() ? '?' + query.toString() : '');
        if (hash === location.hash) { render(); return; }
        if (replace) location.replace(hash); else location.hash = hash;
    }
    function openDialog(title, body) {
        modalOrigin = document.activeElement;
        document.getElementById('ya-dialog-title').textContent = title;
        document.getElementById('ya-dialog-body').innerHTML = body;
        if (!dialog.open) dialog.showModal();
        var first = dialog.querySelector('button:not([disabled]),input,select');
        if (first) first.focus();
    }
    function closeDialog() { if (dialog.open) dialog.close(); }
    dialog.addEventListener('close', function () { if (modalOrigin && document.contains(modalOrigin)) modalOrigin.focus(); });
    function allowedStates(screen) { return contracts[screen].previewStates || ['ready', 'example', 'loading', 'empty', 'error', 'guest']; }
    function updateControls() {
        var select = document.getElementById('ya-screen-select');
        select.innerHTML = Object.keys(contracts).map(function (key) { return '<option value="' + esc(key) + '"' + (key === view.screen ? ' selected' : '') + '>' + esc(contracts[key].title) + '</option>'; }).join('');
        var states = document.getElementById('ya-state-select');
        states.innerHTML = allowedStates(view.screen).map(function (key) { return '<option value="' + key + '"' + (key === view.state ? ' selected' : '') + '>' + esc(stateNames[key]) + '</option>'; }).join('');
        var labels = [['home', 'Главная'], ['catalog', 'Каталог'], ['user-lists', 'Мои списки'], ['continue', 'Продолжить'], ['schedule', 'Расписание'], ['top', 'Топ аниме'], ['collections', 'Коллекции']];
        document.getElementById('ya-navigation').innerHTML = labels.map(function (pair) { return button(pair[1], {'data-screen': pair[0], 'aria-current': view.screen === pair[0] ? 'page' : undefined}); }).join('') + button('Ещё', {'data-action': 'more'});
        document.getElementById('ya-data-label').textContent = view.state === 'example' ? 'Обезличенный пример из тестов. Это не ваш аккаунт.' : privateScreens.indexOf(view.screen) >= 0 || ['continue', 'history', 'auth'].indexOf(view.screen) >= 0 ? 'Личные данные не запрашивались. Действия макета не отправляются на сайт.' : 'Публичный снимок данных 24–25 октября 2026. Действия макета не отправляются на сайт.';
    }
    function proof() {
        var info = contracts[view.screen] || {};
        function list(title, values) { return values && values.length ? '<h3>' + esc(title) + '</h3><ul>' + values.map(function (value) { return '<li>' + esc(typeof value === 'string' ? value : JSON.stringify(value)) + '</li>'; }).join('') + '</ul>' : ''; }
        var sources = (info.sources || []).map(function (item) { return typeof item === 'string' ? item : (item.path || item.file || '') + ' · ' + (item.function || item.symbol || ''); });
        return '<h2>' + esc(info.title) + '</h2><p><strong>Представление:</strong> ' + esc(info.component) + '</p><p><strong>Маршрут:</strong> ' + esc(info.route) + '</p>' + list('Источники в проекте', sources) + list('Данные', info.endpoints || []) + list('Поддерживаемые действия', info.actions || []) + list('Ограничения', info.constraints || []) + '<p>Файлы <a href="content-inventory.json">content-inventory.json</a> и <a href="account-audit.json">account-audit.json</a> содержат подробную карту полей и функций. Заполненные личные примеры взяты из tests/fixtures/yani-api; профиль и статистика пользователя не загружались.</p>';
    }
    function stateContent() {
        var title = contracts[view.screen].title;
        if (view.state === 'loading') return empty('Загрузка…', title + ': данные ещё загружаются.', button('Показать результат', {'data-action': 'state-ready'}));
        if (view.state === 'error' && ['auth', 'player'].indexOf(view.screen) < 0) return empty('Не удалось загрузить раздел', 'Проверьте соединение и повторите попытку.', button('Повторить', {'data-action': 'state-ready'}, 'ya-button ya-button--accent'));
        return null;
    }
    function render() {
        var old = view;
        if (old && document.activeElement && content.contains(document.activeElement)) focusKeys[old.screen] = document.activeElement.getAttribute('data-focus-key') || '';
        view = parse();
        if (allowedStates(view.screen).indexOf(view.state) < 0) view.state = 'ready';
        if (old && old.screen !== view.screen && !navigatingBack) {
            var savedParams = {};
            allowed.forEach(function (key) { savedParams[key] = old[key]; });
            routeTrail.push({screen: old.screen, params: savedParams});
        }
        navigatingBack = false;
        previousRoute = view.screen;
        view.notificationsRead = memory.readNotifications;
        view.notificationReadIds = memory.notificationReadIds;
        view.notificationsCleared = memory.clearedNotifications;
        helpers.view = view;
        document.title = 'YummyAnime · ' + contracts[view.screen].title + ' — макет';
        updateControls();
        var html = stateContent();
        if (!html) html = views[view.screen] ? views[view.screen](helpers) : empty('Экран недоступен', 'Проверьте файлы макета.');
        content.innerHTML = html;
        document.getElementById('ya-provenance').innerHTML = proof();
        Array.prototype.forEach.call(content.querySelectorAll('button,input,select,a[href]'), function (element, index) { element.setAttribute('data-focus-key', view.screen + ':' + index); });
        Array.prototype.forEach.call(content.querySelectorAll('img'), function (element) { element.addEventListener('error', function () { element.hidden = true; element.parentNode.classList.add('ya-poster--missing'); }); });
        var saved = focusKeys[view.screen], restore = saved && content.querySelector('[data-focus-key="' + saved + '"]');
        if (restore) restore.focus({preventScroll: true});
        else main.scrollTop = 0;
    }
    function optionDialog(title, options, callback) {
        openDialog(title, '<div class="ya-menu">' + options.map(function (item, index) { return button(item.title || item.label || String(item.value), {'data-action': 'modal-choice', 'data-value': index}); }).join('') + '</div>');
        modalChoice = function (index) { var selected = options[Number(index)]; if (selected) callback(selected); };
    }
    var modalChoice;
    function message(title, text) { openDialog(title, '<p>' + esc(text) + '</p>'); }
    function handleAction(action, element) {
        var key = element.getAttribute('data-key'), value = element.getAttribute('data-value');
        if (action === 'close-dialog') closeDialog();
        else if (action === 'modal-choice') { var callback = modalChoice; closeDialog(); if (callback) callback(value); }
        else if (action === 'provenance') { var pane = document.getElementById('ya-provenance'); pane.hidden = !pane.hidden; if (!pane.hidden) pane.scrollIntoView({block: 'nearest'}); }
        else if (action === 'screen-map' || action === 'more') {
            var order = action === 'more' ? ['genres', 'new-translations', 'new-releases', 'recommended', 'updates', 'notifications', 'history', 'account', 'subscriptions', 'status', 'settings', 'policy'] : Object.keys(contracts);
            openDialog(action === 'more' ? 'Ещё' : 'Все экраны плагина', '<div class="ya-menu">' + order.map(function (screen) { return go(contracts[screen].title, screen, {state: 'ready'}); }).join('') + '</div>');
        }
        else if (action === 'show-example') navigate(view.screen, {state: 'example'});
        else if (action === 'state-ready' || action === 'status-refresh') navigate(view.screen, {state: 'ready'});
        else if (action === 'status-period') navigate(view.screen, {period: value});
        else if (action === 'list-sort') navigate(view.screen, {sort: value});
        else if (action === 'run-search') { var input = document.getElementById('ya-search-query'); navigate('search', {query: input ? input.value.trim().slice(0, 200) : '', state: 'ready'}); }
        else if (action === 'playback-choice' || action === 'playback-defaults') {
            var playbackChoice = null;
            try { playbackChoice = JSON.parse(element.getAttribute('data-record') || 'null'); } catch (ignore) {}
            if (!playbackChoice || typeof playbackChoice.voice !== 'string' || typeof playbackChoice.player !== 'string') return;
            var pair = {voice: playbackChoice.voice.slice(0, 160), player: playbackChoice.player.slice(0, 160)};
            if (action === 'playback-choice') memory.playbackChoices[String(view.selectedId)] = pair;
            else memory.playbackDefaults = pair;
            navigate('sources', {sourceIndex: value || view.sourceIndex, choice: '', optionPage: '', episodePage: '0'});
            if (action === 'playback-defaults') message('Настройки по умолчанию', 'Выбор сохранён в памяти макета до перезагрузки страницы. Настройки телевизора и аккаунта не менялись.');
        }
        else if (action === 'playback-reset') {
            delete memory.playbackChoices[String(view.selectedId)];
            navigate('sources', {sourceIndex: '0', choice: '', optionPage: '', episodePage: '0'});
        }
        else if (action === 'top-type') navigate('top', {topType: value, state: 'ready'});
        else if (action === 'catalog-filter') {
            var choices = {type: [['Все типы', ''], ['Сериал', 'tv'], ['Фильм', 'movie'], ['Короткометражный фильм', 'shortfilm'], ['OVA', 'ova'], ['ONA', 'ona'], ['Спешл', 'special'], ['Короткий сериал', 'shorttv']], status: [['Все статусы', ''], ['Онгоинг', 'ongoing'], ['Завершено', 'released'], ['Анонс', 'announcement']], year: [['Все годы', ''], ['2026', '2026'], ['Последние 3 года', 'last3'], ['Последние 5 лет', 'last5'], ['С 2020 года', 'from2020'], ['С 2010 года', 'from2010']], sort: [['Топ', 'top'], ['Новизна', 'new'], ['Оценка', 'rating'], ['Количество оценок', 'votes'], ['Просмотры', 'views'], ['Название', 'title'], ['Случайно', 'random']]};
            var options = (choices[key] || []).map(function (item) { return {title: item[0], value: item[1]}; });
            optionDialog('Выберите значение', options, function (item) { var params = {}; params[key] = item.value; navigate(view.screen, params); });
        }
        else if (action === 'rating-menu') optionDialog('Моя оценка', Array.from({length: 10}, function (_, index) { return {title: String(10 - index), value: 10 - index}; }).concat([{title: 'Удалить оценку', value: ''}]), function () { message('Пример действия', 'Оценка в аккаунте не изменена. Макет показывает поддерживаемый выбор оценки и её удаление.'); });
        else if (action === 'list-menu') optionDialog('Добавить в список', [['Смотрю', 0], ['В планах', 1], ['Просмотрено', 2], ['Брошено', 3], ['Отложено', 5], ['Удалить из списка', null]].map(function (item) { return {title: item[0], value: item[1]}; }), function () { message('Пример действия', 'Список на сайте не изменён. Любимое выбирается отдельно от основного статуса.'); });
        else if (action === 'lampa-card') message('Карточка Lampa', 'В рабочем плагине откроется стандартная карточка Lampa при доступном сопоставлении. Макет показывает только экраны YummyAnime.');
        else if (action === 'detail-category') {
            var animeId = element.getAttribute('data-id'), category = Number(value);
            memory.categories = memory.categories || {};
            var record = memory.categories[animeId] || (memory.categories[animeId] = {});
            if (category === 4) record.favorite = !record.favorite;
            else { record.list = record.list === category ? null : category; record.known = true; }
            render();
        }
        else if (action === 'detail-subscribe') message('Подписка на серии', 'В рабочем плагине создаётся подписка на новые серии. Этот макет не изменяет аккаунт.');
        else if (action === 'favorite') message('Любимое', 'В плагине это независимая отметка. Макет не отправляет изменение в аккаунт.');
        else if (action === 'description') message('Описание', current().description || 'Описание не получено.');
        else if (action === 'more-detail') openDialog('Действия', '<div class="ya-menu">' + go('Комментарии', 'comments', {state: 'example'}) + go('Трейлеры', 'trailers') + button('Карточка Lampa', {'data-action': 'lampa-card'}) + '</div>');
        else if (action === 'notifications-read') { memory.readNotifications = true; render(); }
        else if (action === 'notifications-clear') { memory.clearedNotifications = true; render(); }
        else if (action === 'notification-open') { memory.notificationReadIds[element.getAttribute('data-id')] = true; render(); message('Уведомление', 'Пример помечен прочитанным. Переход к аниме в плагине доступен только при распознанной цели; макет не открывает произвольные ссылки.'); }
        else if (action === 'history-resume') {
            var record = {}; try { record = JSON.parse(element.getAttribute('data-record') || '{}'); } catch (ignore) {}
            openDialog('Продолжить просмотр', '<p>' + esc(record.title || '') + '</p><p>' + esc('Серия ' + (record.number || '—') + ' · сохранено ' + Math.floor(Number(record.time || 0) / 60) + ':' + String(Math.floor(Number(record.time || 0) % 60)).padStart(2, '0')) + '</p><p>Рабочий плагин использует сохранённые серию, источник и позицию. Видео из примера не запускается.</p>' + go('Посмотреть макет выбора озвучки', 'sources', {selectedId: String(data.detail.anime_id), state: 'ready'}));
        }
        else if (action === 'demo-login') message('Авторизация в макете', 'В рабочем плагине используются логин/email и пароль YummyAnime. Не вводите настоящий пароль в макет: он не подключён к аккаунту.');
        else if (action === 'demo-logout') { memory.demoAuthorized = false; navigate('auth', {state: 'guest'}); }
        else if (action === 'demo-sync') message('Синхронизация', 'В плагине это ручная синхронизация истории, когда автоматическая выключена. В макете история не меняется.');
        else if (action === 'toggle-setting') { settings[key] = !(settings[key] !== undefined ? settings[key] : element.getAttribute('aria-pressed') === 'true'); render(); }
        else if (action === 'setting-choice') {
            var optionsValue;
            try { optionsValue = JSON.parse(element.getAttribute('data-options') || '[]'); } catch (ignore) { optionsValue = []; }
            optionDialog('Выбор настройки', optionsValue.map(function (item) { return Array.isArray(item) ? {value: item[0], title: item[1]} : typeof item === 'string' ? {title: item, value: item} : item; }), function (item) { settings[key] = item.value; render(); });
        }
        else if (action === 'setting-edit' || action === 'setting-check') message('Интеграция', 'В рабочем плагине можно указать адрес своего сервера и проверить его доступность. Макет сетевые настройки не меняет.');
        else if (action === 'demo-clear-history') { message('Локальная история', 'В рабочем плагине очищается только история на этом устройстве. Серверная история YummyAnime остаётся.'); }
        else if (action === 'policy-close') navigate('settings');
        else if (action === 'about-site') message('Официальный сайт', 'YummyAnime: https://ru.yummyani.me/');
        else if (action === 'load-more') message('Ещё', 'Плагин поддерживает загрузку следующей страницы. В макете сохранён ограниченный снимок без вымышленного общего количества.');
        else if (action === 'play' || action === 'play-demo' || action === 'player-action') message('Воспроизведение', 'Управление доступным видео предоставляет плеер Lampa или плеер источника. Макет не запускает видео.');
        else if (action === 'schedule-day') navigate('schedule', {day: value});
        else message('Пример действия', 'Действие доступно в рабочем плагине. Изменения из макета не отправляются на сайт.');
    }
    document.addEventListener('click', function (event) {
        var element = event.target.closest('button');
        if (!element) return;
        var screen = element.getAttribute('data-screen'), action = element.getAttribute('data-action');
        if (screen && !action) { var params = {}; try { params = JSON.parse(element.getAttribute('data-params') || '{}'); } catch (ignore) {} navigate(screen, params); }
        else if (action) handleAction(action, element);
    });
    document.getElementById('ya-screen-select').addEventListener('change', function () { navigate(this.value, {state: 'ready'}); });
    document.getElementById('ya-state-select').addEventListener('change', function () { navigate(view.screen, {state: this.value}); });
    function spatial(direction) {
        var root = dialog.open ? dialog : document.querySelector('.ya-shell');
        var currentElement = document.activeElement, rect = currentElement && currentElement.getBoundingClientRect();
        var elements = Array.prototype.filter.call(root.querySelectorAll('button:not([disabled]),input:not([disabled]),select,a[href]'), function (element) { return element.getClientRects().length && !element.closest('[hidden]'); });
        if (!rect || !root.contains(currentElement)) { if (elements[0]) elements[0].focus(); return; }
        var x = rect.left + rect.width / 2, y = rect.top + rect.height / 2, best, distance = Infinity;
        elements.forEach(function (element) {
            if (element === currentElement) return;
            var box = element.getBoundingClientRect(), dx = box.left + box.width / 2 - x, dy = box.top + box.height / 2 - y;
            var forward = direction === 'right' ? dx : direction === 'left' ? -dx : direction === 'up' ? -dy : dy;
            var cross = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx);
            var score = forward + cross * 3;
            if (forward > 4 && score < distance) { best = element; distance = score; }
        });
        if (best) { best.focus({preventScroll: true}); best.scrollIntoView({block: 'nearest', inline: 'nearest'}); }
    }
    document.addEventListener('keydown', function (event) {
        var tag = document.activeElement && document.activeElement.tagName;
        if (tag === 'INPUT' && event.key === 'Enter') { event.preventDefault(); handleAction('run-search', document.activeElement); return; }
        if (tag === 'INPUT' || tag === 'SELECT') return;
        var directions = {ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down'};
        if (directions[event.key]) { event.preventDefault(); spatial(directions[event.key]); }
        else if (event.key === 'Escape' || event.key === 'Backspace') {
            event.preventDefault();
            if (dialog.open) closeDialog();
            else { var back = routeTrail.length ? routeTrail.pop() : {screen: 'home', params: {}}; navigatingBack = true; navigate(back.screen, back.params); }
        }
    });
    window.addEventListener('hashchange', render);

    views.schedule = function (h) {
        var records = data.schedule || [], dates = {};
        records.forEach(function (item) { [item.episodes && item.episodes.prev_date, item.episodes && item.episodes.next_date].filter(Boolean).forEach(function (stamp) { var day = new Date(Number(stamp) * 1000).toLocaleDateString('en-CA', {timeZone: 'Asia/Almaty'}); dates[day] = true; }); });
        var keys = Object.keys(dates).sort(), selected = view.day || (keys.indexOf('2026-10-24') >= 0 ? '2026-10-24' : keys[0]);
        var tabs = '<div class="ya-tabs">' + keys.slice(0, 7).map(function (day) { return button(new Date(day + 'T12:00:00+05:00').toLocaleDateString('ru-RU', {weekday: 'short', day: 'numeric', month: 'short'}), {'data-action': 'schedule-day', 'data-value': day, 'aria-pressed': day === selected}, 'ya-chip'); }).join('') + '</div>';
        var rows = [];
        records.forEach(function (item) { ['prev_date', 'next_date'].forEach(function (field) { var stamp = item.episodes && item.episodes[field]; if (!stamp || new Date(Number(stamp) * 1000).toLocaleDateString('en-CA', {timeZone: 'Asia/Almaty'}) !== selected) return; var episode = Number(item.episodes.aired || 0) + (field === 'next_date' ? 1 : 0); rows.push(row(item.title, [episode ? 'Серия ' + episode : '', date(stamp), field === 'next_date' ? 'Ожидаемый эфир' : 'Предыдущий эфир'].filter(Boolean).join(' · '), go('Открыть аниме', 'detail', {selectedId: item.anime_id}))); }); });
        return '<div class="ya-toolbar"><h1>Расписание</h1></div>' + tabs + (view.state === 'empty' || !rows.length ? empty('Нет запланированных выпусков', 'Для выбранного дня нет записей в сохранённом расписании.') : '<div class="ya-panel">' + rows.join('') + '</div>');
    };
    render();
}(window, document));

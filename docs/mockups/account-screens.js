/* Private and service screens for the reviewable, offline TV prototype.
 * Personal examples come only from tests/fixtures/yani-api; no account request.
 * Shared shell, escaping and native-button behavior are provided by the host. */
(function (root) {
    'use strict';

    var categories = [
        {key: 'watching', id: 0, title: 'Смотрю'},
        {key: 'planned', id: 1, title: 'В планах'},
        {key: 'completed', id: 2, title: 'Просмотрено'},
        {key: 'dropped', id: 3, title: 'Брошено'},
        {key: 'favorites', id: 4, title: 'Любимое'},
        {key: 'postponed', id: 5, title: 'Отложено'}
    ];

    function array(value) {
        if (Array.isArray(value)) return value;
        if (!value || typeof value !== 'object') return [];
        if (value.response !== undefined) return array(value.response);
        return array(value.items || value.data || value.anime || []);
    }

    function fixture(h, key) {
        var fixtures = h.data.fixtures || {};
        var raw = fixtures.raw || {};
        return fixtures[key] || raw[key] || {};
    }

    function example(h) { return h.view.state === 'example'; }
    function wrap(body) { return '<div class="ya-private-view">' + body + '</div>'; }
    function panel(body) { return '<div class="ya-panel">' + body + '</div>'; }
    function params(h, extra) {
        var result = example(h) ? {state: 'example'} : {};
        Object.keys(extra || {}).forEach(function (key) { result[key] = extra[key]; });
        return result;
    }
    function heading(h, title, actions) {
        return '<div class="ya-toolbar"><h1>' + h.esc(title) + '</h1>' + (actions || '') + '</div>';
    }
    function demoButton(h, route, text) {
        return h.button(text || 'Показать пример', {'data-action': 'show-example', 'data-screen': route});
    }
    function guest(h, route, title, hint) {
        return h.empty(title, hint || 'В макете аккаунт не подключён. Личные данные не загружались.',
            h.go('Войти', 'auth') + demoButton(h, route));
    }
    function failedOrLoading(h, route, title) {
        if (h.view.state === 'loading') return h.notice('Загрузка…');
        if (h.view.state === 'error' || h.view.state === 'offline') {
            return h.empty('Не удалось загрузить ' + title.toLowerCase(), 'В макете сетевые запросы аккаунта не выполняются.', demoButton(h, route));
        }
        return '';
    }
    function stats(h, entries) {
        return '<div class="ya-stats">' + entries.map(function (entry) {
            return '<div class="ya-stat"><strong>' + h.esc(entry[1]) + '</strong><span class="ya-meta">' + h.esc(entry[0]) + '</span></div>';
        }).join('') + '</div>';
    }
    function category(h) {
        return categories.filter(function (item) { return item.key === h.view.category; })[0] || categories[0];
    }
    function listRows(h) {
        var lists = fixture(h, 'lists');
        return array(lists.list_items || lists.listItems || lists);
    }
    function listUser(raw) { return raw.user || (raw.anime && raw.anime.user) || {}; }
    function inCategory(raw, selected) {
        var list = listUser(raw).list || {};
        if (selected.key === 'favorites') return !!list.is_fav;
        return Number((list.list || {}).id) === selected.id;
    }
    function poster(value) {
        if (typeof value === 'string') return value;
        return value && (value.medium || value.small || value.big || value.huge || value.full) || '';
    }
    function listCard(raw) {
        var anime = raw.anime || raw;
        var user = listUser(raw);
        var list = user.list || {};
        var episodes = anime.episodes || {};
        var total = Number(episodes.count || episodes.total || 0);
        var watched = Number(list.watched_episodes || list.episodes_watched || list.watched || list.progress || 0);
        var card = {};
        Object.keys(anime).forEach(function (key) { card[key] = anime[key]; });
        card.id = card.anime_id = anime.anime_id || anime.id || raw.anime_id;
        card.title = card.name = anime.title || anime.name || 'Без названия';
        card.poster_url = poster(anime.poster || anime.image);
        card.poster = card.poster_url;
        card.user = user;
        card.yani_list_progress = total ? Math.min(1, watched / total) : 0;
        card.watched_episodes = watched;
        card.total_episodes = total;
        card.date = raw.date || anime.date;
        return card;
    }
    function historyRows(h) {
        if (Array.isArray(h.data.history)) return h.data.history;
        var source = fixture(h, 'history');
        return array(source.watch_history || source).map(function (raw) {
            var time = Number(raw.end_time || raw.time || 0);
            var duration = Number(raw.duration || 0);
            return {
                id: raw.anime_id || raw.animeId,
                anime_id: raw.anime_id || raw.animeId,
                title: raw.title || raw.anime_title,
                name: raw.title || raw.anime_title,
                poster: poster(raw.poster),
                poster_url: poster(raw.poster),
                episode: raw.episode || raw.number,
                episode_title: raw.ep_title,
                time: time,
                duration: duration,
                progress: duration ? time / duration : 0,
                yani_list_progress: duration ? time / duration : 0,
                yani_resume_episode: raw.episode || raw.number,
                dub: raw.dub_title || raw.dubbing,
                player: raw.player_title || raw.player,
                date: raw.date || raw.updated_at,
                video_id: raw.video_id || raw.videoId
            };
        });
    }
    function categoryNav(h, selected) {
        return '<div class="ya-tabs" aria-label="Категории аниме">' + categories.map(function (item) {
            return h.go(item.title, 'account-list', params(h, {category: item.key}), 'ya-chip' + (item.key === selected.key ? ' is-active' : ''));
        }).join('') + '</div>';
    }
    function dateText(h, value) { return value ? h.date(value) : '—'; }
    function plain(value) {
        return String(value || '').replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]*>/g, '')
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
    }

    var views = {};

    views.account = function (h) {
        var top = heading(h, 'Аккаунт', h.go('Уведомления', 'notifications', params(h)) + h.go('Настройки', 'settings'));
        var state = failedOrLoading(h, 'account', 'Аккаунт');
        if (state) return wrap(top + state);
        var rows = example(h) ? listRows(h) : [];
        var info = h.row('Профиль YummyAnime', 'Данные профиля не загружены', h.go('Войти', 'auth'));
        info += h.row('ID аккаунта', '—');
        info += h.row('Регистрация', '—') + h.row('Последний вход', '—');
        info += h.row('Роли', '—') + h.row('Сообщения', '—');
        var body = panel(info);
        if (!example(h)) body = guest(h, 'account', 'Вход не выполнен') + body;
        else body = h.notice('Показана структура аккаунта. В репозитории нет фикстуры профиля: имя, аватар и личные показатели не подставляются.') + body;
        body += h.section('Мои списки', panel(categories.map(function (item) {
            var count = example(h) ? rows.filter(function (raw) { return inCategory(raw, item); }).length : '—';
            return h.row(item.title, String(count), h.go('Открыть', 'account-list', params(h, {category: item.key})));
        }).join('')), h.go('Все категории', 'user-lists', params(h)));
        body += h.section('Статистика', panel(stats(h, [['Аниме в списках', example(h) ? h.number(rows.length) : '—'], ['Время просмотра', '—']]) +
            '<p class="ya-meta">Жанры, оценки и типы появятся, когда аккаунт вернёт статистику.</p>'));
        body += h.section('Аккаунт', panel(h.row('Подписки', 'Аниме, на которые вы подписаны', h.go('Открыть', 'subscriptions', params(h))) +
            h.row('Мои рецензии', 'Данные рецензий не загружены') +
            ((h.view.settings || {}).yani_auto_sync_progress === false ? h.row('Синхронизация истории', 'Ручная синхронизация доступна при выключенной автоматической', h.button('Синхронизировать', {'data-action': 'demo-sync'})) : '')));
        return wrap(top + body);
    };

    views['user-lists'] = function (h) {
        var top = heading(h, 'Мои списки', h.go('История', 'history', params(h)));
        var state = failedOrLoading(h, 'user-lists', 'Списки');
        if (state) return wrap(top + state);
        if (!example(h)) return wrap(top + guest(h, 'user-lists', 'Списки не загружены'));
        var rows = listRows(h);
        var body = categories.map(function (item) {
            var cards = rows.filter(function (raw) { return inCategory(raw, item); }).map(listCard);
            return h.section(item.title + ' · ' + h.number(cards.length), cards.length ? h.cards(cards.slice(0, 10), {example: true}) :
                panel('<span class="ya-meta">В примере эта категория пуста</span>'),
                h.go('Открыть список', 'account-list', params(h, {category: item.key})));
        }).join('');
        var history = historyRows(h);
        body += h.section('История просмотра · ' + h.number(history.length), h.cards(history.slice(0, 10), {history: true, example: true}), h.go('Вся история', 'history', params(h)));
        return wrap(top + body);
    };

    views['account-list'] = function (h) {
        var selected = category(h);
        var top = heading(h, selected.title, h.go('Мои списки', 'user-lists', params(h))) + categoryNav(h, selected);
        var state = failedOrLoading(h, 'account-list', 'Список');
        if (state) return wrap(top + state);
        if (!example(h)) return wrap(top + guest(h, 'account-list', 'Список не загружен'));
        var sorts = [['recent', 'По добавлению'], ['progress', 'По прогрессу'], ['rating', 'По рейтингу'], ['year', 'По году'], ['title', 'По названию']];
        var sort = h.view.sort || 'recent';
        var controls = '<div class="ya-toolbar" aria-label="Сортировка">' + sorts.map(function (item) {
            return h.button(item[1], {'data-action': 'list-sort', 'data-value': item[0], 'aria-pressed': String(sort === item[0])}, 'ya-chip');
        }).join('') + '</div>';
        var cards = listRows(h).filter(function (raw) { return inCategory(raw, selected); }).map(listCard);
        cards.sort(function (a, b) {
            if (sort === 'title') return a.title.localeCompare(b.title, 'ru');
            if (sort === 'progress') return b.yani_list_progress - a.yani_list_progress;
            if (sort === 'rating') return Number((b.rating || {}).average || 0) - Number((a.rating || {}).average || 0);
            if (sort === 'year') return Number(b.year || 0) - Number(a.year || 0);
            return Number(b.date || 0) - Number(a.date || 0);
        });
        return wrap(top + controls + '<p class="ya-meta">' + h.number(cards.length) + ' аниме</p>' +
            (cards.length ? h.cards(cards.slice(0, 30), {example: true}) : h.empty('Здесь пока пусто', 'В фикстуре нет аниме в категории «' + selected.title + '».', h.go('Мои списки', 'user-lists', params(h)))));
    };

    function historyView(h, continuing) {
        var route = continuing ? 'continue' : 'history';
        var title = continuing ? 'Продолжить просмотр' : 'История просмотра';
        var top = heading(h, title, h.go(continuing ? 'Вся история' : 'Продолжить просмотр', continuing ? 'history' : 'continue', params(h)));
        var state = failedOrLoading(h, route, title);
        if (state) return wrap(top + state);
        if (!example(h)) return wrap(top + guest(h, route, continuing ? 'Нет сохранённого прогресса' : 'История не загружена',
            'В приложении здесь объединяются просмотры на устройстве и в аккаунте. В этом макете ваша история не загружалась.'));
        var rows = historyRows(h).filter(function (row) {
            if (!continuing) return true;
            var progress = row.progress !== undefined ? Number(row.progress) : row.yani_list_progress !== undefined ? Number(row.yani_list_progress) :
                Number(row.duration) > 0 ? Number(row.time || 0) / Number(row.duration) : 0;
            return progress < 0.95;
        });
        return wrap(top + (rows.length ? h.cards(rows.slice(0, 30), {history: true, example: true}) :
            h.empty('Здесь пока пусто', continuing ? 'В примере нет незавершённых серий.' : 'В примере нет записей истории.')));
    }
    views['continue'] = function (h) { return historyView(h, true); };
    views.history = function (h) { return historyView(h, false); };

    views.subscriptions = function (h) {
        var top = heading(h, 'Подписки', h.go('Аккаунт', 'account', params(h)));
        var state = failedOrLoading(h, 'subscriptions', 'Подписки');
        if (state) return wrap(top + state);
        return wrap(top + (example(h) ? h.empty('Подписки не загружены', 'В репозитории нет примера подписок. После входа приложение показывает здесь сетку аниме из аккаунта.', h.go('Войти', 'auth')) :
            guest(h, 'subscriptions', 'Подписки не загружены')));
    };

    views.notifications = function (h) {
        var top = heading(h, 'Уведомления', h.go('Аккаунт', 'account', params(h)));
        var state = failedOrLoading(h, 'notifications', 'Уведомления');
        if (state) return wrap(top + state);
        if (!example(h)) return wrap(top + guest(h, 'notifications', h.view.state === 'empty' ? 'Нет уведомлений' : 'Уведомления не загружены'));
        var rows = h.view.notificationsCleared ? [] : array(fixture(h, 'notifications'));
        if (!rows.length) return wrap(top + h.empty('Нет уведомлений', 'В примере список пуст.'));
        var readAll = !!h.view.notificationsRead;
        var readIds = h.view.notificationReadIds || {};
        var unread = rows.filter(function (item) { return !(readAll || readIds[String(item.id)] || item.viewed || item.read); }).length;
        var toolbar = '<div class="ya-toolbar"><span class="ya-meta">Непрочитанных в загруженных: ' + h.number(unread) + '</span>' +
            h.button('Прочитать всё', {'data-action': 'notifications-read', disabled: unread ? null : 'disabled'}) +
            h.button('Удалить всё', {'data-action': 'notifications-clear'}) + '</div>';
        var groups = {};
        var now = new Date();
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        rows.forEach(function (item) {
            var value = item.date || item.date_seconds || item.dateSeconds;
            var stamp = typeof value === 'number' ? value * (value < 100000000000 ? 1000 : 1) : Date.parse(value);
            var group = stamp >= today ? 'Сегодня' : stamp >= today - 86400000 ? 'Вчера' : 'Ранее';
            (groups[group] || (groups[group] = [])).push(item);
        });
        var body = ['Сегодня', 'Вчера', 'Ранее'].map(function (group) {
            if (!groups[group]) return '';
            return h.section(group, panel(groups[group].map(function (item) {
                var type = String(item.type || '') + ' ' + String(item.sub_type || '');
                var kind = /episode/.test(type) ? 'Серия' : /comment/.test(type) ? 'Комментарий' : /social/.test(type) ? 'Сообщество' : /news/.test(type) ? 'Новость' : 'Система';
                var title = plain(item.title_html || item.titleHtml || item.title);
                var text = plain(item.text_html || item.textHtml || item.text || item.message);
                var isUnread = !(readAll || readIds[String(item.id)] || item.viewed || item.read);
                var meta = (isUnread ? 'Не прочитано · ' : '') + kind + ' · ' + dateText(h, item.date || item.date_seconds || item.dateSeconds);
                return '<div class="ya-row"><div><strong>' + h.esc(title) + '</strong><p class="ya-meta">' + h.esc(text) + '</p><span class="ya-meta">' + h.esc(meta) + '</span></div>' +
                    h.button('Открыть', {'data-action': 'notification-open', 'data-id': item.id}) + '</div>';
            }).join('')));
        }).join('');
        return wrap(top + toolbar + body);
    };

    views.auth = function (h) {
        var top = heading(h, 'Вход в YummyAnime');
        var body = h.notice('Это интерактивный макет. Он не отправляет данные в YummyAnime и не сохраняет логин или пароль. Ввод показан как демонстрация.');
        if (h.view.state === 'error') body += h.notice('Не удалось выполнить вход. Это пример сообщения об ошибке авторизации; запрос не отправлялся.');
        if (h.view.state === 'authorized') {
            body += panel(h.row('Статус', 'Демонстрация авторизованного состояния') +
                h.row('Токен аккаунта', 'Настоящего токена в макете нет', h.button('Обновить токен', {'data-action': 'demo-login', 'data-field': 'refresh'})) +
                h.row('Выход', 'Закрыть демонстрацию входа', h.button('Выйти', {'data-action': 'demo-logout'})));
        } else {
            body += panel(h.row('Никнейм или Email', 'Не введён', h.button('Ввести', {'data-action': 'demo-login', 'data-field': 'login'})) +
                h.row('Пароль', 'Не введён', h.button('Ввести', {'data-action': 'demo-login', 'data-field': 'password'})) +
                '<div class="ya-toolbar">' + h.button('Войти в аккаунт', {'data-action': 'demo-login', 'data-field': 'submit'}, 'ya-button ya-button--accent') + '</div>');
        }
        return wrap(top + body);
    };

    function statusName(value) {
        return {up: 'Доступен', down: 'Недоступен', degraded: 'Есть перебои', unknown: 'Нет данных'}[value] || 'Нет данных';
    }
    views.status = function (h) {
        var source = h.data.status || {};
        var period = h.view.period || source.default_period || '3hour';
        var snapshot = source.periods ? source.periods[period] : source;
        var top = heading(h, 'Статус сервисов', h.button('Обновить', {'data-action': 'status-refresh'}));
        if (h.view.state === 'loading') return wrap(top + h.notice('Загрузка снимка мониторинга…'));
        if (h.view.state === 'error' || h.view.state === 'offline') return wrap(top + h.empty('Статус недоступен', 'Не удалось загрузить снимок мониторинга.', h.button('Повторить', {'data-action': 'status-refresh'})));
        var periods = [['3hour', '3 часа'], ['day', 'День'], ['week', 'Неделя'], ['month', 'Месяц']];
        var tabs = '<div class="ya-toolbar" aria-label="Период мониторинга">' + periods.map(function (item) {
            return h.button(item[1], {'data-action': 'status-period', 'data-value': item[0], 'aria-pressed': String(item[0] === period)}, 'ya-chip');
        }).join('') + '</div>';
        if (h.view.state === 'empty' || !snapshot || !snapshot.summary) return wrap(top + tabs + h.empty('Нет данных мониторинга', 'В снимке нет данных для выбранного периода.'));
        var summary = snapshot.summary;
        var number = function (value, suffix) { return value === null || value === undefined ? '—' : h.number(value) + (suffix || ''); };
        var body = h.section(statusName(summary.status), panel(stats(h, [
            ['Доступность', number(summary.uptime_percent, '%')], ['Средняя задержка', number(summary.average_ms, ' мс')],
            ['Ошибки', number(summary.failed)], ['Проверки', number(summary.checks)]
        ])));
        var domains = array(snapshot.domains);
        if (domains.length) body += h.section('Сервисы', panel('<table><thead><tr><th>Сервис</th><th>Состояние</th><th>Среднее</th><th>Пинг</th></tr></thead><tbody>' + domains.map(function (item) {
            return '<tr><td data-label="Сервис"><strong>' + h.esc(item.label || item.domain) + '</strong><div class="ya-meta">' + h.esc(item.domain) + '</div></td><td data-label="Состояние">' + h.esc(statusName(item.status)) +
                '</td><td data-label="Среднее">' + h.esc(number(item.average_ms, ' мс')) + '</td><td data-label="Пинг">' + h.esc(number(item.ping_ms, ' мс')) + '</td></tr>';
        }).join('') + '</tbody></table>'));
        body += h.section('История состояний', panel(domains.map(function (item) {
            var points = array(item.history);
            var latest = points.slice(-8);
            return h.row(item.label || item.domain, latest.length ? latest.map(function (point) { return dateText(h, point.time) + ' — ' + statusName(point.status); }).join(' · ') : 'Нет данных');
        }).join('')));
        body += '<p class="ya-provenance">Снимок YummyStatus · ' + h.esc(dateText(h, snapshot.generated_at || source.generated_at)) + '. Это мониторинг сервисов, а не измерения телевизора.</p>';
        return wrap(top + tabs + body);
    };

    views.settings = function (h) {
        var settings = h.view.settings || {};
        function value(key, fallback) { return settings[key] === undefined ? fallback : settings[key]; }
        function toggle(title, key, fallback, hint) {
            var enabled = !!value(key, fallback);
            return h.row(title, hint || '', h.button(enabled ? 'Включено' : 'Выключено', {'data-action': 'toggle-setting', 'data-key': key, 'aria-pressed': String(enabled)}));
        }
        function choice(title, key, fallback, options, hint) {
            var selected = value(key, fallback);
            var label = options.filter(function (item) { return item[0] === selected; })[0];
            return h.row(title, hint || '', h.button(label ? label[1] : String(selected), {'data-action': 'setting-choice', 'data-key': key, 'data-value': selected, 'data-options': JSON.stringify(options)}));
        }
        function edit(title, key, hint) {
            return h.row(title, value(key, '') || hint, h.button('Изменить', {'data-action': 'setting-edit', 'data-key': key}));
        }
        function playbackOptions(field, fallback) {
            var names = [];
            array(h.data.videos).forEach(function (video) {
                var data = video.data || {};
                if (typeof data === 'string') { try { data = JSON.parse(data); } catch (ignore) { data = {}; } }
                var name = field === 'voice' ? data.dubbing || data.translation || data.voice : data.player || data.source || data.service;
                if (typeof name === 'string' && name && names.indexOf(name) < 0) names.push(name);
            });
            names.sort(function (left, right) { return left.localeCompare(right, 'ru'); });
            return [[fallback, 'Авто']].concat(names.map(function (name) { return [name, name]; }));
        }
        var body = h.notice('Настройки для LG/webOS. Переключения в макете показывают поведение интерфейса; настройки телевизора и плагина не меняются.');
        body += h.section('Аккаунт и синхронизация', panel(h.row('Статус', 'Вход не выполнен', h.go('Войти', 'auth')) +
            toggle('Автосинхронизация прогресса', 'yani_auto_sync_progress', true, 'Сохранять прогресс внутреннего плеера и подтягивать историю аккаунта')));
        body += h.section('Интерфейс', panel(choice('Язык / Language', 'yani_language', 'ru', [['ru', 'Русский'], ['uk', 'Українська'], ['en', 'English']], 'Язык интерфейса расширения')));
        body += h.section('Воспроизведение', panel(
            choice('Источник видео по умолчанию', 'yani_default_source', 'auto', playbackOptions('source', 'auto'), 'Общий выбор для аниме без отдельных предпочтений') +
            choice('Озвучка по умолчанию', 'yani_default_voice', '', playbackOptions('voice', ''), 'Озвучки из загруженного снимка; отдельный выбор аниме имеет приоритет') +
            h.row('Плеер', 'Внутренний плеер Lampa · LG/webOS') +
            choice('Пропуск опенинга и эндинга', 'yani_aniskip', 'off', [['off', 'Выключено'], ['op', 'Только опенинги'], ['ed', 'Только эндинги'], ['op_ed', 'Опенинги и эндинги'], ['suggest', 'Предлагать пропуск']], 'Тайминги AniSkip · только внутренний плеер') +
            toggle('Автопереход к следующей серии', 'yani_auto_next', false) +
            toggle('Добавлять в историю Lampa', 'yani_add_to_lampa_history', true) +
            h.row('Очистить историю просмотра', 'Удалить сохранённые последние серии только на этом устройстве', h.button('Очистить', {'data-action': 'demo-clear-history'}))));
        body += h.section('Источники', panel([
            toggle('Kodik', 'yani_source_kodik', true), toggle('VK', 'yani_source_vk', true),
            toggle('Alloha', 'yani_source_alloha', false, 'Экспериментальный источник'),
            toggle('CVH', 'yani_source_cvh', true, 'Экспериментальный источник'),
            toggle('Sibnet', 'yani_source_sibnet', true), toggle('Aksor', 'yani_source_aksor', true)
        ].join('')));
        body += h.section('Дополнительные возможности', panel(edit('Сервер резолвера YummyAnime', 'yani_resolver_server', 'Не настроен') +
            (value('yani_resolver_server', '') ? h.row('Проверить резолвер', 'Проверка /health настроенного сервера', h.button('Проверить', {'data-action': 'setting-check', 'data-key': 'yani_resolver_server'})) : '') +
            edit('Сервер Lampac', 'yani_lampac_server', 'Не настроен') +
            toggle('Плеер Alloha в iframe', 'yani_alloha_iframe', false)));
        body += h.section('Карточка Lampa', panel(toggle('Рейтинг YummyAnime', 'yani_lampa_card_rating', true, 'Показывать на обычной карточке Lampa') +
            toggle('Кнопка YummyAnime', 'yani_lampa_card_button', true, 'Показывать кнопку с логотипом на карточке Lampa')));
        var sections = [['catalog', 'Каталог'], ['genres', 'Жанры'], ['search', 'Поиск'], ['schedule', 'Расписание'], ['new_translations', 'Новые переводы'],
            ['continue_watching', 'Продолжить просмотр'], ['user_lists', 'Мои списки'], ['new_releases', 'Новые релизы'], ['top_rated', 'Высокий рейтинг'],
            ['for_you', 'Для вас'], ['updates', 'Обновления'], ['collections', 'Коллекции'], ['notifications', 'Уведомления'], ['account', 'Аккаунт'], ['status', 'Статус сервисов']];
        body += h.section('Разделы главной', panel(sections.map(function (item) { return toggle(item[1], 'yani_section_' + item[0], true); }).join('')));
        body += h.section('О расширении', panel(h.row('YummyAnime for Lampa', 'Официальный сайт YummyAnime', h.button('Открыть сайт', {'data-action': 'about-site'})) +
            h.row('Политика использования', 'Правила использования расширения', h.go('Открыть', 'policy')) +
            h.row('Репозиторий', 'Исходный код расширения YummyAnime for Lampa')));
        return wrap(heading(h, 'Настройки') + body);
    };

    views.policy = function (h) {
        var source = h.data.policy || {};
        var paragraphs = Array.isArray(source) ? source : source.paragraphs || [source.usage_policy_as_is, source.usage_policy_information, source.usage_policy_legal, source.usage_policy_responsibility];
        var title = source.title || source.usage_policy_title || 'Политика использования';
        var body = paragraphs.filter(function (text) { return typeof text === 'string' && text; }).map(function (text) { return '<p>' + h.esc(text) + '</p>'; }).join('');
        return wrap(heading(h, title) + panel('<div class="ya-description">' + (body || '<p>Текст политики не загружен.</p>') + '</div><div class="ya-toolbar">' +
            h.button('Закрыть', {'data-action': 'policy-close'}, 'ya-button ya-button--accent') + '</div>'));
    };

    root.YUMMY_PRIVATE_VIEWS = views;
}(window));

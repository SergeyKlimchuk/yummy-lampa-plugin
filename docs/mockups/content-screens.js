(function (window) {
    'use strict';

    // Presentation only. These views never fetch data, mutate an account or
    // open provider URLs. Captured title resources belong to one known ID.
    var V = {};
    var CATEGORY_NAMES = {
        watching: 'Смотрю', planned: 'В планах', completed: 'Просмотрено',
        dropped: 'Брошено', favorites: 'Любимое', postponed: 'Отложено'
    };
    var SORT_NAMES = {top: 'Топ', year: 'Новизна', new: 'Новизна', rating: 'Оценка',
        rating_counters: 'Количество оценок', votes: 'Количество оценок', views: 'Просмотры', title: 'Название', random: 'Случайно'};
    var TYPE_NAMES = {tv: 'Сериал', movie: 'Фильм', shortfilm: 'Короткометражный фильм',
        ova: 'OVA', ona: 'ONA', special: 'Спецвыпуск', shorttv: 'Короткий сериал'};
    var STATUS_NAMES = {ongoing: 'Онгоинг', released: 'Вышло', announcement: 'Анонс'};
    var YEAR_NAMES = {current: 'Этот год', last3: 'Последние 3 года', last5: 'Последние 5 лет', from2020: 'С 2020 года', from2010: 'С 2010 года'};

    function value(payload) { return payload && payload.response !== undefined ? payload.response : payload; }
    function list(payload) {
        var data = value(payload);
        if (Array.isArray(data)) return data;
        if (!data || typeof data !== 'object') return [];
        return data.anime || data.animes || data.items || data.results || data.data || data.genres || [];
    }
    function id(item) { return String(item && (item.anime_id || item.animeId || item.yani_id || item.id) || ''); }
    function title(item) { return item && (item.title || item.name || item.original_title) || 'Без названия'; }
    function text(value) { return value === undefined || value === null ? '' : String(value); }
    function field(item, key) {
        var data = item && item[key];
        return data && typeof data === 'object' ? data.alias || data.name || data.title || data.shortname || '' : data || '';
    }
    function genreValue(item) { return item && (item.value !== undefined ? item.value : item.id !== undefined ? item.id : item.href || item.alias || item.slug); }
    function view(h) { return h.view || {}; }
    function datum(h, key) { return h.data && h.data[key]; }
    function current(h) { return h.current ? h.current() || {} : {}; }
    function example(h) { return view(h).state === 'example'; }
    function head(h, label, actions) {
        return '<div class="ya-toolbar"><h1>' + h.esc(label) + '</h1>' + (actions || '') + '</div>';
    }
    function panel(body) { return '<div class="ya-panel">' + body + '</div>'; }
    function paragraphs(h, body) {
        return text(body).split(/\n\s*\n/).filter(Boolean).map(function (line) {
            return '<p>' + h.esc(line.trim()) + '</p>';
        }).join('');
    }
    function image(h, item) {
        var url = h.poster(item);
        return url ? '<img class="ya-poster" src="' + h.esc(url) + '" alt="' + h.esc(title(item)) + '" loading="lazy">' : '<div class="ya-poster" aria-label="Постер отсутствует"></div>';
    }
    function state(h, screen, label) {
        var name = view(h).state;
        if (name === 'loading') return head(h, label) + h.empty('Загрузка…', 'Данные появятся после загрузки.');
        if (name === 'error' || name === 'offline') return head(h, label) + h.empty('Не удалось загрузить данные',
            'Попробуйте открыть раздел ещё раз.', h.go('Повторить', screen, {state: 'ready'}));
        return '';
    }
    function empty(h, label, hint, actions) { return h.empty(label, hint || '', actions || ''); }
    function apiCards(h, rows) {
        return rows.length ? h.cards(rows) : empty(h, 'Аниме не найдены', 'Попробуйте другие условия.');
    }
    function filters(h) {
        var v = view(h);
        return '<div class="ya-tabs">' + [
            ['type', TYPE_NAMES[v.type] || 'Все типы'], ['status', STATUS_NAMES[v.status] || 'Все статусы'],
            ['year', YEAR_NAMES[v.year] || (v.year ? 'Год: ' + v.year : 'Все годы')], ['sort', SORT_NAMES[v.sort] || 'Топ']
        ].map(function (entry) {
            return h.button(entry[1], {'data-action': 'catalog-filter', 'data-key': entry[0]}, 'ya-chip');
        }).join('') + '</div>';
    }
    function catalogRows(h, input, filterGenre) {
        var v = view(h);
        var rows = (input || list(datum(h, 'catalog'))).slice();
        if (v.type && v.type !== 'all') rows = rows.filter(function (item) { return field(item, 'type') === v.type; });
        if (v.status && v.status !== 'all') rows = rows.filter(function (item) { return field(item, 'anime_status') === v.status || field(item, 'status') === v.status; });
        if (v.year && v.year !== 'all') {
            var year = new Date().getFullYear();
            var from = /^\d{4}$/.test(String(v.year)) ? Number(v.year) : {current: year, last3: year - 2, last5: year - 4, from2020: 2020, from2010: 2010}[v.year];
            var to = /^\d{4}$/.test(String(v.year)) ? Number(v.year) : ['current', 'last3', 'last5'].indexOf(v.year) >= 0 ? year : Infinity;
            if (from) rows = rows.filter(function (item) { return Number(item.year || item.release_year || 0) >= from && Number(item.year || item.release_year || 0) <= to; });
        }
        if (filterGenre && v.genre) rows = rows.filter(function (item) {
            return (item.genres || []).some(function (genre) { return String(genreValue(genre)) === String(v.genre); });
        });
        // These are local previews of the loaded snapshot, never server totals.
        var sort = v.sort;
        function rating(item) { return Number(item.rating && typeof item.rating === 'object' ? item.rating.average : item.rating || 0); }
        if (sort === 'title') rows.sort(function (a, b) { return title(a).localeCompare(title(b), 'ru'); });
        else if (sort === 'year' || sort === 'new') rows.sort(function (a, b) { return Number(b.year || 0) - Number(a.year || 0); });
        else if (sort === 'rating') rows.sort(function (a, b) { return rating(b) - rating(a); });
        else if (sort === 'views') rows.sort(function (a, b) { return Number(b.views || 0) - Number(a.views || 0); });
        else if (sort === 'rating_counters' || sort === 'votes') rows.sort(function (a, b) { return Number(b.rating && b.rating.counters || 0) - Number(a.rating && a.rating.counters || 0); });
        else if (sort === 'random') {
            for (var at = rows.length - 1; at > 0; at--) {
                var other = Math.floor(Math.random() * (at + 1));
                var swap = rows[at]; rows[at] = rows[other]; rows[other] = swap;
            }
        }
        return rows;
    }
    function fixture(h, name) { return datum(h, 'fixtures') && datum(h, 'fixtures')[name] || {}; }
    function snapshotTitleMatches(h) {
        var selected = id(current(h)) || String(view(h).selectedId || '');
        return Boolean(selected && selected === id(value(datum(h, 'detail'))));
    }
    function unavailableTitleResources(h, label) {
        return head(h, label) + empty(h, 'Данные этого аниме не загружены',
            'Откройте тайтл, для которого сохранён список источников.',
            h.go('Открыть загруженный тайтл', 'detail', {selectedId: id(value(datum(h, 'detail')))}));
    }
    function videoData(video) {
        var data = video && video.data || {};
        if (typeof data === 'string') { try { return JSON.parse(data); } catch (ignore) { return {}; } }
        return data;
    }
    function groups(h) {
        if (!snapshotTitleMatches(h)) return [];
        var all = [];
        var index = {};
        list(datum(h, 'videos')).forEach(function (video) {
            var data = videoData(video);
            var voice = data.dubbing || data.translation || data.voice || data.player || 'Источник';
            var player = data.player || data.source || data.service || '';
            var key = String(voice).toLowerCase() + '|' + String(data.player_id || player).toLowerCase();
            if (index[key] === undefined) { index[key] = all.length; all.push({name: voice, player: player, videos: []}); }
            all[index[key]].videos.push(video);
        });
        return all;
    }
    function episodeNumber(video) { return text(video.number || video.episode || video.index); }
    function episodes(group) {
        var seen = {};
        return (group && group.videos || []).slice().sort(function (a, b) {
            return Number(episodeNumber(a)) - Number(episodeNumber(b));
        }).filter(function (item) {
            var key = episodeNumber(item);
            if (!key || seen[key]) return false;
            seen[key] = true;
            return true;
        });
    }
    function minutes(h, seconds) { return Number(seconds) > 0 ? h.number(Math.max(1, Math.round(Number(seconds) / 60))) + ' мин' : ''; }
    function privateFeed(h, type, label, hint) {
        var failed = state(h, type, label);
        if (failed) return failed;
        if (example(h)) {
            var rows = list(fixture(h, 'catalog'));
            return head(h, label) + h.notice('Пример структуры на обезличенных данных. Личные события аккаунта не загружены.') +
                h.section('Пример карточек', rows.length ? h.cards(rows) : empty(h, 'Нет примера данных', ''));
        }
        return head(h, label) + empty(h, 'Личные данные не загружены', hint,
            h.go('Войти в YummyAnime', 'auth'));
    }

    V.home = function (h) {
        var failed = state(h, 'home', 'Главная');
        if (failed) return failed;
        var own = empty(h, 'Ваша история появится здесь', 'Начатые аниме будут доступны для продолжения.', h.go('Открыть историю', 'continue'));
        var categories = '<div class="ya-tabs">' + Object.keys(CATEGORY_NAMES).map(function (key) {
            return h.go(CATEGORY_NAMES[key], 'account-list', {category: key}, 'ya-chip');
        }).join('') + '</div>';
        var rows = view(h).state === 'empty' ? [] : list(datum(h, 'ongoing')).slice(0, 6);
        return head(h, 'Главная', h.go('Поиск', 'search')) + h.section('Продолжить просмотр', own) +
            h.section('Мои списки', categories, h.go('Все списки', 'user-lists')) +
            h.section('Сейчас выходит', rows.length ? h.cards(rows) : empty(h, 'Аниме не загружены', ''), h.go('Каталог', 'catalog', {status: 'ongoing'}));
    };
    V.catalog = function (h) {
        return state(h, 'catalog', 'Каталог') || head(h, 'Каталог', h.go('Поиск', 'search')) + filters(h) +
            apiCards(h, view(h).state === 'empty' ? [] : catalogRows(h));
    };
    V.search = function (h) {
        var query = text(view(h).query).trim();
        var input = '<div class="ya-toolbar"><input id="ya-search-query" type="search" aria-label="Название аниме" placeholder="Название аниме" value="' + h.esc(query) + '">' +
            h.button('Найти', {'data-action': 'run-search'}, 'ya-button ya-button--accent') + '</div>';
        var failed = state(h, 'search', 'Поиск');
        if (failed) return failed;
        var rows = query ? list(datum(h, 'catalog')).concat(list(datum(h, 'ongoing'))).filter(function (item, index, all) {
            if (all.findIndex(function (other) { return id(other) === id(item); }) !== index) return false;
            return [title(item)].concat(item.other_titles || []).join(' ').toLowerCase().indexOf(query.toLowerCase()) >= 0;
        }) : [];
        return head(h, 'Поиск') + input + (query ? apiCards(h, view(h).state === 'empty' ? [] : rows) : empty(h, 'Что будем смотреть?', 'Введите название аниме.'));
    };
    V.genres = function (h) {
        var failed = state(h, 'genres', 'Жанры');
        if (failed) return failed;
        var rows = view(h).state === 'empty' ? [] : list(datum(h, 'genres'));
        return head(h, 'Жанры') + (rows.length ? '<div class="ya-grid">' + rows.map(function (genre) {
            return h.go(genre.title || genre.name || genre.alias || '', 'genre-catalog', {genre: genreValue(genre)}, 'ya-panel ya-button');
        }).join('') + '</div>' : empty(h, 'Жанры не загружены', ''));
    };
    V['genre-catalog'] = function (h) {
        var selected = list(datum(h, 'genres')).find(function (genre) { return String(genreValue(genre)) === String(view(h).genre); });
        var name = selected && (selected.title || selected.name) || 'Жанр';
        var body = head(h, name, h.go('Все жанры', 'genres'));
        if (selected && selected.description) body += '<div class="ya-description">' + paragraphs(h, selected.description) + '</div>';
        return state(h, 'genre-catalog', name) || body + filters(h) + apiCards(h, view(h).state === 'empty' ? [] : catalogRows(h, null, true));
    };
    V['subject-catalog'] = function (h) {
        var selected = current(h);
        var kind = view(h).subjectKind === 'director' ? 'creators' : 'studios';
        var credits = selected[kind] || [];
        var wanted = text(view(h).subjectId);
        var subject = credits.find(function (entry) { return String(entry.id) === wanted; });
        var label = subject && (subject.title || subject.name) || 'Студия / автор';
        var rows = wanted ? list(datum(h, 'catalog')).concat(list(datum(h, 'ongoing'))).filter(function (item, index, all) {
            if (all.findIndex(function (other) { return id(other) === id(item); }) !== index) return false;
            return (item[kind] || []).some(function (entry) { return String(entry.id) === wanted; });
        }) : [];
        if (subject && id(selected) && !rows.some(function (entry) { return id(entry) === id(selected); })) rows.unshift(selected);
        rows = view(h).state === 'empty' ? [] : catalogRows(h, rows);
        return state(h, 'subject-catalog', label) || head(h, label) + filters(h) + (rows.length ? h.cards(rows) : empty(h, 'Каталог не загружен', 'Список работ появится после загрузки данных студии или автора.'));
    };
    V.top = function (h) {
        var failed = state(h, 'top', 'Топ аниме');
        if (failed) return failed;
        var selected = view(h).topType || 'all';
        var tabs = '<div class="ya-tabs">' + [['all', 'Все'], ['tv', 'Сериалы'], ['movie', 'Фильмы'], ['ona', 'ONA']].map(function (entry) {
            return h.button(entry[1], {'data-action': 'top-type', 'data-value': entry[0], 'aria-pressed': selected === entry[0] ? 'true' : 'false'}, 'ya-chip');
        }).join('') + '</div>';
        var rows = view(h).state === 'empty' ? [] : list(datum(h, 'catalog')).filter(function (item) { return selected === 'all' || field(item, 'type') === selected; });
        return head(h, 'Топ аниме') + tabs + apiCards(h, rows);
    };
    V.recommended = function (h) { return privateFeed(h, 'recommended', 'Для вас', 'Здесь будут события отслеживаемых аниме и связанные тайтлы.'); };
    V.updates = function (h) { return privateFeed(h, 'updates', 'Обновления', 'Здесь будут обновления из ваших списков и подписок.'); };
    V['new-translations'] = function (h) {
        var failed = state(h, 'new-translations', 'Новые переводы');
        if (failed) return failed;
        var feed = value(datum(h, 'feed')) || {};
        var seen = {};
        var rows = (view(h).state === 'empty' ? [] : feed.new_videos || []).slice().sort(function (a, b) { return Number(b.date || 0) - Number(a.date || 0); }).filter(function (entry) {
            var key = id(entry.anime || entry);
            if (!key || seen[key]) return false;
            seen[key] = true;
            return true;
        });
        return head(h, 'Новые переводы') + (rows.length ? panel(rows.slice(0, 16).map(function (entry) {
            var card = entry.anime || entry;
            return h.row(title(card), [entry.ep_title, entry.dub_title, entry.player_title, entry.date ? h.date(entry.date) : ''].filter(Boolean).join(' · '),
                h.go('Открыть', 'detail', {selectedId: id(card)}));
        }).join('')) : empty(h, 'Новых переводов нет', ''));
    };
    V['new-releases'] = function (h) {
        var feed = value(datum(h, 'feed')) || {};
        return state(h, 'new-releases', 'Новые аниме') || head(h, 'Новые аниме') +
            apiCards(h, view(h).state === 'empty' ? [] : (feed.new || []).slice(0, 12));
    };
    V.collections = function (h) {
        var failed = state(h, 'collections', 'Коллекции');
        if (failed) return failed;
        var rows = view(h).state === 'empty' ? [] : list(datum(h, 'collections'));
        if (!rows.length) return head(h, 'Коллекции') + empty(h, 'Коллекции не загружены', '');
        return head(h, 'Коллекции') + h.cards(rows, {screen: 'collection'});
    };
    V.collection = function (h) {
        var selected = value(datum(h, 'collection')) || {};
        var wanted = String(view(h).collectionId || view(h).selectedId || selected.id || '');
        var summary = list(datum(h, 'collections')).find(function (entry) { return String(entry.id) === wanted; }) || {};
        var matched = String(selected.id || '') === wanted;
        var label = (matched && selected.title) || summary.title || 'Коллекция';
        var rows = matched && view(h).state !== 'empty' ? list(selected.animes) : [];
        return state(h, 'collection', label) || head(h, label, h.go('Все коллекции', 'collections')) +
            (rows.length ? h.cards(rows) : empty(h, matched ? 'В коллекции нет аниме' : 'Состав коллекции не загружен', ''));
    };
    V.detail = function (h) {
        var item = current(h);
        var failed = state(h, 'detail', title(item));
        if (failed) return failed;
        if (!id(item) || view(h).state === 'empty') return head(h, 'Карточка аниме') + empty(h, 'Данные аниме не загружены', '', h.go('Открыть каталог', 'catalog'));
        var itemId = id(item);
        var listActions = h.button('Мои списки', {'data-action': 'list-menu'}) + h.button('Избранное', {'data-action': 'favorite'});
        var type = field(item, 'type');
        var status = field(item, 'anime_status');
        var meta = [item.year, TYPE_NAMES[type] || type, STATUS_NAMES[status] || status].filter(Boolean);
        var rating = item.rating && typeof item.rating === 'object' ? Number(item.rating.average || 0) : Number(item.rating || 0);
        var ratings = [];
        if (rating > 0) ratings.push('YummyAnime ' + rating.toFixed(2));
        if (item.rating && Number(item.rating.counters) > 0) ratings.push(h.number(item.rating.counters) + ' оценок');
        var ep = item.episodes || {};
        var stats = [];
        if (Number(ep.aired) > 0) stats.push(h.number(ep.aired) + ' вышло');
        if (Number(ep.count) > 0) stats.push(h.number(ep.count) + ' серий');
        if (Number(item.seasons_count || item.season_count) > 0) stats.push(h.number(item.seasons_count || item.season_count) + ' сезонов');
        var tags = '<div class="ya-tabs">' + (item.genres || []).map(function (genre) {
            return h.go(genre.title || genre.name || '', 'genre-catalog', {genre: genreValue(genre)}, 'ya-chip');
        }).join('') + '</div>';
        var credits = (item.studios || []).map(function (credit) { return {credit: credit, kind: 'studio'}; })
            .concat((item.creators || []).map(function (credit) { return {credit: credit, kind: 'director'}; }))
            .filter(function (entry) { return entry.credit.id !== undefined && (entry.credit.title || entry.credit.name); });
        var creditLinks = credits.length ? '<div class="ya-tabs">' + credits.map(function (entry) {
            var credit = entry.credit;
            return h.go(credit.title || credit.name, 'subject-catalog', {selectedId: itemId, subjectId: String(credit.id), subjectKind: entry.kind}, 'ya-chip');
        }).join('') + '</div>' : '';
        var description = item.description || item.synopsis || item.overview || '';
        var alternatives = (item.other_titles || item.yani_titles || []).filter(function (entry) { return entry !== title(item); });
        var personal = h.memory && h.memory.categories && h.memory.categories[itemId] || {};
        var categories = [['Смотрю', 0], ['В планах', 1], ['Просмотрено', 2], ['Брошено', 3], ['Отложено', 5], ['Любимое', 4]];
        var selectedCategory = categories.filter(function (entry) { return entry[1] !== 4 && personal.list === entry[1]; })[0];
        var categoryStatus = selectedCategory ? selectedCategory[0] : personal.known ? 'Не в списках' : 'Категория не загружена';
        if (personal.favorite) categoryStatus += ' · Любимое';
        var categoryButtons = categories.map(function (entry) {
            var selected = entry[1] === 4 ? personal.favorite : personal.list === entry[1];
            return h.button(entry[0], {'data-action': 'detail-category', 'data-id': itemId, 'data-value': entry[1], 'aria-pressed': selected ? 'true' : 'false', 'data-yani-list-key': ['watching', 'planned', 'completed', 'dropped', 'favorites', 'postponed'][entry[1]]}, selected ? 'ya-button ya-button--accent' : 'ya-button');
        }).join('');
        var posterKey = selectedCategory ? ['watching', 'planned', 'completed', 'dropped', 'favorites', 'postponed'][selectedCategory[1]] : personal.favorite ? 'favorites' : 'none';
        var band = personal.known || personal.favorite ? '<div class="ya-detail-poster-status" data-yani-list-key="' + posterKey + '">' + h.esc(categoryStatus) + '</div>' : '';
        var main = '<div class="ya-detail"><div><div class="ya-detail-poster-frame">' + image(h, item) + band + '</div></div><div>' +
            '<h1>' + h.esc(title(item)) + '</h1>' +
            '<div class="ya-toolbar">' + (ratings.length ? '<p>' + h.esc(ratings.join(' · ')) + '</p>' : '') + h.button('Оценить', {'data-action': 'rating-menu'}) + '</div>' +
            '<div class="ya-detail-tags">' + (TYPE_NAMES[type] || type ? '<span class="ya-chip">' + h.esc(TYPE_NAMES[type] || type) + '</span>' : '') + tags + '</div>' +
            (stats.length ? '<p class="ya-meta">' + h.esc(stats.join(' · ')) + '</p>' : '') +
            '<div class="ya-toolbar">' + h.go('Смотреть', 'sources', {selectedId: itemId, category: 'episode'}, 'ya-button ya-button--accent') +
            h.button('Открыть', {'data-action': 'lampa-card'}) + h.go('Трейлеры', 'trailers', {selectedId: itemId}) + h.button('Подписаться', {'data-action': 'detail-subscribe'}) + '</div>' +
            '<div class="ya-panel"><div class="ya-toolbar"><span class="ya-meta">Мои списки</span><strong>' + h.esc(categoryStatus) + '</strong></div><div class="ya-toolbar">' + categoryButtons + '</div></div>' +
            (description ? '<div class="ya-description ya-description--preview">' + paragraphs(h, description) + '</div>' + h.button('Описание полностью', {'data-action': 'description'}) : '<p class="ya-meta">Описание отсутствует</p>') +
            '</div></div>';
        var sources = groups(h);
        if (sources.length) main += h.section('Озвучка и субтитры', '<div class="ya-tabs">' + sources.map(function (group, index) {
            return h.go(group.name, 'episodes', {selectedId: itemId, sourceIndex: index, category: 'episode'}, 'ya-chip');
        }).join('') + '</div>');
        main += h.section('Метаинформация', '<p class="ya-meta">' + h.esc([item.year, STATUS_NAMES[status] || status].filter(Boolean).join(' · ')) + '</p>' + creditLinks + (alternatives.length ? '<p class="ya-meta">' + h.esc(alternatives.join(' · ')) + '</p>' : ''));
        main += h.section('Комментарии' + (item.comments_count ? ' · ' + h.number(item.comments_count) : ''), h.go('Открыть комментарии', 'comments', {selectedId: itemId}));
        var order = item.viewing_order || [];
        if (order.length) main += h.section('Порядок просмотра', panel(order.map(function (entry) {
            return h.row(title(entry), entry.data && (entry.data.text || entry.data.title) || '', h.go('Открыть', 'detail', {selectedId: id(entry)}));
        }).join('')));
        return main;
    };
    function sourceMeta(h, group) {
        var rows = episodes(group), last = rows[rows.length - 1];
        return [rows.length ? h.number(rows.length) + ' серий' : '', last ? 'Последняя серия: ' + episodeNumber(last) : ''].filter(Boolean).join(' · ');
    }
    function playbackMemory(h) { return h.memory || {}; }
    function selectedSource(h, rows) {
        var memory = playbackMemory(h), key = id(current(h));
        var own = memory.playbackChoices && memory.playbackChoices[key], configured = memory.playbackDefaults;
        var found = -1, origin = 'auto', unavailable = false;
        function matchPreference(preference, sourceFallback) {
            if (!preference || !preference.voice && !preference.player) return -1;
            var exact = rows.findIndex(function (group) {
                return (!preference.voice || group.name === preference.voice) && (!preference.player || group.player === preference.player);
            });
            if (exact >= 0) return exact;
            unavailable = true;
            var sameVoice = preference.voice ? rows.findIndex(function (group) { return group.name === preference.voice; }) : -1;
            if (sameVoice >= 0) return sameVoice;
            return sourceFallback && preference.player ? rows.findIndex(function (group) { return group.player === preference.player; }) : -1;
        }
        if (own) { found = matchPreference(own, false); if (found >= 0) origin = 'anime'; }
        if (found < 0 && configured) { found = matchPreference(configured, true); if (found >= 0) origin = 'default'; }
        var sourceIndex = found >= 0 ? found : Math.max(0, Math.min(rows.length - 1, Number(view(h).sourceIndex) || 0));
        return {group: rows[sourceIndex], index: sourceIndex, own: Boolean(own), origin: origin, unavailable: unavailable};
    }
    function playbackRecord(group) { return JSON.stringify({voice: group.name, player: group.player}); }
    function playbackOptions(h, rows, selected, choice) {
        var seen = {}, options = [];
        rows.forEach(function (group, index) {
            var key = choice === 'voice' ? group.name : group.player;
            if (seen[key] || choice === 'source' && group.name !== selected.group.name) return;
            seen[key] = true;
            var chosen = index;
            if (choice === 'voice') {
                var sameSource = rows.findIndex(function (candidate) { return candidate.name === group.name && candidate.player === selected.group.player; });
                if (sameSource >= 0) chosen = sameSource;
            }
            var providers = rows.filter(function (candidate) { return candidate.name === group.name; }).map(function (candidate) { return candidate.player; }).filter(function (player, at, all) { return all.indexOf(player) === at; });
            options.push({label: key, group: rows[chosen], index: chosen, meta: choice === 'voice' ? providers.join(' · ') : sourceMeta(h, group)});
        });
        var selectedAt = options.findIndex(function (option) { return choice === 'voice' ? option.group.name === selected.group.name : option.group.player === selected.group.player; });
        var requestedPage = view(h).optionPage === undefined || view(h).optionPage === '' ? Math.floor(Math.max(0, selectedAt) / 30) : Number(view(h).optionPage) || 0;
        var page = Math.max(0, Math.min(Math.ceil(options.length / 30) - 1, requestedPage)), start = page * 30;
        var controls = h.go('К сериям', 'sources', {selectedId: id(current(h)), sourceIndex: selected.index, choice: ''});
        var body = options.slice(start, start + 30).map(function (option) {
            var chosen = choice === 'voice' ? option.group.name === selected.group.name : option.group.player === selected.group.player;
            return h.row(option.label, option.meta, h.button(chosen ? 'Выбрано' : 'Выбрать', {
                'data-action': 'playback-choice', 'data-value': option.index, 'data-record': playbackRecord(option.group), 'aria-pressed': chosen ? 'true' : 'false'
            }, chosen ? 'ya-button ya-button--accent' : 'ya-button'));
        }).join('');
        var pages = '<div class="ya-toolbar">';
        if (page > 0) pages += h.go('Предыдущие варианты', 'sources', {choice: choice, optionPage: page - 1, sourceIndex: selected.index});
        if (start + 30 < options.length) pages += h.go('Следующие варианты', 'sources', {choice: choice, optionPage: page + 1, sourceIndex: selected.index});
        return head(h, choice === 'voice' ? 'Озвучка' : 'Источник', controls) + '<p class="ya-meta">' + h.esc(title(current(h))) + '</p>' + panel(body) + pages + '</div>';
    }
    function episodeGrid(h, group, sourceIndex, screen) {
        var rows = episodes(group), page = Math.max(0, Math.min(Math.ceil(rows.length / 60) - 1, Number(view(h).episodePage) || 0));
        var start = page * 60;
        var body = '<div class="ya-playback-episodes">' + rows.slice(start, start + 60).map(function (entry) {
            var meta = [entry.quality, entry.yani_episode_title, minutes(h, entry.duration)].filter(Boolean).join(' · ');
            return '<div>' + h.go('Серия ' + episodeNumber(entry), 'player', {selectedId: id(current(h)), sourceIndex: sourceIndex, episode: episodeNumber(entry), category: 'episode'}) +
                (meta ? '<div class="ya-meta">' + h.esc(meta) + '</div>' : '') + '</div>';
        }).join('') + '</div>';
        var controls = '<div class="ya-toolbar">';
        if (page > 0) controls += h.go('Предыдущие серии', screen, {sourceIndex: sourceIndex, episodePage: page - 1});
        if (start + 60 < rows.length) controls += h.go('Следующие серии', screen, {sourceIndex: sourceIndex, episodePage: page + 1});
        return body + controls + '</div>';
    }
    V.sources = function (h) {
        if (!snapshotTitleMatches(h)) return unavailableTitleResources(h, 'Просмотр');
        var failed = state(h, 'sources', 'Просмотр');
        if (failed) return failed;
        var rows = view(h).state === 'empty' ? [] : groups(h), selected = selectedSource(h, rows);
        var top = head(h, title(current(h)), h.go('Карточка аниме', 'detail', {selectedId: id(current(h))}));
        if (!selected.group) return top + empty(h, 'Источников нет', '');
        if (view(h).choice === 'voice' || view(h).choice === 'source') return playbackOptions(h, rows, selected, view(h).choice);
        var first = episodes(selected.group)[0];
        if (!first) return top + empty(h, 'Серии не загружены', 'В снимке нет нумерации серий для этого источника.');
        var origin = selected.origin === 'anime' ? 'Выбор для этого аниме' : selected.origin === 'default' ? 'Настройки по умолчанию' : 'Автоматический выбор из снимка';
        var body = top + '<p class="ya-meta">' + h.esc(origin) + '</p>';
        if (selected.unavailable) body += h.notice('Предпочтительный вариант отсутствует в снимке. Показан доступный; сохранённый выбор не меняется.');
        body += '<div class="ya-playback"><div class="ya-playback-fields">' +
            h.go('Озвучка · ' + selected.group.name + ' · Изменить', 'sources', {sourceIndex: selected.index, choice: 'voice', optionPage: ''}, 'ya-button ya-playback-field') +
            h.go('Источник · ' + selected.group.player + ' · Изменить', 'sources', {sourceIndex: selected.index, choice: 'source', optionPage: ''}, 'ya-button ya-playback-field') + '</div>';
        body += '<div class="ya-toolbar">' + h.go('Смотреть · Серия ' + episodeNumber(first), 'player', {selectedId: id(current(h)), sourceIndex: selected.index, episode: episodeNumber(first), category: 'episode'}, 'ya-button ya-button--accent');
        if (selected.own) body += h.button('Использовать настройки', {'data-action': 'playback-reset'}, 'ya-button');
        body += '</div><p class="ya-meta">' + h.esc(sourceMeta(h, selected.group)) + '</p>' +
            h.section('Серии', episodeGrid(h, selected.group, selected.index, 'sources')) + '</div>';
        return body + h.notice('В макете выбор хранится только до перезагрузки страницы. Видео и запросы к источникам не запускаются.');
    };
    V.episodes = function (h) {
        if (!snapshotTitleMatches(h)) return unavailableTitleResources(h, 'Выбор серии');
        var failed = state(h, 'episodes', 'Выбор серии');
        if (failed) return failed;
        var sourceIndex = Number(view(h).sourceIndex || 0), group = groups(h)[sourceIndex];
        var rows = view(h).state === 'empty' ? [] : episodes(group);
        return head(h, 'Выбор серии', h.go('Озвучка и источник', 'sources', {selectedId: id(current(h)), sourceIndex: sourceIndex})) +
            '<p class="ya-meta">' + h.esc([title(current(h)), group && group.name, group && group.player].filter(Boolean).join(' · ')) + '</p>' +
            (rows.length ? '<div class="ya-playback">' + episodeGrid(h, group, sourceIndex, 'episodes') + '</div>' : empty(h, 'Серии не загружены', ''));
    };
    V.trailers = function (h) {
        if (!snapshotTitleMatches(h)) return unavailableTitleResources(h, 'Трейлеры');
        var failed = state(h, 'trailers', 'Трейлеры');
        if (failed) return failed;
        var rows = view(h).state === 'empty' ? [] : list(datum(h, 'trailers'));
        return head(h, 'Трейлеры', h.go('Карточка аниме', 'detail', {selectedId: id(current(h))})) +
            (rows.length ? panel(rows.map(function (entry, index) {
                return h.row(entry.number || entry.title || entry.name || 'Трейлер ' + (index + 1), [entry.dubbing, entry.player].filter(Boolean).join(' · '),
                    h.go('Смотреть', 'player', {selectedId: id(current(h)), trailerIndex: index, category: 'trailer'}));
            }).join('')) : empty(h, 'Трейлеров нет', ''));
    };
    function commentRows(h, replies) {
        if (!example(h)) return [];
        var data = fixture(h, 'comments');
        return list(replies ? data.children || data.replies : data.comments || data);
    }
    function comments(h, replies) {
        var label = replies ? 'Ответы' : 'Комментарии';
        var screen = replies ? 'replies' : 'comments';
        var failed = state(h, screen, label);
        if (failed) return failed;
        var rows = view(h).state === 'empty' ? [] : commentRows(h, replies);
        var main = head(h, label, replies ? h.go('К комментариям', 'comments', {state: view(h).state}) : h.go('Карточка аниме', 'detail', {selectedId: id(current(h))}));
        if (!rows.length) return main + empty(h, 'Комментарии не загружены', 'Здесь будут комментарии и ответы зрителей.');
        main += h.notice('Пример обезличенных комментариев. Эти записи не относятся к выбранному аниме.');
        return main + panel(rows.map(function (entry) {
            var author = entry.name || entry.author && entry.author.name || 'Пользователь';
            var meta = [entry.time ? h.date(entry.time) : '', Number(entry.likes) > 0 ? '♥ ' + h.number(entry.likes) : '', Number(entry.dislikes) > 0 ? '−' + h.number(entry.dislikes) : ''].filter(Boolean);
            var copy = text(entry.text || entry.body).replace(/\[ник\]([^[]+)\[\/ник\]/gi, '@$1').replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
            var actions = !replies && Number(entry.children_count) > 0 ? h.go('Ответы · ' + h.number(entry.children_count), 'replies', {state: 'example', commentId: entry.id}) : '';
            return '<article>' + h.row(author, meta.join(' · '), actions) + '<p class="ya-description">' + h.esc(copy) + '</p></article>';
        }).join(''));
    }
    V.comments = function (h) { return comments(h, false); };
    V.replies = function (h) { return comments(h, true); };
    V.player = function (h) {
        if (!snapshotTitleMatches(h)) return unavailableTitleResources(h, 'Воспроизведение');
        var failed = state(h, 'player', 'Воспроизведение');
        if (failed) return failed;
        var isTrailer = view(h).category === 'trailer';
        var group = groups(h)[Number(view(h).sourceIndex || 0)];
        var trailer = list(datum(h, 'trailers'))[Number(view(h).trailerIndex || 0)];
        var episode = episodes(group).find(function (entry) { return episodeNumber(entry) === String(view(h).episode); });
        if (isTrailer && !trailer || !isTrailer && !episode) return head(h, 'Воспроизведение') + empty(h,
            isTrailer ? 'Трейлер не найден' : 'Серия не найдена', 'Выберите вариант из загруженного списка.',
            h.go(isTrailer ? 'К трейлерам' : 'К сериям', isTrailer ? 'trailers' : 'episodes', {selectedId: id(current(h))}));
        var subtitle = isTrailer ? trailer.number || trailer.title : 'Серия ' + episodeNumber(episode);
        var source = isTrailer ? trailer && trailer.player : group && group.player;
        return head(h, 'Воспроизведение') + panel('<h2>' + h.esc(title(current(h))) + '</h2>' +
            '<p class="ya-meta">' + h.esc([subtitle, source].filter(Boolean).join(' · ')) + '</p>' +
            empty(h, 'Область плеера', 'Видео в макете не запускается. При просмотре здесь откроется плеер Lampa или плеер источника.') +
            '<div class="ya-toolbar">' + h.go(isTrailer ? 'К трейлерам' : 'К сериям', isTrailer ? 'trailers' : 'episodes',
                {selectedId: id(current(h)), sourceIndex: Number(view(h).sourceIndex || 0)}) + h.go('Карточка аниме', 'detail', {selectedId: id(current(h))}) + '</div>');
    };

    window.YUMMY_CONTENT_VIEWS = V;
}(window));

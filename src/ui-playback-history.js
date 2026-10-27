(function (window) {
    'use strict';

    // Local playback history storage plus Continue Watching card progress UI.
    // Player watchers and remote flush remain in ui.js; this module owns the
    // shared history map and the visible progress decorations.

    function create(deps) {
        deps = deps || {};
        var t = deps.t || function (name) { return name; };
        var bindYummyCardRender = deps.bindYummyCardRender || function () {};
        var cardRenderElement = deps.cardRenderElement || function (element, card) {
            var render = element && element.jquery ? element : element ? $(element) : $();
            if (!render.length && card && card.render) render = $(card.render(true));
            return render;
        };
        var openVideos = deps.openVideos || function () {};
        var openYummyDetail = deps.openYummyDetail || function () {};
        var addCardPlaybackProgress = deps.addCardPlaybackProgress || function () {};
        var syncCardEpisodesMeta = deps.syncCardEpisodesMeta || function () {};
        var syncCardOverlayLayout = deps.syncCardOverlayLayout || function () {};
        var playerKey = deps.playerKey || function (group) {
            return String(group && (group.player || group.title) || '').toLowerCase();
        };
        var videoSourceUrl = deps.videoSourceUrl || function () { return ''; };
        var historyCache = null;
        var historyCacheAt = 0;
        var HISTORY_CACHE_MS = 500;
        var historyChangeTimer = 0;
        var pendingHistoryCard = null;

        function publishPlaybackHistoryChange(card) {
            if (card) pendingHistoryCard = card;
            if (historyChangeTimer || typeof setTimeout !== 'function') return;
            historyChangeTimer = setTimeout(function () {
                historyChangeTimer = 0;
                var changedCard = pendingHistoryCard;
                pendingHistoryCard = null;
                if (window.$ && typeof document !== 'undefined') {
                    $(document).trigger('yani:watch-progress', [changedCard || null]);
                }
            }, 0);
        }

        function playbackHistory() {
            if (!window.Lampa || !window.Lampa.Storage) return {};
            var now = Date.now();
            if (historyCache && now - historyCacheAt < HISTORY_CACHE_MS) return historyCache;
            try {
                var value = window.Lampa.Storage.get('yani_playback_history', '{}');
                if (value && typeof value === 'object') historyCache = value;
                else historyCache = JSON.parse(value || '{}');
            } catch (error) {
                historyCache = {};
            }
            historyCacheAt = now;
            return historyCache;
        }

        function invalidatePlaybackHistoryCache() {
            historyCache = null;
            historyCacheAt = 0;
        }

        function getPlayback(animeId) {
            return playbackHistory()[String(animeId)] || null;
        }

        function positiveNumber(value) {
            var number = Number(value);
            return isFinite(number) && number > 0 ? number : 0;
        }

        function episodeFinished(position, duration, flags) {
            var utils = window.LampaYaniUiUtils;
            if (utils && utils.isEpisodeFinished) return utils.isEpisodeFinished(position, duration, flags);
            return false;
        }

        // How many episodes the title has released. Continue Watching needs a
        // ceiling before it may offer the episode after the one just finished,
        // so it never points at an episode that does not exist yet.
        function episodeCeiling(card) {
            var episodes = card && (card.yani_episodes || card.episodes) || {};
            return positiveNumber(episodes.aired || episodes.released) ||
                positiveNumber(episodes.count || episodes.total) ||
                positiveNumber(card && (card.episodes_aired || card.episodes_count));
        }

        function explicitCompletion(value) {
            var utils = window.LampaYaniUiUtils;
            return Boolean(utils && utils.hasEpisodeCompletionFlag &&
                (utils.hasEpisodeCompletionFlag(value) || utils.hasEpisodeCompletionFlag(value && value.watched)));
        }

        function rememberPlayback(card, group, video) {
            if (!window.Lampa || !window.Lampa.Storage || !card || !card.yani_id) return null;
            var history = playbackHistory();
            var previous = history[String(card.yani_id)] || null;
            var videoData = window.LampaYaniUiUtils && window.LampaYaniUiUtils.videoData
                ? window.LampaYaniUiUtils.videoData(video)
                : {};
            var number = window.LampaYaniEpisode.valueOf(video);
            var saved = history[String(card.yani_id)] = {
                number: number,
                // The furthest episode ever reached for this title, which is not
                // the same as the last one opened: rewatching episode 2 must not
                // move the queue back from episode 9.
                max_episode: Math.max(positiveNumber(number), positiveNumber(previous && previous.max_episode)),
                episodes_aired: episodeCeiling(card) || positiveNumber(previous && previous.episodes_aired),
                video_id: video.video_id || '',
                time: Number(video.watched && video.watched.end_time || 0),
                duration: Math.max(0, Number(video.duration || 0)),
                completed: explicitCompletion(video),
                player: playerKey(group),
                voice: String(videoData.dubbing || videoData.translation || videoData.voice || group && group.title || ''),
                episode_url: videoSourceUrl(video),
                title: card.title || '',
                poster: card.poster || card.img || '',
                card: {
                    title: card.title || '',
                    original_title: card.original_title || '',
                    poster: card.poster || card.img || '',
                    release_date: card.release_date || '',
                    overview: card.overview || '',
                    anime_id: card.yani_id,
                    remote_ids: card.yani_remote_ids || {}
                },
                updated_at: Date.now()
            };
            var ids = Object.keys(history).sort(function (a, b) {
                return Number(history[b].updated_at || 0) - Number(history[a].updated_at || 0);
            });
            ids.slice(100).forEach(function (id) { delete history[id]; });
            if (deps.progress) saved.progressOwner = deps.progress.owner();
            persistHistory(history);
            publishPlaybackHistoryChange(card);
            return saved;
        }

        function persistHistory(history) {
            if (!window.Lampa || !window.Lampa.Storage) return;
            var ids = Object.keys(history).sort(function (a, b) {
                return Number(history[b].updated_at || 0) - Number(history[a].updated_at || 0);
            });
            ids.slice(100).forEach(function (id) { delete history[id]; });
            window.Lampa.Storage.set('yani_playback_history', JSON.stringify(history));
            invalidatePlaybackHistoryCache();
        }

        function importRemoteEntries(remoteEntries) {
            var Home = window.LampaYaniHomeSections;
            if (!Home || !Home.importRemoteIntoLocal) return {imported: 0, history: playbackHistory()};
            var result = Home.importRemoteIntoLocal(playbackHistory(), remoteEntries);
            if (result.imported) {
                persistHistory(result.history);
                // A remote pull can add titles that this device has never
                // opened. Notify an already visible dashboard after storage is
                // updated so its Continue Watching row does not stay stale.
                publishPlaybackHistoryChange(null);
            }
            return result;
        }

        function importVideosProgress(card, videos) {
            if (!card || !card.yani_id) return {imported: 0};
            var entries = [];
            (videos || []).forEach(function (video) {
                if (!video) return;
                var watched = video.watched && typeof video.watched === 'object' ? video.watched : {};
                var time = Number(watched.end_time || watched.time || 0);
                if (!(time > 0) && !explicitCompletion(video)) return;
                var videoData = window.LampaYaniUiUtils && window.LampaYaniUiUtils.videoData
                    ? window.LampaYaniUiUtils.videoData(video)
                    : {};
                entries.push({
                    anime_id: card.yani_id,
                    video_id: video.video_id || video.id || '',
                    number: window.LampaYaniEpisode.valueOf(video),
                    title: card.title || '',
                    poster: card.poster || card.img || '',
                    player: String(videoData.player || ''),
                    voice: String(videoData.dubbing || videoData.translation || videoData.voice || ''),
                    time: time,
                    duration: Math.max(0, Number(video.duration || 0)),
                    completed: explicitCompletion(video),
                    updated_at: Number(watched.updated_at || watched.date || 0)
                });
            });
            var result = importRemoteEntries(entries);
            recordEpisodeReach(card, videos, entries);
            return result;
        }

        // The episode list is the most complete view of a title there is: it
        // states every episode the account has watched and how many exist. Both
        // are kept on the local entry so Continue Watching can offer the next
        // episode without loading the title again.
        function recordEpisodeReach(card, videos, watchedEntries) {
            if (!card || !card.yani_id) return;
            var history = playbackHistory();
            var saved = history[String(card.yani_id)];
            if (!saved) return;
            var reached = positiveNumber(saved.max_episode);
            (watchedEntries || []).forEach(function (entry) {
                // Only finished episodes count: a title opened and abandoned
                // after a minute must not push the queue past that episode.
                if (!episodeFinished(entry && entry.time, entry && entry.duration, entry)) return;
                reached = Math.max(reached, positiveNumber(entry && entry.number));
            });
            var aired = episodeCeiling(card);
            (videos || []).forEach(function (video) {
                aired = Math.max(aired, positiveNumber(window.LampaYaniEpisode.valueOf(video)));
            });
            if (reached === positiveNumber(saved.max_episode) && aired === positiveNumber(saved.episodes_aired)) return;
            saved.max_episode = reached;
            saved.episodes_aired = aired;
            persistHistory(history);
        }

        function pullRemoteProgress(limit) {
            if (!window.LampaYaniAuth || !LampaYaniAuth.token() || !window.LampaYaniApi || !LampaYaniApi.watchHistory) {
                return Promise.resolve({imported: 0});
            }
            var Home = window.LampaYaniHomeSections;
            var maximum = Math.max(1, Number(limit || 100));
            if (Home && Home.fetchHistoryRange) {
                return Home.fetchHistoryRange(window.LampaYaniApi.watchHistory, maximum, 30).then(importRemoteEntries);
            }
            return window.LampaYaniApi.watchHistory(Math.min(30, maximum), 0).then(function (payload) {
                var remote = Home && Home.normalizeRemoteHistory ? Home.normalizeRemoteHistory(payload) : [];
                return importRemoteEntries(remote);
            });
        }

        function autoProgressSyncEnabled() {
            if (!window.LampaYaniAuth || !window.LampaYaniAuth.token() || !window.Lampa || !window.Lampa.Storage || !window.Lampa.Storage.get) return false;
            var value = window.Lampa.Storage.get('yani_auto_sync_progress', true);
            return value !== false && value !== 'false';
        }

        var unsyncableWarned = {};

        function syncServerProgress(video) {
            if (!autoProgressSyncEnabled() || !window.LampaYaniApi || !video) return;
            if (!video.video_id) {
                // Progress is addressed by video id, so an episode without one
                // can never reach the account. It used to fail silently, which
                // reads as "sync is broken" rather than "this source has no id".
                var key = String(video.title || '') + ':' + String(video.number || video.index || '');
                if (!unsyncableWarned[key]) {
                    unsyncableWarned[key] = true;
                    console.warn('[YummyAnime] Episode has no video id, progress stays on this device only', key);
                }
                return;
            }
            window.LampaYaniApi.syncVideoProgress(video.video_id, video.watched && video.watched.end_time, video.duration).catch(function (error) {
                console.warn('[YummyAnime] Progress sync failed', error);
            });
        }

        function renderHistoryProgress(rendered, playback) {
            var view = $('.card__view', rendered).first();
            if (!view.length) return;
            var duration = Math.max(0, Number(playback.duration || 0));
            var position = Math.max(0, Number(playback.time || 0));
            var percent = duration > 0 ? Math.min(100, Math.round(position / duration * 100)) : 0;
            var episode = playback.last_watched_episode || playback.number;
            var label = episode ? t('episode') + ' ' + episode : t('continue_watching');
            if (percent) label += ' · ' + percent + '%';
            var badge = view.find('.yani-card-history');
            if (!badge.length) badge = $('<span class="yani-card-history"></span>').appendTo(view);
            if (badge.text() !== label) badge.text(label);
            var progress = view.find('.yani-card-history-progress');
            if (duration > 0) {
                if (!progress.length) progress = $('<span class="yani-card-history-progress"><span></span></span>').appendTo(view);
                progress.find('span').css('width', percent + '%');
            } else if (progress.length) progress.remove();
            syncCardOverlayLayout(rendered);
        }

        function refreshVisiblePlaybackProgress(card) {
            if (!card || !card.yani_id) return;
            $('.yani-history-card').each(function () {
                var rendered = $(this);
                if (String(rendered.attr('data-yani-history-id') || '') !== String(card.yani_id)) return;
                renderHistoryProgress(rendered, card.yani_resume || getPlayback(card.yani_id) || {});
            });
            $('[data-yani-card-id="' + String(card.yani_id).replace(/"/g, '') + '"]').not('.yani-history-card').each(function () {
                addCardPlaybackProgress($(this), card);
                syncCardEpisodesMeta($(this), card);
                syncCardOverlayLayout($(this), card);
            });
            publishPlaybackHistoryChange(card);
        }

        function updatePlaybackProgress(context, position, duration, remote) {
            if (!context || !context.selected || !context.card) return;
            if (deps.progress && context.progressOwner && !deps.progress.sameOwner(context.progressOwner, deps.progress.owner())) return;
            var video = context.selected;
            video.watched = video.watched || {};
            video.watched.end_time = Math.max(0, Math.floor(Number(position) || 0));
            if (duration > 0) video.duration = Math.floor(duration);
            if (deps.progress) deps.progress.record(context.card, video, {owner: context.progressOwner, flush: Boolean(remote)});
            var saved = rememberPlayback(context.card, context.group, video);
            if (saved) {
                context.card.yani_resume = {
                    number: saved.number,
                    max_episode: saved.max_episode,
                    episodes_aired: saved.episodes_aired,
                    resume_next: Boolean(saved.resume_next),
                    last_watched_episode: Number(saved.time || 0) > 0 ? Number(saved.number || 0) : 0,
                    video_id: saved.video_id,
                    time: saved.time,
                    duration: saved.duration,
                    completed: saved.completed,
                    player: saved.player,
                    voice: saved.voice,
                    updated_at: saved.updated_at
                };
                refreshVisiblePlaybackProgress(context.card);
            }
            if (remote) syncServerProgress(video);
        }

        // The account's watch history is the shared truth between devices; the
        // local copy is only a cache of it. Pulling it once per session — not
        // just when the Continue Watching screen happens to be opened — is what
        // makes an episode finished on the phone show up on the TV, and keeps
        // card progress correct everywhere it is drawn.
        var remotePullAt = 0;
        var remotePull = null;
        var REMOTE_PULL_TTL = 5 * 60 * 1000;

        function ensureRemoteHistory(force) {
            if (!autoProgressSyncEnabled()) return Promise.resolve({imported: 0, skipped: true});
            if (!force && remotePull && Date.now() - remotePullAt < REMOTE_PULL_TTL) return remotePull;
            remotePullAt = Date.now();
            remotePull = pullRemoteProgress(300).then(function (result) {
                if (result && result.imported) {
                    console.log('[YummyAnime] Imported ' + result.imported + ' history entries from the account');
                }
                return result;
            }).catch(function (error) {
                // A missing pull must never block playback or the dashboard, so
                // the stale local copy simply stays in use until the next try.
                console.warn('[YummyAnime] Could not pull the account history', error);
                remotePullAt = 0;
                return {imported: 0, failed: true};
            });
            return remotePull;
        }

        function syncPlaybackHistoryManually() {
            if (!window.LampaYaniAuth || !window.LampaYaniAuth.token()) {
                if (window.Lampa && window.Lampa.Noty) window.Lampa.Noty.show(t('login_required'));
                return;
            }
            if (window.Lampa && window.Lampa.Loading && window.Lampa.Loading.start) window.Lampa.Loading.start();
            pullRemoteProgress(300).catch(function (error) {
                console.warn('[YummyAnime] Remote history pull failed', error);
                return {imported: 0};
            }).then(function (pulled) {
                var history = playbackHistory();
                var videos = Object.keys(history).map(function (id) {
                    var item = history[id] || {};
                    if (!item.video_id) return null;
                    return {
                        video_id: Number(item.video_id),
                        time: Number(item.time || 0),
                        date: Math.floor(Number(item.updated_at || Date.now()) / 1000)
                    };
                }).filter(function (item) { return item && item.video_id; });
                if (!videos.length) {
                    if (window.Lampa && window.Lampa.Loading && window.Lampa.Loading.stop) window.Lampa.Loading.stop();
                    if (window.Lampa && window.Lampa.Noty) {
                        window.Lampa.Noty.show(pulled && pulled.imported ? t('sync_history_ok') : t('history_empty'));
                    }
                    return;
                }
                return window.LampaYaniApi.syncVideoWatches(videos).then(function () {
                    if (window.Lampa && window.Lampa.Loading && window.Lampa.Loading.stop) window.Lampa.Loading.stop();
                    if (window.Lampa && window.Lampa.Noty) window.Lampa.Noty.show(t('sync_history_ok'));
                });
            }).catch(function (error) {
                if (window.Lampa && window.Lampa.Loading && window.Lampa.Loading.stop) window.Lampa.Loading.stop();
                console.error('[YummyAnime] History sync failed', error);
                if (window.Lampa && window.Lampa.Noty) window.Lampa.Noty.show(t('sync_history_error'));
            });
        }

        function continueOwner() {
            var progress = deps.progress || window.LampaYaniEpisodeProgress;
            if (progress && progress.owner) return progress.owner();
            var auth = window.LampaYaniAuth;
            var account = auth && auth.get ? auth.get() || {} : {};
            var token = auth && auth.token ? auth.token() || '' : account.token || '';
            if (!token) return {key: 'anonymous'};
            var identity = account.login || account.email || account.user_id || account.userId || account.id;
            return {key: identity ? 'account:' + String(identity).toLowerCase() : 'session:' + token};
        }

        function sameContinueOwner(owner) {
            var progress = deps.progress || window.LampaYaniEpisodeProgress;
            var current = continueOwner();
            return progress && progress.sameOwner ? progress.sameOwner(owner, current) : owner.key === current.key;
        }

        function continueActivity() {
            return window.Lampa && window.Lampa.Activity && window.Lampa.Activity.active
                ? window.Lampa.Activity.active() : null;
        }

        function showContinueMenu(rendered, card, options) {
            options = options || {};
            var lampa = window.Lampa;
            var choices = deps.choicePanel || window.LampaYaniChoicePanel;
            if (!lampa || !card || !(choices && choices.show) && !(lampa.Select && lampa.Select.show)) return false;
            var element = rendered && rendered.jquery ? rendered : $(rendered);
            var node = element[0];
            var owner = continueOwner();
            var activity = continueActivity();
            var controller = lampa.Controller && lampa.Controller.enabled ? lampa.Controller.enabled() : {};
            var collection = element.closest('.scroll, .yani-home');
            var settled = false;
            function valid() {
                return (!options.valid || options.valid()) && (!node || node.isConnected !== false) &&
                    activity === continueActivity() && sameContinueOwner(owner);
            }
            if (!valid()) return false;
            function restore() {
                if (!valid()) return false;
                if (lampa.Controller && lampa.Controller.toggle) lampa.Controller.toggle(controller.name || 'content');
                if (collection.length && lampa.Controller && lampa.Controller.collectionSet) lampa.Controller.collectionSet(collection);
                if (node && lampa.Controller && lampa.Controller.collectionFocus) {
                    if (window.Navigator && window.Navigator.add) window.Navigator.add(node);
                    lampa.Controller.collectionFocus(node, collection.length ? collection : undefined);
                }
                return true;
            }
            function perform(item) {
                if (!item) return;
                if (item.key === 'resume') {
                    if (options.resume) options.resume(card);
                    else openVideos(card, true);
                } else if (item.key === 'detail') {
                    if (options.detail) options.detail(card);
                    else openYummyDetail(card, false);
                }
            }
            if (choices && choices.show) {
                return choices.show({
                    title: t('continue_watching'),
                    context: {title: card.title, poster: card.poster || card.img || ''},
                    items: [
                        {title: t('continue_watching'), key: 'resume'},
                        {title: t('open_anime_card'), key: 'detail'}
                    ],
                    compact: true, origin: element, collection: collection, valid: valid,
                    onClose: function (reason) {
                        if (reason !== 'select') settled = true;
                        if (options.onClose) options.onClose(reason);
                    },
                    onSelect: function (item) {
                        if (settled || !valid()) return;
                        settled = true;
                        perform(item);
                    }
                });
            }
            lampa.Select.show({
                title: card.title || t('continue_watching'),
                items: [
                    {title: t('continue_watching'), key: 'resume'},
                    {title: t('open_anime_card'), key: 'detail'}
                ],
                onBack: function () {
                    if (settled) return;
                    settled = true;
                    if (options.onClose) options.onClose();
                    restore();
                },
                onSelect: function (item) {
                    if (settled) return;
                    settled = true;
                    if (options.onClose) options.onClose();
                    if (!restore() || !item) return;
                    perform(item);
                }
            });
            return true;
        }

        function bindContinueMenu(rendered, card, options) {
            options = options || {};
            var element = rendered && rendered.jquery ? rendered : $(rendered);
            var node = element[0];
            if (!node || !card) return;
            var previous = node.yaniContinueMenu;
            if (previous && previous.destroy) previous.destroy();
            var owner = continueOwner();
            var activity = continueActivity();
            var state = {menuOpen: false, releaseClick: false, enterUntil: 0, panel: null};
            function valid() {
                return node.yaniContinueMenu === state && node.isConnected !== false &&
                    activity === continueActivity() && sameContinueOwner(owner) && (!options.valid || options.valid());
            }
            function stop(event) {
                if (!event) return;
                if (event.preventDefault) event.preventDefault();
                if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                else if (event.stopPropagation) event.stopPropagation();
            }
            function freshPress() {
                state.releaseClick = false;
                state.enterUntil = 0;
            }
            function guardEnter(event) {
                if (!valid() || state.menuOpen || Date.now() < state.enterUntil) stop(event);
                else if (options.enter) {
                    stop(event);
                    options.enter(card);
                }
            }
            function guardClick(event) {
                if (!valid() || state.menuOpen || state.releaseClick) {
                    state.releaseClick = false;
                    // Controller schedules hover:enter 20ms after a click. This
                    // also catches callbacks a host already queued before us.
                    state.enterUntil = Date.now() + 80;
                    stop(event);
                } else if (options.enter) {
                    stop(event);
                    options.enter(card);
                }
            }
            function openMenu(event) {
                stop(event);
                if (!valid() || state.menuOpen) return;
                state.releaseClick = true;
                state.enterUntil = Date.now() + 80;
                state.menuOpen = true;
                var menuOptions = Object.assign({}, options, {
                    valid: valid,
                    onClose: function () {
                        state.menuOpen = false; state.panel = null;
                        if (options.onClose) options.onClose();
                    }
                });
                var opened = showContinueMenu(element, card, menuOptions);
                state.panel = opened && opened.destroy ? opened : null;
                if (!opened) state.menuOpen = false;
            }
            state.open = openMenu;
            state.valid = valid;
            state.destroy = function () {
                var panel = state.panel; state.panel = null; state.menuOpen = false;
                if (panel && panel.destroy) panel.destroy();
                if (node.removeEventListener) {
                    node.removeEventListener('hover:long', openMenu, true);
                    node.removeEventListener('hover:enter', guardEnter, true);
                    node.removeEventListener('click', guardClick, true);
                    ['pointerdown', 'mousedown', 'touchstart'].forEach(function (name) { node.removeEventListener(name, freshPress, true); });
                }
                element.off('.yaniContinueMenu');
                if (node.yaniContinueMenu === state) delete node.yaniContinueMenu;
            };
            node.yaniContinueMenu = state;
            // Capture runs before Card's pre-existing native and jQuery menus.
            // Lampa's keyboard already separates an 800ms hold from a tap.
            if (node.addEventListener) {
                node.addEventListener('hover:long', openMenu, true);
                node.addEventListener('hover:enter', guardEnter, true);
                node.addEventListener('click', guardClick, true);
                ['pointerdown', 'mousedown', 'touchstart'].forEach(function (name) { node.addEventListener(name, freshPress, true); });
            }
            element.on('hover:long.yaniContinueMenu', openMenu);
            return state;
        }

        function bindHistoryCardRender(first, second, third) {
            var card;
            var cardApi;
            var element;
            var values = [first, second, third];
            function hasCard(value) { return value && (value.yani_id || value.anime_id || value.animeId); }
            values.forEach(function (value) {
                if (!value) return;
                if (!element && (value.jquery || value.nodeType || (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement))) element = value;
                if (!cardApi && typeof value.render === 'function') cardApi = value;
                if (!card && hasCard(value)) card = value;
            });
            values.forEach(function (value) {
                if (!value || card) return;
                var candidate = value.card || value.object || value.data;
                if (hasCard(candidate)) card = candidate;
            });
            if (!element && cardApi) element = cardApi.render(true);
            var node = element && element.jquery ? element[0] : element;
            if (!card && node) card = node.card_data || node.yaniBoundCard;
            if (!hasCard(card)) return;
            card.yani_id = card.yani_id || card.anime_id || card.animeId;
            bindYummyCardRender(element, card, cardApi);
            var rendered = cardRenderElement(element, card);
            var openHistoryEntry = function () {
                if (!binding || binding.valid()) openVideos(card, true);
            };
            rendered.addClass('yani-history-card').attr('data-yani-history-id', String(card.yani_id));
            rendered.closest('.category-full, .items-cards').addClass('yani-card-grid');
            rendered.add(rendered.find('*')).off('hover:enter.yaniOpen click.yaniOpen hover:enter.yaniHistory click.yaniHistory');
            rendered.on('hover:enter.yaniHistory click.yaniHistory', function (event) {
                if (event) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                }
                openHistoryEntry();
                return false;
            });
            var binding = bindContinueMenu(rendered, card, {enter: openHistoryEntry});
            card.onEnter = openHistoryEntry;
            card.onMenu = binding && binding.open;
            if (cardApi) {
                cardApi.onEnter = openHistoryEntry;
                cardApi.onMenu = binding && binding.open;
            }
            renderHistoryProgress(rendered, card.yani_resume || {});
        }

        return {
            playbackHistory: playbackHistory,
            getPlayback: getPlayback,
            rememberPlayback: rememberPlayback,
            importRemoteEntries: importRemoteEntries,
            importVideosProgress: importVideosProgress,
            pullRemoteProgress: pullRemoteProgress,
            ensureRemoteHistory: ensureRemoteHistory,
            autoProgressSyncEnabled: autoProgressSyncEnabled,
            syncServerProgress: syncServerProgress,
            renderHistoryProgress: renderHistoryProgress,
            refreshVisiblePlaybackProgress: refreshVisiblePlaybackProgress,
            updatePlaybackProgress: updatePlaybackProgress,
            syncPlaybackHistoryManually: syncPlaybackHistoryManually,
            bindHistoryCardRender: bindHistoryCardRender,
            bindContinueMenu: bindContinueMenu,
            showContinueMenu: showContinueMenu
        };
    }

    window.LampaYani = window.LampaYani || {};
    window.LampaYani.PlaybackHistory = window.LampaYaniPlaybackHistory = {
        create: create
    };
}(window));

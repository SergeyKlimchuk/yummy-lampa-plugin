(function (window) {
    'use strict';

    function t(name) {
        return window.LampaYaniI18n ? LampaYaniI18n.t(name) : name;
    }

    function locale() {
        return window.LampaYaniI18n ? LampaYaniI18n.locale() : 'ru-RU';
    }

    var videoData = LampaYaniVideoData.create({
        fetch: function (id, options) { return LampaYaniApi.videos(id, options); }
    });

    var cardModel = LampaYaniCardModel.create({
        t: t,
        getPlayback: function (id) { return getPlayback(id); },
        formatRating: function (value) { return formatRating(value); },
        createRatingLogo: function (rating, className) { return createRatingLogo(rating, className); }
    });
    var toCard = cardModel.toCard;
    var extractRatings = cardModel.extractRatings;
    var mediaMeta = cardModel.mediaMeta;
    var watchedEpisodeCount = cardModel.watchedEpisodeCount;
    var createDetailRatings = cardModel.createDetailRatings;

    var cardRenderers = LampaYaniCardRenderers.create({
        t: t,
        locale: locale,
        getPlayback: function (id) { return getPlayback(id); },
        mediaMeta: function (item) { return mediaMeta(item); },
        loadVideos: function (id, options) { return videoData.payload(id, options); }
    });
    var cardRenderElement = cardRenderers.cardRenderElement;
    var addCardMediaBadges = cardRenderers.addCardMediaBadges;
    var mediaTypeLabels = cardRenderers.mediaTypeLabels;
    var cardMediaMotionAllowed = cardRenderers.cardMediaMotionAllowed;
    var cardStatusLabel = cardRenderers.cardStatusLabel;
    var cardStatusKey = cardRenderers.cardStatusKey;
    var cardEpisodesLabel = cardRenderers.cardEpisodesLabel;
    var addCardMetadata = cardRenderers.addCardMetadata;
    var cardFreshness = cardRenderers.cardFreshness;
    var addCardUpdateBadge = cardRenderers.addCardUpdateBadge;
    var addCardRecommendationBadge = cardRenderers.addCardRecommendationBadge;
    var addCardListBadge = cardRenderers.addCardListBadge;
    var cardPlaybackState = cardRenderers.cardPlaybackState;
    var addCardPlaybackProgress = cardRenderers.addCardPlaybackProgress;
    var syncCardEpisodesMeta = cardRenderers.syncCardEpisodesMeta;
    var syncCardOverlayLayout = cardRenderers.syncCardOverlayLayout;
    var formatRating = cardRenderers.formatRating;
    var createRatingLogo = cardRenderers.createRatingLogo;
    var addCardRatings = cardRenderers.addCardRatings;

    var cardBind = LampaYaniCardBind.create({
        decorate: cardRenderers.decorate,
        cardRenderElement: cardRenderElement,
        attachPosterFallback: function (element, card) { return LampaYaniMedia.attachPosterFallback(element, card); },
        openYummyDetail: function (card, notifyFallback) { return openYummyDetail(card, notifyFallback); },
        openStandardLampaCard: function (card) { return openStandardLampaCard(card); },
        showYummyActions: function (card, originElement, originCollection) {
            return showYummyActions(card, originElement, originCollection);
        }
    });
    var getYummyId = cardBind.getYummyId;
    var hasYummyCardData = cardBind.hasYummyCardData;
    var openCardOnce = cardBind.openCardOnce;
    var bindYummyCard = cardBind.bindYummyCard;
    var bindYummyCardRender = cardBind.bindYummyCardRender;
    var bindRecommendedCardRender = cardBind.bindRecommendedCardRender;

    var standardCard = LampaYaniStandardCard.create({
        t: t,
        getYummyId: function (card) { return getYummyId(card); },
        hasYummyCardData: function (value) { return hasYummyCardData(value); },
        openYummyDetail: function (card, notifyFallback) { return openYummyDetail(card, notifyFallback); },
        toCard: function (item) { return toCard(item); },
        formatRating: formatRating
    });
    var openStandardLampaCard = standardCard.openStandardLampaCard;
    var installUndefinedTmdbGuard = standardCard.installUndefinedTmdbGuard;
    var findStandardLampaCard = standardCard.findStandardLampaCard;
    var findYummyMatches = standardCard.findYummyMatches;
    var isNativeAnimeCard = standardCard.isNativeAnimeCard;
    var installFullRating = standardCard.installFullRating;


    var activePlaybackSetup = null;
    var playbackMenu = LampaYaniPlaybackMenu.create({
        onPlaybackRestored: function () {
            if (activePlaybackSetup && activePlaybackSetup.playbackRestored) activePlaybackSetup.playbackRestored();
        },
        preferences: window.LampaYaniPlaybackPreferences,
        openPicker: openPlaybackPicker,
        t: t,
        showYummySelect: function (params, snapshot) { return showYummySelect(params, snapshot); },
        currentControllerName: function () { return currentControllerName(); },
        listActionTitle: function (card, key) { return listActionTitle(card, key); },
        openYummyDetail: function (card, notifyFallback) { return openYummyDetail(card, notifyFallback); },
        commentsMenu: function (animeId, page, comments, navigation) { return commentsMenu(animeId, page, comments, navigation); },
        openSettingsLogin: function () { return openSettingsLogin(); },
        addCardListBadge: addCardListBadge,
        onListChanged: publishListState,
        syncCardOverlayLayout: syncCardOverlayLayout,
        getPlayback: function (id) { return getPlayback(id); },
        voiceOptionSubtitle: function (group) { return voiceOptionSubtitle(group); },
        videoQualityLabel: function (video) { return videoQualityLabel(video); },
        getPreferredPlayer: function () { return getPreferredPlayer(); },
        allohaIframeEnabled: function () { return allohaIframeEnabled(); },
        groupPlaybackPriority: function (group) { return groupPlaybackPriority(group); },
        videoPlaybackPriority: function (video, group) { return videoPlaybackPriority(video, group); },
        playerMatchesPreference: function (group, preference) { return playerMatchesPreference(group, preference); },
        rememberPlayer: function (group) { return rememberPlayer(group); },
        launchVideo: function (card, group, videos, selected, options) { return launchVideo(card, group, videos, selected, options); },
        enrichEpisodeTitles: function (card, group) { return enrichEpisodeTitles(card, group); },
        enrichVoiceOptionQuality: function (item, target) { return enrichVoiceOptionQuality(item, target); },
        episodeOptionTitle: function (card, video) { return episodeOptionTitle(card, video); },
        playbackTargetPreference: function () { return playbackTargetPreference(); },
        androidExternalPlayerAvailable: function () { return isAndroidPlatform(); },
        isPlaybackSourceEnabled: function (sourceId) { return isPlaybackSourceEnabled(sourceId); },
        playbackSourceId: function (group) { return playbackSourceId(group); },
        openExternalPlayer: function (current, playlist, card) { return openExternalPlayer(current, playlist, card); },
        playInternalPlayer: function (current, playlist) { return playInternalPlayer(current, playlist); },
        yummyTvEnabled: function () { return yummyTvEnabled(); },
        yummyTvAnimeId: function (card) { return yummyTvAnimeId(card); },
        openYummyTv: function (card) { return openYummyTv(card); },
        cancelExternalRestore: function () { return cancelExternalRestore(); },
        loadVideos: function (id, options) { return videoData.payload(id, options); }
    });
    var playbackReturnState = playbackMenu.playbackReturnState;
    var videoSourceUrl = playbackMenu.videoSourceUrl;
    var playerKey = playbackMenu.playerKey;
    var beginPlaybackNavigation = playbackMenu.beginPlaybackNavigation;
    var playbackReturnSnapshot = playbackMenu.playbackReturnSnapshot;
    var clearPlaybackReturn = playbackMenu.clearPlaybackReturn;
    var restorePlaybackInteraction = playbackMenu.restorePlaybackInteraction;
    var showPlaybackSelect = playbackMenu.showPlaybackSelect;
    var showYummyActions = playbackMenu.showYummyActions;
    var openVideos = playbackMenu.openVideos;
    var chooseEpisode = playbackMenu.chooseEpisode;
    var showDirectPlaybackOptions = playbackMenu.showDirectPlaybackOptions;
    var openTitlePlaybackOptions = playbackMenu.openTitlePlaybackOptions;


    var playbackHistoryApi = LampaYaniPlaybackHistory.create({
        progress: window.LampaYaniEpisodeProgress,
        t: t,
        bindYummyCardRender: function (first, second, third, options) {
            return bindYummyCardRender(first, second, third, options);
        },
        cardRenderElement: cardRenderElement,
        openVideos: function (card, resume) { return openVideos(card, resume); },
        openYummyDetail: function (card, fallback) { return openYummyDetail(card, fallback); },
        addCardPlaybackProgress: addCardPlaybackProgress,
        syncCardEpisodesMeta: cardRenderers.syncCardEpisodesMeta,
        syncCardOverlayLayout: cardRenderers.syncCardOverlayLayout,
        playerKey: function (group) { return playerKey(group); },
        videoSourceUrl: function (video) { return videoSourceUrl(video); }
    });
    var playbackHistory = playbackHistoryApi.playbackHistory;
    var getPlayback = playbackHistoryApi.getPlayback;
    var rememberPlayback = playbackHistoryApi.rememberPlayback;
    var importRemoteEntries = playbackHistoryApi.importRemoteEntries;
    var importVideosProgress = playbackHistoryApi.importVideosProgress;
    var pullRemoteProgress = playbackHistoryApi.pullRemoteProgress;
    var ensureRemoteHistory = playbackHistoryApi.ensureRemoteHistory;
    var autoProgressSyncEnabled = playbackHistoryApi.autoProgressSyncEnabled;
    var syncServerProgress = playbackHistoryApi.syncServerProgress;
    var renderHistoryProgress = playbackHistoryApi.renderHistoryProgress;
    var refreshVisiblePlaybackProgress = playbackHistoryApi.refreshVisiblePlaybackProgress;
    var updatePlaybackProgress = playbackHistoryApi.updatePlaybackProgress;
    var syncPlaybackHistoryManually = playbackHistoryApi.syncPlaybackHistoryManually;
    var bindHistoryCardRender = playbackHistoryApi.bindHistoryCardRender;

    var externalRestoreState = {
        pending: false,
        installed: false,
        session: 0,
        openedAt: 0,
        departed: false,
        controller: 'content',
        element: null,
        collection: null
    };
    var usagePolicyVisible = false;
    var authSettingsParamDefinition = null;
    var tileNavigationKey = '';
    var tileNavigationAt = 0;

    function beginTileNavigation(key) {
        var now = Date.now();
        key = String(key || '');
        if (key && tileNavigationKey === key && now - tileNavigationAt < 1000) return false;
        tileNavigationKey = key;
        tileNavigationAt = now;
        return true;
    }

    function goBack() {
        if (window.Lampa && Lampa.Activity && Lampa.Activity.backward) {
            Lampa.Activity.backward();
        }
    }

    function transientNavigationSnapshot() {
        if (window.LampaYaniNavigation && LampaYaniNavigation.captureSnapshot) {
            var shared = LampaYaniNavigation.captureSnapshot();
            shared.controller = currentControllerName() || 'content';
            return shared;
        }
        var element = document.querySelector('.yani-home .selector.focus, .yani-detail .selector.focus, .yani-account .selector.focus, .yani-schedule .selector.focus') ||
            document.querySelector('.selector.focus') ||
            document.querySelector('.yani-home .selector, .yani-detail .selector, .yani-account .selector, .yani-schedule .selector') ||
            document.querySelector('.selector');
        var collection = element ? $(element).closest('.scroll, .yani-detail, .yani-home, .yani-account, .yani-schedule') : null;
        return {
            controller: currentControllerName() || 'content',
            element: element || null,
            collection: collection && collection.length ? collection : null
        };
    }

    function restoreTransientInteraction(snapshot) {
        snapshot = snapshot || transientNavigationSnapshot();
        setTimeout(function () {
            try {
                if (window.LampaYaniNavigation && LampaYaniNavigation.restoreSnapshot) {
                    LampaYaniNavigation.restoreSnapshot(snapshot);
                    return;
                }
                var controller = snapshot.controller && snapshot.controller !== 'select' && snapshot.controller !== 'input'
                    ? snapshot.controller
                    : 'content';
                var element = snapshot.element;
                if (!element || !document.documentElement.contains(element)) {
                    element = document.querySelector('.yani-home .selector') ||
                        document.querySelector('.yani-detail .selector') ||
                        document.querySelector('.yani-account .selector') ||
                        document.querySelector('.yani-schedule .selector') ||
                        document.querySelector('.selector');
                }
                var collection = snapshot.collection;
                if (!collection || !collection.length || !document.documentElement.contains(collection[0])) {
                    collection = element ? $(element).closest('.scroll, .yani-detail, .yani-home, .yani-account, .yani-schedule') : null;
                }
                if (Lampa.Controller && Lampa.Controller.toggle) Lampa.Controller.toggle(controller);
                if (collection && collection.length && Lampa.Controller && Lampa.Controller.collectionSet) {
                    Lampa.Controller.collectionSet(collection);
                }
                if (element && Lampa.Controller && Lampa.Controller.collectionFocus) {
                    // Select leaves Navigator on hidden selectbox items; re-register
                    // the page target so D-pad focus is visible without an extra key.
                    if (window.Navigator && Navigator.add) Navigator.add(element);
                    Lampa.Controller.collectionFocus(element, collection && collection.length ? collection : undefined);
                }
            } catch (error) {
                console.warn('[YummyAnime] Could not restore transient navigation', error);
            }
        }, 0);
    }

    function showBasicYummyChoice(params, snapshot) {
        if (window.LampaYaniChoicePanel && params && !params.nohide && params.yaniRestore !== false && !params.onDraw && Array.isArray(params.items) && params.items.every(function (item) { return !item.checkbox && !item.template && !item.onDraw; })) {
            snapshot = snapshot || transientNavigationSnapshot();
            return Boolean(LampaYaniChoicePanel.show({
                title: params.title, description: params.description, items: params.items.map(function (item, index) {
                    return Object.assign({}, item, {selected: item.selected || item.checked || (typeof params.selected === 'number' && params.selected === index)});
                }),
                origin: snapshot.element, collection: snapshot.collection,
                onSelect: params.onSelect, onBack: params.onBack, onClose: params.onClose
            }));
        }
        return false;
    }

    function showYummySelect(params, snapshot) {
        if (showBasicYummyChoice(params, snapshot)) return true;
        if (!Lampa.Select || !Lampa.Select.show) return false;
        snapshot = snapshot || transientNavigationSnapshot();
        params = Object.assign({}, params || {});
        // Playback chains disable this and restore themselves after the last window.
        var restoreOnClose = params.yaniRestore !== false;
        delete params.yaniRestore;
        var originalBack = params.onBack;
        var originalSelect = params.onSelect;
        var restored = false;

        function restoreAfterClose() {
            if (!restoreOnClose || restored) return;
            restored = true;
            restoreTransientInteraction(snapshot);
        }

        params.onBack = function () {
            // A nested Select may deliberately rebuild its parent list.
            // Only the root window should restore the underlying Activity.
            if (originalBack) {
                restored = true;
                return originalBack();
            }
            restoreAfterClose();
        };
        // Lampa Select.hide() after a choice does not call onBack, so Controller
        // would stay on 'select' until the next remote key. Restore when the box
        // actually closes and is not immediately replaced by another Select.
        params.onSelect = function (item) {
            var result = originalSelect ? originalSelect.apply(this, arguments) : undefined;
            if (!params.nohide) {
                setTimeout(function () {
                    if (restored) return;
                    if (Lampa.Select && typeof Lampa.Select.opened === 'function' && Lampa.Select.opened()) return;
                    restoreAfterClose();
                }, 0);
            }
            return result;
        };
        Lampa.Select.show(params);
        return true;
    }

    var trailerUi = LampaYaniTrailers.create({
        t: t,
        goBack: goBack,
        showSelect: showYummySelect,
        openExternalVideo: openExternalVideo,
        openEmbedded: openEmbeddedTrailer,
        api: LampaYaniApi,
        utils: LampaYaniUiUtils
    });
    var openTrailers = trailerUi.open;
    var TrailerList = trailerUi.Component;

    function tvRoutes() {
        return {
            home: function () { Lampa.Activity.push({component: 'yani_home', url: 'yani/home', title: 'YummyAnime'}); },
            search: openSearch, lists: openUserLists,
            catalog: function () { Lampa.Activity.push({component: 'yani_catalog', url: 'yani/catalog', title: 'YummyAnime · ' + t('catalog'), params: {limit: 30, sort: 'top', sort_forward: false}}); },
            account: openAccount, settings: openPluginSettings,
            more: function () {
                var entries = [
                    ['yani_schedule', 'schedule'], ['yani_history', 'watch_history'], ['yani_collections', 'collections'],
                    ['yani_top', 'top_rated'], ['yani_genres', 'genres'], ['yani_new_translations', 'new_translations'],
                    ['yani_new_releases', 'new_releases'], ['yani_recommended', 'for_you'], ['yani_updates', 'updates'],
                    ['yani_notifications', 'notifications'], ['yani_status', 'status']
                ];
                showYummySelect({title: t('home_lite_more'), items: entries.map(function (entry) { return {component: entry[0], title: t(entry[1])}; }), onSelect: function (item) {
                    if (item.component === 'yani_history') return openWatchHistory();
                    if (item.component === 'yani_collections') return openCollections();
                    if (item.component === 'yani_genres') return openGenres();
                    if (item.component === 'yani_notifications') return openNotifications();
                    Lampa.Activity.push({component: item.component, url: 'yani/' + item.component.slice(5), title: 'YummyAnime · ' + item.title});
                }});
            }
        };
    }

    function tvFactory(factory, active) {
        if (factory.yaniTvWrapped) return factory;
        function wrapped(object) {
            var component = new factory(object);
            return window.LampaYaniTvShell ? LampaYaniTvShell.wrap(component, {
                active: active, t: t, routes: tvRoutes(), logo: window.LampaYaniHome && LampaYaniHome.logo
            }) : component;
        }
        wrapped.yaniTvWrapped = true;
        return wrapped;
    }

    window.LampaYani = {
        register: function () {
            if (!window.Lampa || !Lampa.Component || !Lampa.Component.add) {
                console.error('[YummyAnime] Unsupported Lampa version');
                return;
            }

            var settingsReady = false;
            var sidebar = null;

            function addInterface() {
                if (settingsReady) return;
                settingsReady = true;
                try {
                    if (window.LampaYaniScale) LampaYaniScale.start(refreshScaledCardLayout);
                    addSettings();
                    // The account's watch history is shared between devices, so
                    // pull it before anything draws progress from the local
                    // copy — otherwise the TV keeps showing what the phone
                    // already finished.
                    ensureRemoteHistory();
                    registerOnlineSource();
                    registerSearchSource();
                    registerAndroidDirectVideoTube();
                } catch (settingsError) {
                    console.error('[YummyAnime] Settings registration failed', settingsError);
                }
                var account = LampaYaniAuth.get();
                if (account.token && LampaYaniAuth.refreshIfNeeded) {
                    LampaYaniAuth.refreshIfNeeded();
                }
            }

            // Keep the plugin rail across content screens; host player and auth keep their own controls.
            Catalog = tvFactory(Catalog, 'catalog');
            Top = tvFactory(Top, 'catalog');
            Recommended = tvFactory(Recommended, 'more');
            Updates = tvFactory(Updates, 'more');
            NewTranslations = tvFactory(NewTranslations, 'more');
            NewReleases = tvFactory(NewReleases, 'more');
            Collections = tvFactory(Collections, 'more');
            CollectionDetail = tvFactory(CollectionDetail, 'more');
            Genres = tvFactory(Genres, 'catalog');
            Schedule = tvFactory(Schedule, 'more');
            History = tvFactory(History, 'more');
            Detail = tvFactory(Detail, '');
            PlaybackSetup = tvFactory(PlaybackSetup, '');
            UsagePolicy = tvFactory(UsagePolicy, 'more');
            TrailerList = tvFactory(TrailerList, '');
            Account = tvFactory(Account, 'account');
            UserLists = tvFactory(UserLists, 'lists');
            AccountList = tvFactory(AccountList, 'lists');
            Notifications = tvFactory(Notifications, 'more');
            Subscriptions = tvFactory(Subscriptions, 'more');
            StatusDashboard = tvFactory(StatusDashboard, 'more');

            SettingsPage = tvFactory(SettingsPage, 'settings');
            Lampa.Component.add('yani_settings', SettingsPage);
            Lampa.Component.add('yani_home', Home);

            Lampa.Component.add('yani_catalog', Catalog);
            Lampa.Component.add('yani_top', Top);

            Lampa.Component.add('yani_recommended', Recommended);
            Lampa.Component.add('yani_updates', Updates);
            Lampa.Component.add('yani_new_translations', NewTranslations);
            Lampa.Component.add('yani_new_releases', NewReleases);
            Lampa.Component.add('yani_collections', Collections);
            Lampa.Component.add('yani_collection', CollectionDetail);
            Lampa.Component.add('yani_genres', Genres);
            Lampa.Component.add('yani_schedule', Schedule);
            Lampa.Component.add('yani_history', History);

            Lampa.Component.add('yani_detail', Detail);
            Lampa.Component.add('yani_playback', PlaybackSetup);
            Lampa.Component.add('yani_policy', UsagePolicy);
            Lampa.Component.add('yani_trailers', TrailerList);
            Lampa.Component.add('yani_account', Account);
            Lampa.Component.add('yani_user_lists', UserLists);
            Lampa.Component.add('yani_account_list', AccountList);
            Lampa.Component.add('yani_notifications', Notifications);
            Lampa.Component.add('yani_subscriptions', Subscriptions);
            Lampa.Component.add('yani_auth', AuthPage);

            Lampa.Component.add('yani_status', StatusDashboard);
            Lampa.Component.add('yani_player', IframePlayer);

            installUndefinedTmdbGuard();
            installFullRating();

            if (window.appready) addInterface();
            else if (Lampa.Listener && Lampa.Listener.follow) {
                Lampa.Listener.follow('app', function (event) {
                    if (event.type === 'ready') addInterface();
                });
            }

            try {
                if (window.LampaYaniMenu && typeof LampaYaniMenu.create === 'function') {
                    sidebar = LampaYaniMenu.create({
                        onEnter: function () {
                            Lampa.Activity.push({
                                url: 'yani',
                                title: window.LampaYaniMenu.TITLE,
                                component: 'yani_home'
                            });
                        }
                    });
                    sidebar.start(Lampa.Listener);
                }
            } catch (menuError) {
                console.error('[YummyAnime] Sidebar registration failed', menuError);
            }

            console.log('[YummyAnime] Extension registered');
        }
    };

    function openPlaybackPicker(card, groups, selection, progressVideos) {
        clearPlaybackReturn();
        Lampa.Activity.push({
            url: 'yani/playback/' + card.yani_id,
            component: 'yani_playback',
            title: card.title || 'YummyAnime',
            card: card,
            groups: groups,
            progressVideos: progressVideos,
            progressOwner: window.LampaYaniEpisodeProgress && LampaYaniEpisodeProgress.owner(),
            selection: selection
        });
    }

    function PlaybackSetup(object) {
        var component = LampaYaniPlaybackPicker.create(object, {
            t: t,
            preferences: LampaYaniPlaybackPreferences,
            progress: window.LampaYaniEpisodeProgress,
            loadProgress: function (card) { return videoData.list(card.yani_id || card.anime_id, {fresh: true}); },
            sourceId: playbackSourceId,
            sourceLabel: function (group) { return playbackSourceLabel(playbackSourceId(group)) || group.player || group.source || t('source'); },
            playlist: function (card, group) { return playbackMenu.playbackPlaylist(group); },
            getPlayback: getPlayback,
            episodeTitle: episodeOptionTitle,
            groupSubtitle: function (group) {
                return Number(group.episodeCount || group.videos.length) + ' ' + t('episodes_short') +
                    (group.latestEpisode ? ' · ' + t('latest_episode') + ': ' + group.latestEpisode : '');
            },
            targetPreference: function (card) { return isAndroidPlatform() ? LampaYaniPlaybackPreferences.target(card, playbackTargetPreference()) : 'internal'; },
            rememberTarget: function (card, target) { if (isAndroidPlatform()) LampaYaniPlaybackPreferences.rememberTarget(card, target); },
            externalAvailable: function () { return isAndroidPlatform(); },
            launch: function (card, group, videos, selected, element, collection, target) {
                clearPlaybackReturn();
                beginPlaybackNavigation(element, collection);
                rememberPlayer(group);
                enrichEpisodeTitles(card, group);
                launchVideo(card, group, videos, playbackMenu.applySavedPlaybackPosition(card, selected), {
                    playbackTarget: isAndroidPlatform() ? target : 'internal'
                });
            },
            goBack: goBack,
            onDestroy: function (destroyed) { if (activePlaybackSetup === destroyed) activePlaybackSetup = null; }
        });
        activePlaybackSetup = component;
        return component;
    }

    function Top(object) {
        object.topMode = true;
        object.params = Object.assign({limit: 30, sort: 'top', sort_forward: true, from_year: 1900}, object.params || {});
        return Catalog(object);
    }

    function Catalog(object) {
        var requestedParams = copyParams(object.catalog_params || object.params || {limit: 30, sort: 'top', sort_forward: true});
        var comp = new Lampa.InteractionCategory(object);
        var topMode = Boolean(object.topMode);
        var baseParams = requestedParams;
        var limit = Number(baseParams.limit || 30);
        var maxPages = Math.ceil(20000 / limit) + 1;
        var seen = {};
        var requestedOffsets = {};
        var genreHeader;
        var genreDescriptionRequested = false;
        var subjectReferenceAnime = null;
        var destroyed = false;

        object.page = 1;
        baseParams.limit = limit;
        baseParams.offset = Number(baseParams.offset || 0);
        baseParams.sort = baseParams.sort || 'top';
        var hasSortDirection = Object.prototype.hasOwnProperty.call(baseParams, 'sort_forward');
        baseParams.sort_forward = hasSortDirection ?
            baseParams.sort_forward === true || baseParams.sort_forward === 'true' :
            baseParams.sort === 'top';

        function installGenreHeader() {
            var context = object.subject_context || object.genre_context;
            if (!context || genreHeader) return;
            var view = comp.render && comp.render();
            if (!view || !view.length) return;
            var isSubject = Boolean(object.subject_context);
            var title = isSubject ? String(context.title || context.name || '') : genreTitle(context);
            if (!title) return;
            var description = isSubject
                ? t(context.kind === 'studio' ? 'studio_catalog_description' : 'creator_catalog_description').replace('{name}', title)
                : genreDescription(context) || t('genre_catalog_fallback').replace('{genre}', title);
            genreHeader = $('<div class="yani-genre-catalog-header"></div>');
            var orb = $('<span class="yani-genre-catalog-header__orb" aria-hidden="true"><img alt=""><b></b></span>');
            if (isSubject) {
                var initials = title.split(/[\s\-_]+/).filter(Boolean).slice(0, 2).map(function (part) { return part.charAt(0); }).join('').toUpperCase();
                orb.addClass('is-subject is-' + (context.kind === 'studio' ? 'studio' : 'director')).find('b').text(initials || title.charAt(0).toUpperCase());
            }
            genreHeader.append(orb);
            var copy = $('<div class="yani-genre-catalog-header__copy"></div>');
            copy.append($('<span class="yani-genre-catalog-header__eyebrow"></span>').text(t(isSubject ? (context.kind === 'studio' ? 'studio' : 'creator') : 'genre_catalog')));
            copy.append($('<strong class="yani-genre-catalog-header__title"></strong>').text(title));
            copy.append($('<p class="yani-genre-catalog-header__description"></p>').text(description));
            genreHeader.append(copy);
            view.addClass('yani-genre-catalog-view');
            if (isSubject) view.addClass('yani-subject-catalog-view');
            view.prepend(genreHeader);
            if (comp.scroll && comp.scroll.minus) comp.scroll.minus(genreHeader);
            if (isSubject) loadSubjectInformation(context);
            else loadGenreDescription(context);
        }

        function loadSubjectInformation(context) {
            if (genreDescriptionRequested) return;
            var request;
            if (context.kind === 'studio' && context.url) request = LampaYaniApi.studio(context.url);
            else if (context.kind === 'director' && context.id !== undefined && context.id !== null) request = LampaYaniApi.director(context.id);
            if (!request) return;
            genreDescriptionRequested = true;
            if (window.LampaYaniMedia && LampaYaniMedia.findSubjectImage) {
                LampaYaniMedia.findSubjectImage(context.kind, context, subjectReferenceAnime).then(function (image) {
                    if (!image || !genreHeader || !genreHeader.closest('body').length) return;
                    genreHeader.find('.yani-genre-catalog-header__orb').addClass('has-image').find('img').attr('src', image);
                });
            }
            request.then(function (payload) {
                var detailed = payload && payload.response ? payload.response : payload;
                if (!detailed || !genreHeader || !genreHeader.closest('body').length) return;
                var title = String(detailed.title || context.title || '').trim();
                var secondary = String(detailed.title_jp || detailed.japanese_title || '').trim();
                if (title) genreHeader.find('.yani-genre-catalog-header__title').text(title);
                if (secondary) genreHeader.find('.yani-genre-catalog-header__description').text(t('original_name') + ': ' + secondary);
            }).catch(function () {});
        }

        function loadGenreDescription(context) {
            if (genreDescriptionRequested) return;
            var genreId = context && (context.id !== undefined ? context.id : context.value);
            if (!/^\d+$/.test(String(genreId || ''))) return;
            genreDescriptionRequested = true;
            LampaYaniApi.genre(genreId).then(function (payload) {
                var detailed = payload && payload.response ? payload.response : payload;
                var description = genreDescription(detailed);
                if (!description || !genreHeader || !genreHeader.length || !genreHeader.closest('body').length) return;
                genreHeader.find('.yani-genre-catalog-header__description').text(description);
            }).catch(function () {
                // The localized bundled description remains visible offline.
            });
        }

        function annotateGenreTop(items, offset) {
            if (!object.genre_context || baseParams.sort !== 'top' || !baseParams.sort_forward) return items;
            var title = genreTitle(object.genre_context);
            (items || []).forEach(function (item, index) {
                var position = Number(offset || 0) + index + 1;
                if (item && position <= 100) item.yani_genre_top = {position: position, genre: title};
            });
            return items;
        }
        var controls = LampaYaniCatalogControls.create({
            comp: comp,
            object: object,
            baseParams: baseParams,
            topMode: topMode,
            t: t,
            copyParams: copyParams,
            showSelect: showYummySelect,
            navigationSnapshot: transientNavigationSnapshot,
            filterModel: LampaYaniCatalogFilters
        });

        comp.create = function () {
            var self = this;
            this.activity.loader(true);
            LampaYaniApi.catalog(baseParams, object.genre_context || object.subject_context ? {
                cacheFirst: true,
                staleFallback: true,
                cacheTtl: 15 * 60 * 1000
            } : {})
                .then(function (payload) {
                    if (destroyed) return;
                    var raw = annotateGenreTop(LampaYaniApi.normalize(payload), baseParams.offset);
                    if (object.subject_context && raw.length) subjectReferenceAnime = raw[0];
                    var results = mapUniqueCards(raw, seen);
                    requestedOffsets[baseParams.offset] = true;
                    if (raw.length < limit) object.page = maxPages;
                    self.build({results: results, total_pages: maxPages, title: t(topMode ? 'top_rated' : 'anime')});
                    if (self.render) self.render().addClass('yani-lite-view');
                    if (self.activity && self.activity.loader) self.activity.loader(false);
                    installGenreHeader();
                    controls.install();
                })
                .catch(function (error) {
                    if (destroyed) return;
                    console.error('[YummyAnime]', error);
                    self.activity.loader(false);
                    Lampa.Noty.show(t('catalog_load_error'));
                });
        };
        comp.nextPageReuest = function (requestObject, resolve, reject) {
            var params = copyParams(baseParams);
            params.offset = baseParams.offset + (requestObject.page - 1) * limit;
            if (requestedOffsets[params.offset]) {
                resolve({results: [], total_pages: maxPages, title: t(topMode ? 'top_rated' : 'anime')});
                return;
            }
            requestedOffsets[params.offset] = true;

            LampaYaniApi.catalog(params, object.genre_context ? {
                cacheFirst: true,
                staleFallback: true,
                cacheTtl: 15 * 60 * 1000
            } : {}).then(function (payload) {
                if (destroyed) return reject(new Error('YummyAnime catalog was closed'));
                var raw = annotateGenreTop(LampaYaniApi.normalize(payload), params.offset);
                var results = mapUniqueCards(raw, seen);
                if (raw.length < limit) requestObject.page = maxPages;
                resolve({results: results, total_pages: maxPages, title: t(topMode ? 'top_rated' : 'anime')});
            }).catch(function (error) {
                delete requestedOffsets[params.offset];
                requestObject.page = Math.max(1, requestObject.page - 1);
                console.error('[YummyAnime]', error);
                Lampa.Noty.show(t('next_page_error'));
                reject(error);
            });
        };
        // Lampa builds use both spellings across releases.
        comp.nextPageRequest = comp.nextPageReuest;
        comp.cardRender = bindYummyCardRender;
        var originalCatalogDestroy = comp.destroy;
        comp.destroy = function () {
            destroyed = true;
            controls.destroy();
            if (originalCatalogDestroy) originalCatalogDestroy.apply(this, arguments);
        };
        return comp;
    }

    function Home(object) {
        return LampaYaniHome.create(object, {
            t: t,
            auth: LampaYaniAuth,
            api: LampaYaniApi,
            toCard: toCard,
            playbackHistory: playbackHistory,
            localHistoryCards: localHistoryCards,
            continueCards: homeContinueCards,
            resumeCard: function (card) { return openVideos(card, true); },
            bindContinueMenu: playbackHistoryApi.bindContinueMenu,
            ensureRemoteHistory: ensureRemoteHistory,
            accountListDefinitions: accountListDefinitions,
            listCounts: LampaYaniHomeInsights.listCounts,
            openUserListShortcut: openUserListShortcut,
            homeSectionEnabled: homeSectionEnabled,
            openUserLists: openUserLists,
            openContinueWatching: openContinueWatching,
            openWatchHistory: openWatchHistory,
            openSearch: openSearch,
            openGenres: openGenres,
            openAccount: openAccount,
            openNotifications: openNotifications,
            openCollections: openCollections,
            openYummyDetail: openYummyDetail,
            showSelect: showYummySelect,
            openSettings: openPluginSettings
        });
    }

    // Use the same episode-completion model as the full history page without
    // fetching title details just to draw a three-item home preview.
    function homeContinueCards() {
        var ceilings = {};
        try {
            var stored = Lampa.Storage.get('yani_episode_ceilings', '{}');
            if (typeof stored === 'string') stored = JSON.parse(stored || '{}');
            Object.keys(stored || {}).forEach(function (id) {
                var cached = stored[id];
                if (cached && Number(cached.count) > 0 && Date.now() - Number(cached.at || 0) < 86400000) {
                    ceilings[id] = Number(cached.count);
                }
            });
        } catch (ignore) {}
        var entries = LampaYaniHomeSections.mergeHistory(playbackHistory(), []);
        return LampaYaniHomeSections.continueWatchingEntries(entries, {}, ceilings).slice(0, 3).map(function (entry) {
            var card = toCard(Object.assign({}, entry.card || {}, {
                anime_id: entry.anime_id,
                title: entry.title || entry.card && entry.card.title,
                poster: entry.poster || entry.card && entry.card.poster,
                updated_at: entry.updated_at || 0
            }));
            LampaYaniHomeSections.attachHistoryEntry(card, entry);
            card.yani_list_progress = entry.duration > 0 ? Math.max(0, Math.min(1, Number(entry.time || 0) / Number(entry.duration))) : 0;
            card.yani_resume_episode = entry.number;
            card.yani_resume_next = Boolean(entry.resume_next);
            card.yani_resume_remaining = entry.duration > 0 ? Math.max(0, Math.ceil((Number(entry.duration) - Number(entry.time || 0)) / 60)) : 0;
            return card;
        });
    }

    function UsagePolicy(object) {
        var scroll = new Lampa.Scroll({mask: false, over: true, step: 250, notransition: true});
        scroll.minus();
        var html = $('<div class="yani-policy yani-lite-view"></div>');
        var title;
        var accept;

        this.create = function () {
            var self = this;
            var mark = $('<div class="yani-policy__mark" aria-hidden="true"></div>').html(yummyAnimeIcon());
            title = $('<div class="yani-policy__title selector"></div>').text(t('usage_policy_title'));
            var content = $('<div class="yani-policy__content"></div>');
            [
                t('usage_policy_as_is'),
                t('usage_policy_information'),
                t('usage_policy_legal'),
                t('usage_policy_responsibility')
            ].forEach(function (paragraph) {
                content.append($('<div class="yani-policy__paragraph"></div>').text(paragraph));
            });
            accept = $('<div class="yani-policy__accept selector"></div>').text(t('usage_policy_accept'));
            accept.on('hover:enter click.yaniPolicyAccept', function (event) {
                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                closeUsagePolicy();
            });
            html.append(mark, title, content, accept);
            html.on('hover:focus', function (event) {
                var target = $(event.target).closest('.selector');
                html.find('.focus').removeClass('focus');
                target.addClass('focus');
                scroll.update(target, true);
            });
            scroll.append(html);
            self.activity.loader(false);
        };

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () { Lampa.Controller.collectionSet(scroll.render()); Lampa.Controller.collectionFocus(title, scroll.render()); },
                left: function () { Lampa.Controller.toggle('menu'); },
                right: function () {},
                up: function () { if (Navigator.canmove('up')) Navigator.move('up'); else Lampa.Controller.toggle('head'); },
                down: function () { movePageDown(scroll); },
                enter: function () {
                    if (accept && accept.trigger) accept.trigger('hover:enter');
                },
                back: function () { closeUsagePolicy(); }
            });
            Lampa.Controller.toggle('content');
        };

        this.render = function (js) { return js ? scroll.render(true) : scroll.render(); };
        this.destroy = function () { usagePolicyVisible = false; scroll.destroy(); html.remove(); };
    }

    var usagePolicyLayer = null;
    var usagePolicyController = '';

    function closeUsagePolicy() {
        usagePolicyVisible = false;
        if (usagePolicyLayer) {
            usagePolicyLayer.remove();
            usagePolicyLayer = null;
        }
        var controller = usagePolicyController || 'settings';
        usagePolicyController = '';
        if (window.Lampa && Lampa.Controller && Lampa.Controller.toggle) {
            try { Lampa.Controller.toggle(controller); } catch (ignore) {}
        }
    }

    function showUsagePolicy() {
        if (usagePolicyVisible) return;
        usagePolicyVisible = true;
        usagePolicyController = document.querySelector('.settings') ? 'settings' : (currentControllerName() || 'settings');
        var layer = $('<div class="yani-policy-layer yani-lite-view"></div>');
        var dialog = $('<div class="yani-policy"></div>');
        var mark = $('<div class="yani-policy__mark" aria-hidden="true"></div>').html(yummyAnimeIcon());
        var title = $('<div class="yani-policy__title"></div>').text(t('usage_policy_title'));
        var content = $('<div class="yani-policy__content"></div>');
        [
            t('usage_policy_as_is'),
            t('usage_policy_information'),
            t('usage_policy_legal'),
            t('usage_policy_responsibility')
        ].forEach(function (paragraph) {
            content.append($('<div class="yani-policy__paragraph"></div>').text(paragraph));
        });
        var accept = $('<div class="yani-policy__accept selector"></div>').text(t('usage_policy_accept'));
        accept.on('hover:enter click.yaniPolicyAccept', function (event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            closeUsagePolicy();
        });
        dialog.append(mark, title, content, accept);
        layer.append(dialog);
        layer.on('hover:focus', function (event) {
            var target = $(event.target).closest('.selector');
            layer.find('.focus').removeClass('focus');
            target.addClass('focus');
        });
        $('body').append(layer);
        usagePolicyLayer = layer;
        Lampa.Controller.add('yani_policy', {
            toggle: function () {
                Lampa.Controller.collectionSet(layer);
                Lampa.Controller.collectionFocus(accept, layer);
            },
            left: function () {},
            right: function () {},
            up: function () { if (window.Navigator && Navigator.canmove('up')) Navigator.move('up'); },
            down: function () { if (window.Navigator && Navigator.canmove('down')) Navigator.move('down'); },
            enter: function () { accept.trigger('hover:enter'); },
            back: function () { closeUsagePolicy(); }
        });
        Lampa.Controller.toggle('yani_policy');
    }

    function lampaIcon() {
        return '<svg viewBox="0 0 110 104" aria-hidden="true"><path d="M81.674 103.11C98.568 93.723 110 75.697 110 55 110 24.624 85.376 0 55 0S0 24.624 0 55c0 20.697 11.432 38.723 28.326 48.11C14.887 94.372 6 79.224 6 62 6 34.938 27.938 13 55 13s49 21.938 49 49c0 17.224-8.887 32.373-22.326 41.11Z"/><path d="M92.955 80.008C95.549 74.55 97 68.445 97 62 97 38.804 78.196 20 55 20S13 38.804 13 62c0 6.445 1.452 12.55 4.045 18.008C16.362 77.116 16 74.1 16 71c0-21.539 17.461-39 39-39s39 17.461 39 39c0 3.1-.362 6.116-1.045 9.008Z"/><path d="M55 89c14.359 0 26-11.641 26-26 0-5.071-1.451-9.802-3.961-13.801C82.579 54.799 86 62.5 86 71c0 17.121-13.879 31-31 31S24 88.121 24 71c0-8.5 3.421-16.201 8.961-21.801C30.451 53.198 29 57.929 29 63c0 14.359 11.641 26 26 26Z"/><circle cx="55" cy="63" r="18"/></svg>';
    }

    function yummyAnimeIcon() {
        return '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M18.45 0H1.55A1.55 1.55 0 0 0 0 1.55v16.9A1.54 1.54 0 0 0 1.55 20h16.9A1.55 1.55 0 0 0 20 18.45V1.55A1.54 1.54 0 0 0 18.45 0Zm-2.83 5.93-2.1 2.66-2.3-5.43a6.95 6.95 0 0 1 4.4 2.77Zm-2.9 6.57h-4l2.03-4.8 1.98 4.8Zm-2.37-9.34L7.8 9.06 4.87 5.33c.64-.7 1.4-1.26 2.27-1.65a8.18 8.18 0 0 1 3.2-.52ZM3.57 7.39l3.2 4.06-1.56 3.58A6.96 6.96 0 0 1 3.57 7.39Zm6.57 9.56c-1.05.01-2.1-.2-3.05-.65l.76-1.8h5.7l.49 1.15a6.93 6.93 0 0 1-3.9 1.3Zm6.8-7.07a7.8 7.8 0 0 1-1.17 4L14.55 11l2.17-2.77c.14.54.21 1.1.23 1.65Z"/></svg>';
    }

    function Recommended(object) {
        return LampaYaniRecommendations.component(object, {
            t: t,
            history: playbackHistory,
            authorized: function () { return Boolean(LampaYaniAuth.token()); },
            watchHistory: LampaYaniApi.watchHistory,
            resolveUserId: resolveUserListsUserId,
            loadLists: loadUserListsSnapshot,
            loadList: LampaYaniApi.userList,
            normalizeList: normalizeUserList,
            subscriptions: LampaYaniApi.subscriptions,
            schedule: LampaYaniApi.schedule,
            feed: LampaYaniApi.feed,
            notifications: LampaYaniApi.notifications,
            normalizeNotifications: normalizeNotifications,
            detail: LampaYaniApi.detail,
            normalize: LampaYaniApi.normalize,
            toCard: toCard,
            cardRender: bindRecommendedCardRender,
            notice: function (message) { Lampa.Noty.show(message); }
        });
    }

    function NewTranslations(object) {
        return LampaYaniTranslations.component(object, {
            t: t,
            feed: LampaYaniApi.feed,
            toCard: toCard,
            cardRender: bindRecommendedCardRender,
            notice: function (message) { Lampa.Noty.show(message); }
        });
    }

    function NewReleases(object) {
        return LampaYaniReleases.component(object, {
            t: t,
            feed: LampaYaniApi.feed,
            toCard: toCard,
            cardRender: bindRecommendedCardRender,
            notice: function (message) { Lampa.Noty.show(message); }
        });
    }

    function Collections(object) {
        return LampaYaniCollections.catalog(object, {
            t: t,
            feed: LampaYaniApi.feed,
            load: LampaYaniApi.collectionCatalog,
            detail: LampaYaniApi.collectionDetail,
            toCard: toCard,
            decorate: function (element, card) {
                cardRenderers.decorate(element, card);
                LampaYaniMedia.attachPosterFallback(element, card);
            },
            open: openCollection,
            openCard: function (card) { openYummyDetail(card, false); },
            error: function (message) { Lampa.Noty.show(message); }
        });
    }

    function bindGenreTile(cardApi, card) {
        if (!card || !card.yani_genre) return;
        // Legacy InteractionCategory sets cardApi.onEnter to push component:'full'
        // before cardRender runs. That native listener fires before any jQuery
        // handler, so the only reliable fix is to replace onEnter itself.
        if (cardApi) {
            cardApi.onEnter = function () { openGenreCatalog(card.yani_genre); };
        }
        var render = cardApi && typeof cardApi.render === 'function'
            ? $(cardApi.render(true))
            : cardApi && (cardApi.jquery || cardApi.nodeType)
                ? (cardApi.jquery ? cardApi : $(cardApi))
                : $();
        if (!render.length) return;
        var node = render[0];
        if (node) node.card_data = card;
        render.addClass('yani-genre-tile-card yani-genre-catalog-tile');
    }

    function bindGenreTiles(self, cards) {
        var root = self && self.render ? self.render() : null;
        if (!root) return;
        $(root).find('.card').each(function (index) {
            var card = cards[index];
            if (!card || !card.yani_genre) return;
            if (this.card_data !== card) this.card_data = card;
            $(this).addClass('yani-genre-tile-card yani-genre-catalog-tile');
        });
    }

    function Genres(object) {
        object.page = 1;
        var comp = new Lampa.InteractionCategory(object);
        var genreCards = [];
        var destroyed = false;
        var cacheUpdateHandler = null;
        var focusScope = LampaYaniNavigation.createScope({
            id: 'genres:' + String(object && object.url || 'yani/genres'),
            root: function () { return comp.render ? comp.render() : $(); },
            collection: function () { return comp.scroll && comp.scroll.render ? comp.scroll.render() : comp.render(); },
            scroll: comp.scroll,
            selector: '.card.selector'
        });

        comp.create = function () {
            var self = this;
            this.activity.loader(true);
            if (!cacheUpdateHandler) {
                cacheUpdateHandler = function (event) {
                    var detail = event && event.detail || {};
                    if (destroyed || detail.path !== '/anime/genres' || !detail.payload) return;
                    var genres = LampaYaniApi.normalizeGenres(detail.payload).filter(function (genre) {
                        return genreTitle(genre) && genreValue(genre) !== null;
                    });
                    if (!genres.length) return;
                    genreList = genres;
                    genreListAt = Date.now();
                    genreCards = genreTilesRow(genres).results;
                    var byId = {};
                    genreCards.forEach(function (card) { byId[String(genreValue(card.yani_genre))] = card; });
                    $(self.render()).find('.card').each(function () {
                        var current = this.card_data;
                        var fresh = current && current.yani_genre ? byId[String(genreValue(current.yani_genre))] : null;
                        if (!fresh) return;
                        this.card_data = fresh;
                        $(this).find('.card__title').first().text(fresh.title || '');
                        if (window.LampaYaniMedia) LampaYaniMedia.attachPosterFallback(this, fresh);
                    });
                };
                document.addEventListener('yani:cache-updated', cacheUpdateHandler);
            }
            loadGenreList().then(function (genres) {
                if (destroyed) return;
                genreCards = genreTilesRow(genres).results;
                self.build({results: genreCards, total_pages: 1, title: t('genres')});
                if (self.activity && self.activity.loader) self.activity.loader(false);
                if (self.render) self.render().addClass('yani-tile-catalog yani-genres-tile-catalog');
                bindGenreTiles(self, genreCards);
                focusScope.bind(self.render());
                if (!genreCards.length) Lampa.Noty.show(t('genres_empty'));
            }).catch(function (error) {
                if (destroyed) return;
                console.error('[YummyAnime Genres]', error);
                self.activity.loader(false);
                Lampa.Noty.show(t('genres_load_error'));
            });
        };

        // Lampa legacy signature: cardRender(object, data, cardInstance)
        comp.cardRender = function (first, second, third) {
            var cardApi;
            var card;
            var values = [first, second, third];
            values.forEach(function (value) {
                if (!value) return;
                if (!cardApi && typeof value.onEnter !== 'undefined' && typeof value.render === 'function') cardApi = value;
                if (!card && value.yani_genre_tile) card = value;
                var candidate = value.card || value.object || value.data;
                if (!card && candidate && candidate.yani_genre_tile) card = candidate;
            });
            if (!cardApi && third && typeof third.render === 'function') cardApi = third;
            if (!card && second && second.yani_genre_tile) card = second;
            var node = first && (first.jquery || first.nodeType) ? (first.jquery ? first[0] : first) : null;
            if (!card && node && node.card_data && node.card_data.yani_genre_tile) card = node.card_data;
            if (!card) return;
            bindGenreTile(cardApi || node, card);
        };

        var originalGenresDestroy = comp.destroy;
        var originalGenresStart = comp.start;
        comp.start = function () {
            var result = originalGenresStart && originalGenresStart.apply(this, arguments);
            focusScope.bind(comp.render());
            setTimeout(function () { focusScope.restore(comp.last, true); }, 0);
            return result;
        };
        comp.destroy = function () {
            destroyed = true;
            if (cacheUpdateHandler) document.removeEventListener('yani:cache-updated', cacheUpdateHandler);
            cacheUpdateHandler = null;
            focusScope.destroy();
            if (originalGenresDestroy) originalGenresDestroy.apply(this, arguments);
        };

        return comp;
    }

    function CollectionDetail(object) {
        return LampaYaniCollections.detail(object, {
            t: t,
            detail: LampaYaniApi.collectionDetail,
            toCard: toCard,
            cardRender: bindRecommendedCardRender,
            error: function (message) { Lampa.Noty.show(message); }
        });
    }

    function Updates(object) {
        return LampaYaniUpdates.component(object, {
            t: t,
            authorized: function () { return Boolean(LampaYaniAuth.token()); },
            resolveUserId: resolveUserListsUserId,
            loadLists: loadUserListsSnapshot,
            subscriptions: LampaYaniApi.subscriptions,
            schedule: LampaYaniApi.schedule,
            feed: LampaYaniApi.feed,
            normalize: LampaYaniApi.normalize,
            toCard: toCard,
            cardRender: bindYummyCardRender,
            notice: function (message) { Lampa.Noty.show(message); }
        });
    }

    function History(object) {
        return LampaYaniHomeSections.history(object, {
            t: t,
            history: playbackHistory,
            toCard: toCard,
            detail: LampaYaniApi.detail,
            authorized: function () { return Boolean(LampaYaniAuth.token()); },
            fetchRemote: LampaYaniApi.watchHistory,
            importRemote: importRemoteEntries,
            historyCardRender: bindHistoryCardRender,
            // Redraws one already-rendered card after its details arrive, so
            // Continue Watching can show the list first and fill the badges in
            // afterwards instead of waiting for a request per title.
            redrawCard: function (card) {
                if (!card || !card.yani_id) return;
                var selector = '[data-yani-card-id="' + String(card.yani_id).replace(/"/g, '') + '"]';
                $(selector).each(function () {
                    try { cardRenderers.decorate(this, card); } catch (error) {}
                });
            }
        });
    }

    function listActionTitle(card, key) {
        var ids = {watching: 0, planned: 1, completed: 2, dropped: 3, postponed: 5};
        var title = t(key);
        return hasYummyList(card, ids[key]) ? '✓ ' + title : title;
    }

    function hasYummyList(card, listId) {
        return Boolean(card) && card.yani_list_id !== null && card.yani_list_id !== undefined && card.yani_list_id !== '' && Number(card.yani_list_id) === listId;
    }

    function Account(object) {
        var scroll = new Lampa.Scroll({mask: false, over: true, step: 250, notransition: true});
        scroll.minus();
        var html = $('<div class="yani-account yani-lite-view"></div>');
        var content = $('<div class="yani-account__content"></div>');
        var last;
        var destroyed = false;
        var finished = false;
        var paused = false;
        var ownerAccount = LampaYaniAuth.get();
        var ownerUserId = Number(ownerAccount.user_id || 0);
        var ownerLogin = String(ownerAccount.login || '');
        var ownerToken = LampaYaniAuth.token();
        var requestController = window.AbortController ? new window.AbortController() : null;

        function current() {
            if (destroyed || !LampaYaniAuth.token() && ownerToken) return false;
            var account = LampaYaniAuth.get(), id = Number(account.user_id || 0);
            if (ownerUserId && id) return ownerUserId === id;
            if (ownerLogin && account.login) return ownerLogin === String(account.login);
            return LampaYaniAuth.token() === ownerToken;
        }
        function control() { return requestController ? {signal: requestController.signal} : {}; }

        this.create = function () {
            var self = this;
            this.activity.loader(true);

            if (!LampaYaniAuth.token()) {
                addAccountNotice(t('not_logged_in'), localizedAuthText('login_hint'), {title: t('login_name'), handler: openAccountLogin});
                finish(self);
                return;
            }

            LampaYaniApi.profile(control()).then(function (payload) {
                if (!current()) return null;
                var profile = payload && payload.response ? payload.response : payload;
                profile = Object.assign({}, profile, {id: Number(profile && (profile.id || profile.user_id || profile.user && profile.user.id) || 0)});
                if (!profile.id) throw new Error('YummyAnime profile id is missing');
                ownerUserId = profile.id;
                return Promise.all([
                    Promise.resolve(profile),
                    LampaYaniApi.userListStats(profile.id, control()).then(responseData).catch(function () { return null; }),
                    LampaYaniApi.userStatsGenres(profile.id).then(responseData).catch(function () { return []; }),
                    LampaYaniApi.userStatsRatings(profile.id).then(responseData).catch(function () { return []; }),
                    LampaYaniApi.userStatsTypes(profile.id).then(responseData).catch(function () { return []; }),
                    LampaYaniApi.userListCounts(profile.id, control()).catch(function () { return null; })
                ]);
            }).then(function (result) {
                if (!current() || !result) return;
                renderAccount(result[0], result[1], result[2], result[3], result[4], result[5]);
                finish(self);
            }).catch(function (error) {
                if (!current()) return;
                console.error('[YummyAnime]', error);
                addAccountNotice(t('account_load_error'), t('account_retry'));
                finish(self);
            });
        };

        function finish(component) {
            if (!current() || finished) return;
            finished = true;
            scroll.append(content);
            html.append(scroll.render(true));
            component.activity.loader(false);
            if (!paused) component.activity.toggle();
        }

        function responseData(payload) {
            return payload && payload.response ? payload.response : payload || [];
        }

        function addAccountNotice(title, description, action) {
            var notice = $('<div class="yani-account__notice"></div>');
            notice.append($('<div class="yani-account__notice-title"></div>').text(title));
            notice.append($('<div class="yani-account__notice-text"></div>').text(description));
            if (action && action.handler) {
                var button = $('<div class="yani-account__notification-button yani-account__login-button selector"></div>');
                button.append($('<strong></strong>').text(action.title || t('login_name')));
                button.append($('<span aria-hidden="true">→</span>'));
                bindAccountFocus(button);
                button.on('hover:enter click.yaniAccountLogin', action.handler);
                notice.append(button);
            } else {
                notice.addClass('selector');
                bindAccountFocus(notice);
            }
            content.append(notice);
        }

        function renderAccount(profile, stats, genreStats, ratingStats, typeStats, countsPayload) {
            var hasStats = Array.isArray(stats);
            var namedCounts = LampaYaniHomeInsights.listCounts(countsPayload);
            var hasCounts = Boolean(namedCounts);
            var counts = {};
            accountListDefinitions().forEach(function (definition) { counts[definition.id] = hasCounts ? namedCounts[definition.key] : null; });
            var total = hasCounts ? namedCounts.watching + namedCounts.planned + namedCounts.completed + namedCounts.dropped + namedCounts.postponed : null;
            if (hasCounts) cacheHomeListCounts(profile.id, counts);
            stats = Array.isArray(stats) ? stats : [];
            var header = $('<div class="yani-account__profile selector"></div>');
            var avatar = profile.avatars && (profile.avatars.big || profile.avatars.full || profile.avatars.small);
            if (avatar && avatar.indexOf('//') === 0) avatar = 'https:' + avatar;
            if (avatar) header.append($('<img class="yani-account__avatar" alt="">').attr('src', avatar));

            var identity = $('<div class="yani-account__identity"></div>');
            identity.append($('<div class="yani-account__name"></div>').text(profile.nickname || 'YummyAnime User'));
            identity.append($('<div class="yani-account__status"></div>').text(t('authorized')));
            identity.append($('<div class="yani-account__id"></div>').text('ID ' + profile.id));
            if (profile.about) identity.append($('<div class="yani-account__about"></div>').text(profile.about));
            if (profile.banned) identity.append($('<div class="yani-account__warning"></div>').text(t('banned')));
            header.append(identity);
            bindAccountFocus(header);
            content.append(header);

            var info = $('<div class="yani-account__grid"></div>');
            addInfo(info, t('registration'), formatAccountDate(profile.register_date));
            addInfo(info, t('last_visit'), formatAccountDate(profile.last_online));
            addInfo(info, t('roles'), profile.roles && profile.roles.length ? profile.roles.join(', ') : t('user'));
            addInfo(info, t('messages'), String(profile.messages && profile.messages.unread_count || 0) + ' ' + t('unread'));
            addInfo(info, t('notifications'), String(profile.notifications && profile.notifications.count || 0));
            addInfo(info, t('total_lists'), hasCounts ? String(total) : '—');
            content.append(info);

            var notificationButton = $('<div class="yani-account__notification-button selector"></div>');
            notificationButton.append($('<strong></strong>').text(t('notifications')));
            notificationButton.append($('<span></span>').text(String(profile.notifications && (profile.notifications.unread_count || profile.notifications.count) || 0) + ' ' + t('unread')));
            bindAccountFocus(notificationButton);
            notificationButton.on('hover:enter click.yaniNotifications', openNotifications);
            content.append(notificationButton);
            var subscriptionsButton = $('<div class="yani-account__notification-button selector"></div>');
            subscriptionsButton.append($('<strong></strong>').text(t('subscriptions')));
            subscriptionsButton.append($('<span></span>').text(t('subscriptions')));
            bindAccountFocus(subscriptionsButton);
            subscriptionsButton.on('hover:enter click.yaniSubscriptions', function () { openSubscriptions(profile.id); });
            content.append(subscriptionsButton);
            // Manual synchronization remains available from the account page
            // when automatic progress synchronization is deliberately off.
            if (!autoProgressSyncEnabled()) {
                var syncButton = $('<div class="yani-account__notification-button selector"></div>');
                syncButton.append($('<strong></strong>').text(t('sync_history')));
                syncButton.append($('<span></span>').text(t('sync_history_description')));
                bindAccountFocus(syncButton);
                syncButton.on('hover:enter click.yaniSync', syncPlaybackHistoryManually);
                content.append(syncButton);
            }
            var reviewsButton = $('<div class="yani-account__notification-button selector"></div>');
            reviewsButton.append($('<strong></strong>').text(t('my_reviews')));
            reviewsButton.append($('<span></span>').text(t('my_reviews_description')));
            bindAccountFocus(reviewsButton);
            reviewsButton.on('hover:enter click.yaniReviews', function () { openUserReviews(profile.id); });
            content.append(reviewsButton);

            content.append($('<div class="yani-account__section-title"></div>').text(t('list_stats')));
            var listGrid = $('<div class="yani-account__lists"></div>');
            accountListDefinitions().forEach(function (definition) {
                var stat = stats.filter(function (item) { return Number(item.list && item.list.id) === definition.id; })[0] || {};
                var tile = $('<div class="yani-account__list selector"></div>');
                tile.append($('<div class="yani-account__list-title"></div>').text(definition.title));
                tile.append($('<div class="yani-account__list-count"></div>').text((hasCounts ? String(counts[definition.id]) : '—') + ' ' + t('anime_count')));
                tile.append($('<div class="yani-account__list-time"></div>').text(t('total_time') + ': ' + (hasStats && stat.seconds !== undefined ? formatWatchTime(stat.seconds) : '—')));
                bindAccountFocus(tile);
                tile.on('hover:enter', function () { openUserListShortcut(definition); });
                listGrid.append(tile);
            });
            content.append(listGrid);
            renderAccountStatistics(genreStats, ratingStats, typeStats);

            var logoutButton = $('<div class="yani-account__notification-button yani-account__logout-button selector"></div>');
            logoutButton.append($('<strong></strong>').text(t('logout_name')));
            logoutButton.append($('<span></span>').text(t('logout_description')));
            bindAccountFocus(logoutButton);
            logoutButton.on('hover:enter click.yaniAccountLogout', logoutFromAccount);
            content.append(logoutButton);
        }

        function renderAccountStatistics(genreStats, ratingStats, typeStats) {
            var sections = [
                {title: t('genres_statistics'), items: genreStats, label: function (item) { return item.title || item.name; }},
                {title: t('ratings_statistics'), items: ratingStats, label: function (item) { return String(item.rating || '—'); }},
                {title: t('types_statistics'), items: typeStats, label: function (item) { return item.type && (item.type.name || item.type.shortname) || item.name; }}
            ];
            var available = sections.filter(function (section) { return Array.isArray(section.items) && section.items.length; });
            if (!available.length) return;
            content.append($('<div class="yani-account__section-title"></div>').text(t('account_statistics')));
            available.forEach(function (section) {
                var block = $('<div class="yani-account__stats"></div>');
                block.append($('<div class="yani-account__stats-title"></div>').text(section.title));
                section.items.slice(0, 12).forEach(function (item) {
                    var row = $('<div class="yani-account__stats-row selector"></div>');
                    row.append($('<span></span>').text(section.label(item) || '—'));
                    row.append($('<strong></strong>').text(String(item.count || 0)));
                    bindAccountFocus(row);
                    block.append(row);
                });
                content.append(block);
            });
        }

        function addInfo(grid, title, value) {
            var tile = $('<div class="yani-account__info selector"></div>');
            tile.append($('<div class="yani-account__info-title"></div>').text(title));
            tile.append($('<div class="yani-account__info-value"></div>').text(value || '—'));
            bindAccountFocus(tile);
            grid.append(tile);
        }

        function bindAccountFocus(element) {
            element.on('hover:focus', function (event) {
                var target = event.currentTarget || event.target;
                last = target;
                scroll.update($(target), true);
            });
        }

        this.start = function () {
            if (!current()) return;
            paused = false;
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                left: function () { if (Navigator.canmove('left')) Navigator.move('left'); else Lampa.Controller.toggle('menu'); },
                right: function () { Navigator.move('right'); },
                up: function () { if (Navigator.canmove('up')) Navigator.move('up'); else Lampa.Controller.toggle('head'); },
                down: function () { LampaYaniNavigation.moveDown(scroll); },
                back: goBack
            });
            Lampa.Controller.toggle('content');
        };

        this.pause = this.stop = function () { paused = true; };
        this.render = function (js) { return js ? html[0] : html; };
        this.destroy = function () { destroyed = true; last = null; if (requestController) requestController.abort(); scroll.destroy(); html.remove(); };
    }

    function AuthPage(object) {
        return LampaYaniAuthPage.create(object, {
            t: t,
            input: showYummyInput,
            goBack: goBack,
            hint: function () { return localizedAuthText('auth_hint'); },
            onAuthChanged: syncSettingsAuthStatus,
            onAuthorized: function () {
                ensureRemoteHistory(true).catch(function () {});
                if (object && object.refresh_account_on_authorized) {
                    setTimeout(function () {
                        Lampa.Activity.replace({url: 'yani/account', title: 'YummyAnime ' + t('account'), component: 'yani_account'});
                    }, 0);
                }
            }
        });
    }

    function openNotifications() {
        Lampa.Activity.push({url: 'yani/notifications', title: t('notifications_title'), component: 'yani_notifications'});
    }

    function openUserLists() {
        if (!LampaYaniAuth.token()) return Lampa.Noty.show(localizedAuthText('login_required'));
        Lampa.Activity.push({
            url: 'yani/user-lists',
            title: 'YummyAnime · ' + t('user_lists'),
            component: 'yani_user_lists'
        });
    }

    function openWatchHistory() {
        Lampa.Activity.push({
            url: 'yani/history',
            title: 'YummyAnime · ' + t('watch_history'),
            component: 'yani_history',
            mode: 'history'
        });
    }

    function openContinueWatching() {
        Lampa.Activity.push({
            url: 'yani/continue-watching',
            title: 'YummyAnime · ' + t('continue_watching'),
            component: 'yani_history',
            mode: 'continue'
        });
    }

    function openSubscriptions(userId) {
        Lampa.Activity.push({url: 'yani/subscriptions', title: t('subscriptions'), component: 'yani_subscriptions', userId: userId});
    }

    function openUserReviews(userId) {
        LampaYaniApi.userReviews(userId, 30, 0).then(function (payload) {
            var response = payload && payload.response ? payload.response : payload;
            var items = Array.isArray(response) ? response : response && (response.items || response.data || response.reviews) || [];
            if (!items.length) return Lampa.Noty.show(t('reviews_empty'));
            showYummySelect({title: t('my_reviews'), items: items.map(function (review) {
                var anime = review.anime || review.title_data || review.object || {};
                var title = anime.title || anime.name || review.anime_title || review.title || t('anime');
                var text = cleanCommentText(review.text || review.body || review.description || '');
                var score = review.rate || review.rating || review.score;
                return {
                    title: title + (score ? ' · ' + score + '/10' : ''),
                    subtitle: text.slice(0, 180),
                    review: review,
                    anime: anime
                };
            }), onSelect: function (item) {
                var anime = item.anime || {};
                var id = anime.anime_id || anime.id || item.review.anime_id;
                if (id) openYummyDetail(toCard(anime.anime_id || anime.id ? anime : {anime_id: id, title: item.title}), true);
            }});
        }).catch(function (error) {
            console.error('[YummyAnime Reviews]', error);
            Lampa.Noty.show(t('reviews_error'));
        });
    }

    function Subscriptions(object) {
        return LampaYaniAccountLists.subscriptions(object, {toCard: toCard, cardRender: bindYummyCardRender, t: t});
    }

    function Notifications(object) {
        return LampaYaniNotifications.create(object, {
            t: t,
            normalize: normalizeNotifications,
            formatDate: formatNotificationDate,
            toCard: toCard,
            openDetail: openYummyDetail,
            resolveAnime: LampaYaniApi.detail,
            fetch: LampaYaniApi.notifications,
            ownerKey: function () { var account = LampaYaniAuth.get(); return String(account.login ? 'login:' + account.login : account.user_id ? 'id:' + account.user_id : LampaYaniAuth.token() || ''); },
            markRead: LampaYaniApi.markNotificationRead,
            markAllRead: LampaYaniApi.markAllNotificationsRead,
            deleteAll: LampaYaniApi.deleteAllNotifications,
            onUnreadCount: function (count) {
                var account = LampaYaniAuth.get();
                cacheHomeNotificationCount(account && (account.user_id || account.login) || '', count);
            },
            goBack: goBack
        });
    }

    function accountListDefinitions() {
        return [
            {id: 0, key: 'watching', title: t('watching'), icon: 'eye'},
            {id: 1, key: 'planned', title: t('planned'), icon: 'cloud'},
            {id: 2, key: 'completed', title: t('completed'), icon: 'flag'},
            {id: 3, key: 'dropped', title: t('dropped'), icon: 'eye-off'},
            {id: 4, key: 'favorites', title: t('favorites'), icon: 'heart'},
            {id: 5, key: 'postponed', title: t('postponed'), icon: 'hourglass'}
        ];
    }

    var userListsSnapshot = null;
    var homeListCountsCacheKey = 'yani_home_list_counts';
    var homeNotificationCacheKey = 'yani_home_notification_count';

    function publishListState(card, patch, owner) {
        invalidateUserListsSnapshot();
        if (patch && window.LampaYaniCardModel && LampaYaniCardModel.commitListState) LampaYaniCardModel.commitListState(card, patch, owner);
    }
    if (typeof document !== 'undefined' && window.$) $(document).on('yani:watch-progress.yaniPlaybackEpisodes', function (event, card) {
        if (activePlaybackSetup && activePlaybackSetup.progressChanged) activePlaybackSetup.progressChanged(card);
    });
    if (typeof document !== 'undefined' && window.$) $(document).on('yani:list-state-changed.yaniCards', function (event, change) {
        if (!change || !change.anime_id) return;
        $('[data-yani-card-id]').each(function () {
            if (String(this.getAttribute('data-yani-card-id')) !== String(change.anime_id)) return;
            var card = this.yaniBoundCard || this.card_data;
            if (!card) return;
            LampaYaniCardModel.applyListState(card);
            addCardListBadge($(this), card);
            syncCardOverlayLayout($(this), card);
        });
    });

    function invalidateUserListsSnapshot() {
        userListsSnapshot = null;
        if (Lampa.Storage) ['yani_lite_counts_v1', homeListCountsCacheKey].forEach(function (key) {
            if (Lampa.Storage.remove) Lampa.Storage.remove(key);
            else if (Lampa.Storage.set) Lampa.Storage.set(key, '{}');
        });
    }
    if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('yani:auth-changed', invalidateUserListsSnapshot);
    if (typeof document !== 'undefined' && window.$) $(document).on('yani:auth-changed.yaniCards', function () {
        $('[data-yani-card-id]').each(function () {
            var card = this.yaniBoundCard || this.card_data;
            if (!card) return;
            card.yani_list_id = null; card.yani_list_known = false;
            card.yani_is_favorite = false; card.yani_favorite_known = false;
            LampaYaniCardModel.applyListState(card);
            addCardListBadge($(this), card);
            syncCardOverlayLayout($(this), card);
        });
    });

    function cacheHomeNotificationCount(userKey, count) {
        if (!userKey || !Lampa.Storage || !Lampa.Storage.set) return;
        Lampa.Storage.set(homeNotificationCacheKey, JSON.stringify({
            user_key: String(userKey),
            updated_at: Date.now(),
            count: Math.max(0, Number(count) || 0)
        }));
    }

    function cacheHomeListCounts(userId, counts) {
        if (!userId || !Lampa.Storage || !Lampa.Storage.set) return;
        Lampa.Storage.set(homeListCountsCacheKey, JSON.stringify({
            user_id: Number(userId),
            updated_at: Date.now(),
            counts: counts || {}
        }));
    }

    function resolveUserListsUserId() {
        var account = LampaYaniAuth.get();
        var ownerToken = LampaYaniAuth.token();
        var ownerLogin = String(account && account.login || '');
        var storedId = Number(account && account.user_id || 0);
        if (storedId) return Promise.resolve(storedId);
        return LampaYaniApi.profile().then(function (payload) {
            var currentAccount = LampaYaniAuth.get();
            if (!LampaYaniAuth.token() || (ownerLogin ? ownerLogin !== String(currentAccount.login || '') : ownerToken !== LampaYaniAuth.token())) throw new Error('YummyAnime account changed');
            var profile = payload && payload.response ? payload.response : payload;
            var userId = Number(profile && (profile.id || profile.user_id || profile.user && profile.user.id) || 0);
            if (!userId) throw new Error('YummyAnime profile id is missing');
            LampaYaniAuth.save({
                token: LampaYaniAuth.token(),
                login: account && account.login,
                display_name: account && account.display_name,
                user_id: userId
            });
            return userId;
        });
    }

    function loadUserListsSnapshot(userId) {
        var now = Date.now();
        if (userListsSnapshot && userListsSnapshot.userId === userId && now - userListsSnapshot.createdAt < 300000) {
            return userListsSnapshot.promise;
        }
        var promise = LampaYaniApi.userLists(userId).then(normalizeUserList);
        userListsSnapshot = {userId: userId, createdAt: now, promise: promise};
        promise.catch(function () {
            if (userListsSnapshot && userListsSnapshot.promise === promise) userListsSnapshot = null;
        });
        return promise;
    }

    function userListItemTime(item) {
        item = item || {};
        var current = item.user && item.user.list || item.user_list || item.list_state || {};
        var nested = current.list && typeof current.list === 'object' ? current.list : {};
        var value = item.updated_at || item.date || item.created_at || current.updated_at || current.date ||
            current.created_at || nested.updated_at || nested.date || nested.created_at || 0;
        var numeric = Number(value);
        if (numeric > 0) return numeric < 100000000000 ? numeric * 1000 : numeric;
        var parsed = Date.parse(value);
        return isNaN(parsed) ? 0 : parsed;
    }

    function localHistoryCards(remotePayload) {
        var remote = LampaYaniHomeSections.normalizeRemoteHistory(remotePayload || []);
        return LampaYaniHomeSections.mergeHistory(playbackHistory(), remote).map(function (entry) {
            var card = toCard(Object.assign({}, entry.card || {}, {
                anime_id: entry.anime_id,
                title: entry.title || entry.card && entry.card.title,
                poster: entry.poster || entry.card && entry.card.poster,
                updated_at: entry.updated_at || 0
            }));
            card.yani_list_progress = entry.duration > 0 ? Math.max(0, Math.min(1, Number(entry.time || 0) / Number(entry.duration))) : 0;
            return card;
        });
    }

    function hydrateHistoryPosters(cards, listItems) {
        var known = {};
        (listItems || []).forEach(function (item) {
            var card = toCard(item);
            if (card.yani_id && card.poster) known[String(card.yani_id)] = card.poster;
        });
        cards.forEach(function (card) {
            var poster = known[String(card.yani_id || '')];
            if (!card.poster && poster) card.poster = card.img = poster;
        });

        var missing = cards.filter(function (card) { return card.yani_id && !card.poster; }).slice(0, 10);
        function next(offset) {
            if (offset >= missing.length) return Promise.resolve(cards);
            return Promise.all(missing.slice(offset, offset + 2).map(function (card) {
                return LampaYaniApi.detail(card.yani_id).then(function (payload) {
                    var value = payload && payload.response ? payload.response : payload;
                    var detailed = toCard(value || {});
                    if (detailed.poster) card.poster = card.img = detailed.poster;
                }).catch(function () {});
            })).then(function () { return next(offset + 2); });
        }
        return next(0);
    }

    function loadUserListRows() {
        return resolveUserListsUserId().then(function (userId) {
            return Promise.all([
                loadUserListsSnapshot(userId),
                LampaYaniApi.watchHistory(30, 0).catch(function () { return []; })
            ]);
        }).then(function (result) {
            var items = result[0];
            var rows = accountListDefinitions().map(function (definition) {
                var selected = filterAccountListItems(definition, items).slice().sort(function (a, b) {
                    return userListItemTime(b) - userListItemTime(a);
                });
                return {
                    title: definition.title,
                    definition: definition,
                    total: selected.length,
                    results: selected.slice(0, 10).map(function (item) {
                        var card = toCard(item);
                        card.yani_list_progress = LampaYaniAccountListControls.progress(item);
                        return card;
                    })
                };
            });
            var history = localHistoryCards(result[1]);
            return hydrateHistoryPosters(history.slice(0, 10), items).then(function (preview) {
                rows.push({title: t('watch_history'), history: true, total: history.length, results: preview});
                return rows;
            });
        });
    }

    function filterAccountListItems(definition, items) {
        return LampaYaniAccountLists.filterItems(definition, items);
    }

    function pushAccountList(definition, items, lazy) {
        Lampa.Activity.push({
            url: 'yani/account/list/' + definition.key,
            title: 'YummyAnime · ' + definition.title,
            component: 'yani_account_list',
            definition: definition,
            page: 1,
            lazy: Boolean(lazy),
            items: items || []
        });
    }

    function openAccountList(definition, items, userId) {
        var selected = filterAccountListItems(definition, items);
        var load = definition.id === 4 || !userId ? Promise.resolve(selected) : LampaYaniApi.userList(userId, definition.id).then(function (payload) {
            var result = normalizeUserList(payload);
            return result.length ? result : selected;
        }).catch(function () { return selected; });
        load.then(function (result) {
            pushAccountList(definition, result);
        });
    }

    function openUserListShortcut(definition) {
        if (!LampaYaniAuth.token()) return Lampa.Noty.show(localizedAuthText('login_required'));
        pushAccountList(definition, [], true);
        return Promise.resolve();
    }

    function loadUserListShortcutItems(definition) {
        function cacheKey(userId) { return 'yani_user_list_' + userId + '_' + definition.id; }
        function readCache(userId) {
            try {
                var cached = Lampa.Storage.get(cacheKey(userId), '{}');
                if (typeof cached === 'string') cached = JSON.parse(cached || '{}');
                return cached && Array.isArray(cached.items) ? cached.items : null;
            } catch (error) { return null; }
        }
        function writeCache(userId, items) {
            try { Lampa.Storage.set(cacheKey(userId), JSON.stringify({updated_at: Date.now(), items: items || []})); }
            catch (error) { console.warn('[YummyAnime User Lists] Could not cache list', error); }
            return items || [];
        }

        return resolveUserListsUserId().then(function (userId) {
            // A category is opened on demand. Fetch its current membership,
            // rather than a five-minute preview snapshot captured before edits.
            var request = definition.id === -1 ? LampaYaniApi.userLists(userId) : definition.id === 4 ? LampaYaniApi.userLists(userId) : LampaYaniApi.userList(userId, definition.id);
            return request.then(normalizeUserList).then(function (items) {
                return writeCache(userId, definition.id === -1 ? items : filterAccountListItems(definition, items));
            }).catch(function (error) {
                var cached = readCache(userId);
                if (cached) return cached;
                throw error;
            });
        });
    }

    function normalizeUserList(payload) {
        return LampaYaniAccountLists.normalize(payload);
    }

    function library(object) {
        return LampaYaniLibrary.create(object, {
            t: t, definitions: accountListDefinitions, loadItems: loadUserListShortcutItems,
            loadCounts: function () {
                return resolveUserListsUserId().then(function (id) { return LampaYaniApi.userListCounts(id); }).then(LampaYaniHomeInsights.listCounts);
            },
            toCard: toCard,
            cardRender: function (first, second, third) { bindYummyCardRender(first, second, third, {ratingPlacement: 'below'}); },
            syncCardLayout: function (scope) { scope.find('.card').each(function () { syncCardOverlayLayout($(this), this.yaniBoundCard); }); },
            goBack: goBack,
            onError: function () { Lampa.Noty.show(t('user_lists_error')); }
        });
    }

    function AccountList(object) {
        if (window.LampaYaniLibrary) return library(object);
        return LampaYaniAccountLists.accountList(object, {
            t: t,
            showSelect: showYummySelect,
            toCard: toCard,
            cardRender: bindYummyCardRender,
            loadItems: loadUserListShortcutItems,
            onError: function () { Lampa.Noty.show(t('user_lists_error')); }
        });
    }

    function UserLists(object) {
        if (window.LampaYaniLibrary) return library(object);
        return LampaYaniAccountLists.userLists(object, {
            t: t,
            openList: openUserListShortcut,
            openHistory: openWatchHistory,
            // These previews belong to the YummyAnime account, so avoid a
            // second native-card lookup before opening their details.
            openCard: function (card) { openYummyDetail(card, false); },
            loadRows: loadUserListRows,
            goBack: goBack,
            onError: function () { Lampa.Noty.show(t('user_lists_error')); }
        });
    }

    function formatAccountDate(timestamp) {
        if (!timestamp) return '—';
        try {
            return new Date(Number(timestamp) * 1000).toLocaleDateString(locale(), {day: 'numeric', month: 'long', year: 'numeric'});
        } catch (error) {
            return new Date(Number(timestamp) * 1000).toLocaleDateString();
        }
    }

    function normalizeNotifications(payload) {
        return LampaYaniNotifications.normalize(payload);
    }

    function formatNotificationDate(value) {
        if (!value) return '';
        if (typeof value === 'number' || /^\d+$/.test(String(value))) return formatAccountDate(value);
        var parsed = new Date(value);
        return isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString(locale(), {day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'});
    }

    function formatWatchTime(seconds) {
        var hours = Math.floor(Number(seconds || 0) / 3600);
        var days = Math.floor(hours / 24);
        var restHours = hours % 24;
        return days ? days + ' ' + t('days_short') + ' ' + restHours + ' ' + t('hours_short') : hours + ' ' + t('hours_short');
    }

    function StatusDashboard(object) {
        return LampaYaniStatus.create(object, {
            t: t,
            locale: locale,
            goBack: goBack
        });
    }

    function Schedule(object) {
        return LampaYaniSchedule.create(object, {
            t: t,
            locale: locale,
            toCard: toCard,
            playbackSourceId: playbackSourceId,
            isPlaybackSourceEnabled: isPlaybackSourceEnabled,
            openYummyDetail: openYummyDetail,
            goBack: goBack
        });
    }

    function Detail(object) {
        return LampaYaniDetail.create(object, {
            t: t,
            locale: locale,
            getYummyId: getYummyId,
            toCard: toCard,
            getPlayback: getPlayback,
            mediaTypeLabels: mediaTypeLabels,
            cardMediaMotionAllowed: cardMediaMotionAllowed,
            createDetailRatings: createDetailRatings,
            detailGenres: detailGenres,
            genreTitle: genreTitle,
            genreValue: genreValue,
            openGenreCatalog: openGenreCatalog,
            openSubjectCatalog: openSubjectCatalog,
            beginPlaybackNavigation: beginPlaybackNavigation,
            openTitlePlaybackOptions: openTitlePlaybackOptions,
            configurePlayback: function (card) { return openTitlePlaybackOptions(card); },
            resumePlayback: function (card) { return openVideos(card, true); },
            openTrailers: openTrailers,
            lampaIcon: lampaIcon,
            openStandardLampaCard: openStandardLampaCard,
            addCardListBadge: addCardListBadge,
            onListChanged: publishListState,
            syncCardOverlayLayout: syncCardOverlayLayout,
            hasYummyList: hasYummyList,
            showYummySelect: showYummySelect,
            openYummyDetail: openYummyDetail,
            commentItem: commentItem,
            commentReplies: commentReplies,
            commentsMenu: commentsMenu,
            transientNavigationSnapshot: transientNavigationSnapshot,
            movePageDown: movePageDown,
            goBack: goBack,
            cleanCommentText: cleanCommentText,
            loadVideos: function (id, options) { return videoData.list(id, options); },
            importVideosProgress: importVideosProgress
        });
    }

    function allohaDirectResolverEnabled() {
        return Boolean(
            window.LampaYaniResolver && LampaYaniResolver.enabled && LampaYaniResolver.enabled() ||
            window.LampaYaniLampacResolver && LampaYaniLampacResolver.enabled && LampaYaniLampacResolver.enabled()
        );
    }

    function videoPlaybackPriority(video, group) {
        var url = videoSourceUrl(video);
        if (!url) return 0;
        if (isExternalPlayableUrl(url, video)) return 4;
        var player = String(group && (group.player || group.title) || '');
        var alloha = isAllohaUrl(url) || /alloha/i.test(player);
        if (alloha) return allohaDirectResolverEnabled() ? 3 : 0;
        if (window.LampaYaniStreamResolver && LampaYaniStreamResolver.canResolve && LampaYaniStreamResolver.canResolve(url)) return 3;
        return 1;
    }

    function groupPlaybackPriority(group) {
        var videos = group && group.videos || [];
        return videos.length ? videoPlaybackPriority(videos[0], group) : 0;
    }

    function voiceOptionSubtitle(group) {
        return t('video_quality') + ': ' + (group.quality || t('quality_auto')) +
            (group.source ? ' · ' + group.source : '') +
            (group.latestEpisode ? ' · ' + t('latest_episode') + ': ' + group.latestEpisode : '') +
            ' · ' + Number(group.episodeCount || group.videos.length) + ' ' + t('episodes_short');
    }

    function enrichVoiceOptionQuality(item, target) {
        var group = item && item.group;
        if (!group || group.quality || group.qualityLoading || group.qualityLoaded || !group.videos.length) return;
        var probe = group.videos[0];
        var url = videoSourceUrl(probe);
        if (!url || !window.LampaYaniStreamResolver || !LampaYaniStreamResolver.canResolve(url)) return;
        group.qualityLoading = true;
        LampaYaniStreamResolver.resolve(url, probe).then(function (result) {
            group.qualityLoading = false;
            group.qualityLoaded = true;
            if (!result || !result.url) return;
            probe.yani_stream_url = result.url;
            probe.yani_stream_quality = result.quality || '';
            probe.yani_stream_qualities = result.qualities || null;
            probe.yani_stream_source = result.source || '';
            probe.yani_stream_headers = result.headers || null;
            probe.yani_stream_headers_required = Boolean(result.headersRequired);
            group.quality = result.quality || group.quality;
            item.subtitle = voiceOptionSubtitle(group);
            $(target).find('.selectbox-item__subtitle').text(item.subtitle);
        }).catch(function (error) {
            group.qualityLoading = false;
            group.qualityLoaded = true;
            console.warn('[YummyAnime] Could not inspect voice quality', error);
        });
    }

    function registerOnlineSource() {
        if (!Lampa.Online || !Lampa.Online.register || window.yummyanime_online_source_ready) return;
        window.yummyanime_online_source_ready = true;
        Lampa.Online.register('yummyanime', {
            title: 'YummyAnime',
            search: function (movie, oncomplite) {
                openYummyForMovie(movie);
                if (oncomplite) oncomplite([]);
            },
            onContextMenu: function () { return {name: 'YummyAnime'}; }
        });
    }

    var searchController;

    function getSearchController() {
        if (!searchController) {
            searchController = LampaYaniSearch.create({
                lampa: Lampa,
                api: LampaYaniApi,
                utils: LampaYaniUiUtils,
                toCard: toCard,
                sourceTitle: 'YummyAnime',
                searchTitle: t('search_title'),
                showInput: showYummyInput,
                openDetail: function (card) { openYummyDetail(card, false); },
                openResults: function (query) {
                    Lampa.Activity.push({
                        url: 'yani/search/' + encodeURIComponent(query),
                        title: query,
                        component: 'yani_catalog',
                        params: {q: query, limit: 30}
                    });
                },
                onError: function (error) {
                    console.warn('[YummyAnime] Global search failed', error);
                }
            });
        }
        return searchController;
    }

    function registerSearchSource() {
        getSearchController().register();
    }

    function openYummyForMovie(movie) {
        beginPlaybackNavigation();
        if (movie && movie.yani_card) return openVideos(movie.yani_card);
        if (Lampa.Loading && Lampa.Loading.start) Lampa.Loading.start();
        findYummyMatches(movie).then(function (matches) {
            if (Lampa.Loading && Lampa.Loading.stop) Lampa.Loading.stop();
            if (!matches.length) {
                Lampa.Noty.show(t('no_yummy_match'));
                restorePlaybackInteraction();
                return;
            }
            if (matches.length === 1) return openVideos(matches[0]);

            showPlaybackSelect({
                title: t('choose_anime'),
                items: matches.map(function (card) {
                    return {title: card.title + (card.release_date ? ' · ' + card.release_date : ''), card: card};
                }),
                onSelect: function (item) { openVideos(item.card); }
            });
        }).catch(function (error) {
            if (Lampa.Loading && Lampa.Loading.stop) Lampa.Loading.stop();
            console.error('[YummyAnime Search Source]', error);
            Lampa.Noty.show(t('catalog_load_error'));
            restorePlaybackInteraction();
        });
    }

    function openYummyDetail(card, notifyFallback) {
        var id = getYummyId(card);
        if (!id) {
            Lampa.Noty.show(t('no_yummy_match'));
            return;
        }
        card.yani_id = id;
        if (notifyFallback && Lampa.Noty) Lampa.Noty.show(t('lampa_card_fallback'));
        var current = Lampa.Activity && Lampa.Activity.active && Lampa.Activity.active();
        if (current && current.component === 'yani_detail' && String(current.yani_id || current.id) === String(id)) return;
        Lampa.Activity.push({
            url: 'yani/detail/' + encodeURIComponent(id),
            title: card.title,
            component: 'yani_detail',
            id: id,
            yani_id: id,
            card: card
        });
    }



    function movePageDown(scroll) { LampaYaniNavigation.moveDown(scroll); }

    function homeSectionEnabled(key) {
        if (!Lampa.Storage || !Lampa.Storage.get) return true;
        var value = Lampa.Storage.get('yani_section_' + key, true);
        return value !== false && value !== 'false';
    }

    var episodeTitlesCache = {};

    function episodeTitlesForCard(card) {
        var malId = card && card.yani_remote_ids && (card.yani_remote_ids.myanimelist_id || card.yani_remote_ids.mal_id);
        if (!malId) return Promise.resolve(null);
        var key = String(malId);
        var entry = episodeTitlesCache[key];
        if (entry) return entry.promise;
        entry = episodeTitlesCache[key] = {titles: null, promise: null};
        entry.promise = LampaYaniApi.episodeInfo(malId).then(function (payload) {
            var items = payload && payload.episodes;
            var titles = {};
            if (Array.isArray(items)) {
                items.forEach(function (item) {
                    var number = window.LampaYaniEpisode.key(item.episodeNumber || item.episode || item.number);
                    if (number && item.title) titles[number] = item.title;
                });
            }
            entry.titles = titles;
            return titles;
        }).catch(function () {
            delete episodeTitlesCache[key];
            return null;
        });
        return entry.promise;
    }

    function applyEpisodeTitles(group, titles) {
        if (!group || !titles) return;
        group.episodeTitlesLoaded = true;
        (group.videos || []).forEach(function (video) {
            var number = window.LampaYaniEpisode.key(window.LampaYaniEpisode.valueOf(video));
            if (titles[number]) video.yani_episode_title = titles[number];
        });
    }

    function enrichEpisodeTitles(card, group) {
        var malId = card && card.yani_remote_ids && (card.yani_remote_ids.myanimelist_id || card.yani_remote_ids.mal_id);
        if (!malId) {
            if (group) group.episodeTitlesLoaded = true;
            return Promise.resolve();
        }
        var entry = episodeTitlesCache[String(malId)];
        if (group && entry && entry.titles) applyEpisodeTitles(group, entry.titles);
        else episodeTitlesForCard(card);
        return Promise.resolve();
    }

    // Stream sources that already carry a direct Alloha stream and must not be
    // routed through the Alloha policy a second time.
    var ALLOHA_RESOLVED_SOURCES = ['lampac-alloha', 'yani-resolver'];
    var lampaHistoryPending = {};

    function lampaHistoryEnabled() {
        if (!Lampa.Storage || !Lampa.Storage.get) return true;
        var value = Lampa.Storage.get('yani_add_to_lampa_history', true);
        return value !== false && value !== 'false' && value !== 0 && value !== '0';
    }

    function addToLampaHistory(card) {
        if (!lampaHistoryEnabled() || !card || !card.yani_id || !Lampa.Favorite || !Lampa.Favorite.add) return;
        var key = String(card.yani_id);
        if (lampaHistoryPending[key]) return;

        // Lampa history must contain a real native card. Saving a YummyAnime id
        // as if it were a TMDB id creates a history item that cannot be opened.
        // Resolve in the background so starting playback is never delayed.
        lampaHistoryPending[key] = Promise.resolve().then(function () {
            return findStandardLampaCard(card);
        }).then(function (match) {
            if (!lampaHistoryEnabled() || !match || !match.card || !match.card.id) return;
            var nativeCard = Object.assign({}, match.card);
            nativeCard.source = nativeCard.source || 'tmdb';
            Lampa.Favorite.add('history', nativeCard);
        }).catch(function (error) {
            console.warn('[YummyAnime] Could not add title to Lampa history', error);
        }).then(function () {
            delete lampaHistoryPending[key];
        });
    }

    function launchVideo(card, group, videos, selected, options) {
        options = options || {};
        if (window.LampaYaniEpisodeProgress && !options.progressOwner) options.progressOwner = LampaYaniEpisodeProgress.owner();
        var url = videoSourceUrl(selected);
        if (!url) {
            Lampa.Noty.show(t('no_videos'));
            restorePlaybackInteraction();
            return;
        }
        var allohaPageUrl = selected.yani_alloha_iframe_url || (isAllohaUrl(selected.iframe_url) ? selected.iframe_url : url);
        var allohaSource = isAllohaUrl(allohaPageUrl) || /alloha/i.test(String(group && (group.player || group.title) || ''));
        var resolvedAlloha = ALLOHA_RESOLVED_SOURCES.indexOf(String(selected.yani_stream_source || '').toLowerCase()) >= 0;
        if (allohaSource && (!resolvedAlloha || !options.autoAdvance)) {
            return launchAllohaPlayer(card, group, selected, allohaPageUrl, options);
        }
        // Sibnet protects the extracted MP4 with a Referer check that Lampa's
        // built-in <video> cannot satisfy - it signs every request with the
        // Lampa page - and no engine of Lampa's on any platform turned out to
        // send headers instead. So the official embedded page is the one route
        // that actually shows the video: it supplies the header for its own
        // stream. Its play button needs a pointer or a press that reaches the
        // page, which the focus handover in the player component is for.
        var sibnetPageUrl = selected.iframe_url || url;
        if (isSibnetPlaybackSource(sibnetPageUrl, group)) {
            return openEmbeddedEpisode(card, group, selected, sibnetPageUrl);
        }
        if (!isExternalPlayableUrl(url, selected) && window.LampaYaniStreamResolver && LampaYaniStreamResolver.canResolve(url)) {
            selected.yani_stream_origin = url;
            setLoading(true);
            LampaYaniStreamResolver.resolve(url, selected).then(function (result) {
                setLoading(false);
                if (result && result.url) {
                    selected.yani_stream_url = result.url;
                    selected.yani_stream_quality = result.quality || '';
                    selected.yani_stream_qualities = result.qualities || null;
                    selected.yani_stream_source = result.source || '';
                    selected.yani_stream_headers = result.headers || null;
                    selected.yani_stream_headers_required = Boolean(result.headersRequired);
                }
                launchResolvedVideo(card, group, videos, selected, videoSourceUrl(selected) || url, options);
            }).catch(function (error) {
                setLoading(false);
                console.warn('[YummyAnime] Stream resolve failed', error);
                if (isVkPlaybackSource(url, group)) {
                    Lampa.Noty.show(t('vk_stream_unavailable'));
                    restorePlaybackInteraction();
                    return;
                }
                if (isCvhPlaybackSource(url, group)) {
                    Lampa.Noty.show(t(error && error.code === 'CVH_REGION_BLOCKED' ? 'cvh_region_blocked' : 'cvh_stream_unavailable'));
                    restorePlaybackInteraction();
                    return;
                }
                launchResolvedVideo(card, group, videos, selected, url, options);
            });
            return;
        }
        launchResolvedVideo(card, group, videos, selected, url, options);
    }

    function launchResolvedVideo(card, group, videos, selected, url, options) {
        options = options || {};
        if (window.LampaYaniEpisodeProgress && options.progressOwner &&
            !LampaYaniEpisodeProgress.sameOwner(options.progressOwner, LampaYaniEpisodeProgress.owner())) return;
        var title = (card.title || 'YummyAnime') + ' · ' + t('episode') + ' ' + (selected.number || selected.index || '?') + ' · ' + group.title;
        if (!options.recovery) selected.yani_internal_recovery = 0;
        playbackContext = {card: card, group: group, videos: videos, selected: selected,
            progressOwner: options.progressOwner || (window.LampaYaniEpisodeProgress && LampaYaniEpisodeProgress.owner())};
        rememberPlayback(card, group, selected);
        addToLampaHistory(card);
        syncServerProgress(selected);

        var playlist = buildExternalPlaylist(card, videos);
        var current = playlist.filter(function (item) { return item.source === selected; })[0] || {
            title: title,
            url: url,
            time: Number(selected.watched && selected.watched.end_time || 0),
            source: selected,
            headers: videoStreamHeaders(selected),
            quality: videoStreamQualities(selected),
            poster: card.poster || card.img || ''
        };
        if (!isExternalPlayableUrl(current.url, current.source)) {
            // The user already chose "watch in player". Asking again with the
            // same YummyTV dialog left a stale Select onBack that then reported
            // the player as unavailable.
            if (openEmbeddedEpisode(card, group, selected, current.url)) return;
            showExternalPlaybackOptions(card, {
                url: current.url,
                title: current.title,
                onPlayer: function () {
                    if (openEmbeddedEpisode(card, group, selected, current.url)) return true;
                    if (openAndroidAppUri(current.url)) return true;
                    return openExternalUri(current.url);
                }
            });
            return;
        }

        if (showDirectPlaybackOptions(card, current, playlist, options)) {
            return;
        }

        if (openExternalPlayer(current, playlist, card)) {
            return;
        }

        if (playInternalPlayer(current, playlist)) {
            return;
        }

        Lampa.Noty.show(url);
        restorePlaybackInteraction();
    }

    // Both services answer the same question - "give me a direct stream for this
    // Alloha page" - so they are tried in order and the first usable answer
    // wins. The self-hosted resolver goes first because it drives the real
    // player page and therefore matches the exact episode and dubbing, while
    // Lampac has to find the title again by its external ids.
    function allohaResolvers(card, group, selected, url) {
        var chain = [];
        if (window.LampaYaniResolver && LampaYaniResolver.enabled()) {
            chain.push(function () { return LampaYaniResolver.resolve(url); });
        }
        if (window.LampaYaniLampacResolver && LampaYaniLampacResolver.enabled()) {
            chain.push(function () { return LampaYaniLampacResolver.resolveAlloha(card, selected, group, url); });
        }
        return chain;
    }

    function resolveInOrder(chain, index) {
        index = index || 0;
        if (index >= chain.length) return Promise.reject(new Error('No Alloha resolver produced a stream'));
        return chain[index]().then(function (result) {
            if (result && result.url) return result;
            throw new Error('Empty resolver result');
        }).catch(function (error) {
            if (index + 1 >= chain.length) throw error;
            console.warn('[YummyAnime] Alloha resolver failed, trying the next one', error);
            return resolveInOrder(chain, index + 1);
        });
    }

    function launchAllohaDirect(card, group, selected, url, chain, options) {
        setLoading(true);
        resolveInOrder(chain).then(function (result) {
            setLoading(false);
            selected.yani_stream_url = result.url;
            selected.yani_stream_quality = result.quality || '';
            selected.yani_stream_qualities = result.qualities || null;
            selected.yani_stream_headers = result.headers || null;
            selected.yani_stream_headers_required = Boolean(result.headersRequired);
            selected.yani_stream_source = result.source || 'lampac-alloha';
            launchResolvedVideo(card, group, group.videos || [selected], selected, result.url, options);
        }).catch(function (error) {
            setLoading(false);
            console.warn('[YummyAnime] Alloha resolve failed; playback blocked', error);
            blockAllohaPlayback(card, group, selected, url);
        });
        return true;
    }

    function launchAllohaPlayer(card, group, selected, url, options) {
        options = options || {};
        if (selected && isAllohaUrl(url)) selected.yani_alloha_iframe_url = url;
        var chain = allohaResolvers(card, group, selected, url);
        var webAvailable = allohaIframeEnabled();
        if (!chain.length) return blockAllohaPlayback(card, group, selected, url);

        // Auto-next must stay uninterrupted. The direct resolver is the only
        // Alloha route that can preserve Lampa's playlist and progress model.
        if (options.autoAdvance || !webAvailable) {
            return launchAllohaDirect(card, group, selected, url, chain, options);
        }

        var shown = showPlaybackSelect({
            title: t('alloha_playback_title'),
            items: [
                {
                    title: t('alloha_watch_lampa'),
                    subtitle: t('alloha_watch_lampa_description'),
                    action: 'direct'
                },
                {
                    title: t('alloha_watch_web'),
                    subtitle: t('alloha_watch_web_description'),
                    action: 'web'
                }
            ],
            onSelect: function (item) {
                if (item && item.action === 'web') {
                    openAllohaWebPlayer(card, group, selected, url);
                    return;
                }
                launchAllohaDirect(card, group, selected, url, chain, options);
            }
        });
        if (!shown) return launchAllohaDirect(card, group, selected, url, chain, options);
        return true;
    }

    // Alloha streams only from inside its own signed player page: the page
    // refuses to run outside an iframe and its CDN requires rotating headers a
    // media player cannot supply. Without a direct stream the embedded page is
    // therefore the last remaining playback path, and it stays opt-in because
    // it has no Lampa timeline and cannot be handed to an external player.
    function allohaIframeEnabled() {
        if (!Lampa.Storage || !Lampa.Storage.get) return false;
        var value = Lampa.Storage.get('yani_alloha_iframe', false);
        return value === true || value === 'true';
    }

    function blockAllohaPlayback(card, group, selected, url) {
        if (url && allohaIframeEnabled() && openAllohaWebPlayer(card, group, selected, url)) return true;
        Lampa.Noty.show(t('alloha_direct_required'));
        restorePlaybackInteraction();
        return true;
    }

    function acknowledgeAllohaWebNotice() {
        if (!Lampa.Storage || !Lampa.Storage.get || !Lampa.Storage.set) return;
        if (Lampa.Storage.get('yani_alloha_web_notice_seen', false)) return;
        Lampa.Storage.set('yani_alloha_web_notice_seen', true);
        Lampa.Noty.show(t('alloha_web_player_notice'));
    }

    function openAllohaWebPlayer(card, group, selected, url) {
        acknowledgeAllohaWebNotice();
        return openAllohaEmbed(card, group, selected, url);
    }

    function openEmbeddedEpisode(card, group, selected, url) {
        if (!url || !Lampa.Activity || !Lampa.Activity.push) return false;
        try {
            rememberPlayback(card, group, selected);
            addToLampaHistory(card);
            // The embedded site player is still a watch, so the account has to
            // learn about it like it does for the internal and external ones.
            // Only the start can be reported: the page plays inside an iframe
            // this plugin cannot read a position from.
            syncServerProgress(selected);
            // AniSkip can control only Lampa's own video element. Embedded
            // pages are cross-origin, so remove the unusable old prompt.
            stopPlaybackWatcher();
            destroySkipPrompt();
            Lampa.Activity.push({
                url: 'yani/player',
                title: (card && card.title || 'YummyAnime') + ' · ' + t('episode') + ' ' + ((selected && (selected.number || selected.index)) || '?'),
                component: 'yani_player',
                iframe_url: url,
                return_snapshot: playbackReturnSnapshot()
            });
            return true;
        } catch (error) {
            console.warn('[YummyAnime] Embedded player failed to open', error);
            return false;
        }
    }

    /**
     * Alloha's player page starts paused and waits for a click on its own play
     * button - which a remote cannot deliver, because the page lives in a
     * cross-origin iframe nothing here can reach into. It does read `autoplay`
     * out of the query string into its own settings, so asking for it up front
     * is what makes the embedded page usable without a pointer.
     */
    function allohaAutoplayUrl(url) {
        var value = String(url || '');
        if (!value || /[?&]autoplay=/i.test(value)) return value;
        return value + (value.indexOf('?') >= 0 ? '&' : '?') + 'autoplay=1';
    }

    /**
     * Wraps the player address in the project's own bridge page.
     *
     * Alloha answers 404 to a request carrying no referrer, and Lampa's Android
     * app serves its interface locally, so an iframe opened straight from the
     * app arrives with an empty referrer - the viewer is told the content does
     * not exist. Which referrer it is does not matter, so a static page on the
     * same Pages site that serves this plugin is enough to stand between them.
     * No server anyone has to run.
     */
    function allohaEmbedUrl(url) {
        var target = allohaAutoplayUrl(url);
        var bridge = window.LampaYaniConfig && LampaYaniConfig.allohaEmbedUrl;
        if (!target || !bridge) return target;
        return bridge + '?url=' + encodeURIComponent(target);
    }

    function openAllohaEmbed(card, group, selected, url) {
        return openEmbeddedEpisode(card, group, selected, allohaEmbedUrl(url));
    }

    function setLoading(enabled) {
        if (!window.Lampa || !Lampa.Loading) return;
        try {
            if (enabled && Lampa.Loading.start) Lampa.Loading.start();
            if (!enabled && Lampa.Loading.stop) Lampa.Loading.stop();
        } catch (ignore) {}
    }

    function buildExternalPlaylist(card, videos) {
        return (videos || []).map(function (video) {
            var url = videoSourceUrl(video);
            if (!url) return null;
            return {
                title: (card.title || 'YummyAnime') + ' · ' + t('episode') + ' ' + (video.number || video.index || '?'),
                url: url,
                time: Number(video.watched && video.watched.end_time || 0),
                source: video,
                headers: videoStreamHeaders(video),
                quality: videoStreamQualities(video),
                poster: card.poster || card.img || ''
            };
        }).filter(Boolean);
    }

    function videoResolverUrl(video) {
        if (!video) return '';
        var data = LampaYaniUiUtils.videoData(video);
        var normalize = LampaYaniUiUtils.normalizeVideoUrl || function (url) { return url || ''; };
        return normalize(video.yani_stream_origin || video.iframe_url || video.url || video.player_url || video.link ||
            data.iframe_url || data.url || data.player_url || data.link);
    }

    function internalPlayerExtensionHint(item) {
        if (!isAndroidPlatform() || !item) return '';
        if (isVkPlaybackSource(item.url, item.source)) {
            return /\.m3u8(?:[?#]|$)/i.test(String(item.url || '')) ? 'm3u8' : 'mp4';
        }
        return isCvhPlaybackSource(item.url, item.source) ? 'mp4' : '';
    }

    function markAndroidDirectVideoUrl(url, extensionHint) {
        url = String(url || '');
        if (!url || !extensionHint || !isAndroidPlatform() || /(?:#|&)yani\.(?:mp4|m3u8)(?:&|$)/i.test(url)) return url;
        return url + (url.indexOf('#') >= 0 ? '&' : '#') + 'yani.' + extensionHint;
    }

    function markAndroidDirectVideoQualities(qualities, extensionHint) {
        if (!qualities || typeof qualities !== 'object' || !extensionHint) return qualities;
        var marked = {};
        Object.keys(qualities).forEach(function (label) {
            var value = qualities[label];
            if (typeof value !== 'string') {
                marked[label] = value;
                return;
            }
            var qualityExtension = extensionHint === 'm3u8'
                ? (/\.m3u8(?:[?#]|$)/i.test(value) ? 'm3u8' : 'mp4')
                : extensionHint;
            marked[label] = markAndroidDirectVideoUrl(value, qualityExtension);
        });
        return marked;
    }

    function isAndroidDirectVideoUrl(src) {
        src = String(src || '');
        return isAndroidPlatform() &&
            /^https?:\/\/[^/?#]*okcdn\.ru(?:[/?#]|$)/i.test(src) &&
            /(?:#|&)yani\.(?:mp4|m3u8)(?:&|$)/i.test(src);
    }

    function registerAndroidDirectVideoTube() {
        if (window.LampaYaniAndroidDirectVideoTube) return true;
        if (!window.Lampa || !Lampa.PlayerVideo || typeof Lampa.PlayerVideo.registerTube !== 'function') return false;

        var tube = {
            name: 'YummyAnime Android direct video',
            verify: function (src) {
                return isAndroidDirectVideoUrl(src);
            },
            create: function (callback) {
                // CVH and VK CDN responses do not include Access-Control-Allow-Origin.
                // Lampa's default crossorigin attribute makes Android WebView
                // reject those streams, so this source uses a plain video tag.
                var element = $('<video class="player-video__video" poster="./img/video_poster.png"></video>');
                callback(element[0]);
                return element;
            }
        };

        Lampa.PlayerVideo.registerTube(tube);
        window.LampaYaniAndroidDirectVideoTube = tube;
        return true;
    }

    function internalPlayerPlaylistItem(item) {
        if (!item) return null;
        var extensionHint = internalPlayerExtensionHint(item);
        var quality = item.quality || videoStreamQualities(item.source);
        var sourceUrl = markAndroidDirectVideoUrl(item.url, extensionHint);
        quality = markAndroidDirectVideoQualities(quality, extensionHint);
        return LampaYaniUiUtils.internalPlayerItem({
            title: item.title,
            url: sourceUrl,
            time: item.time,
            quality: quality,
            headers: item.headers || videoStreamHeaders(item.source),
            poster: item.poster || '',
            extensionHint: extensionHint,
            extension: extensionHint,
            mime: extensionHint === 'mp4' ? 'video/mp4' : extensionHint === 'm3u8' ? 'application/vnd.apple.mpegurl' : ''
        });
    }

    // Headers only matter where a player can actually send them, which on this
    // plugin's platforms means Android. Elsewhere the built-in engine stays the
    // right choice, headers or not.
    /**
     * Warns when a stream asks for request headers the chosen player may not
     * send. Sibnet is the case that made this necessary: its file is guarded by
     * a referrer check, and Lampa's built-in engine is a <video> element, which
     * signs every request with the Lampa page instead - the file then comes back
     * refused and the screen fills with noise and "video not found", which reads
     * as a broken plugin rather than as a source that needs a different player.
     *
     * The choice of player stays with the viewer; this only makes the trade-off
     * visible instead of letting them meet it as a failure.
     */
    function warnAboutRequestHeaders(item) {
        if (!needsRequestHeaders(item)) return;
        if (!Lampa.Noty || !Lampa.Noty.show) return;
        Lampa.Noty.show(t('internal_player_headers_warning'));
    }

    // True only for a stream the resolver marked as unplayable without its
    // headers. Merely carrying headers is not that: CVH and VK results carry a
    // User-Agent, sometimes a Referer, and play fine in a <video> without them.
    // Treating any header as a requirement is what broke both of them.
    function needsRequestHeaders(item) {
        if (!item) return false;
        if (item.headersRequired) return true;
        var source = item.source;
        return Boolean(source && source.yani_stream_headers_required);
    }

    function playInternalDirectVideo(current, playlist) {
        if (!Lampa.Player || !Lampa.Player.play || !Lampa.Player.runas) return false;
        var callbackContext = playbackContext;
        var callbackSession = playbackReturnState.session;
        var directPlaylist = (playlist || []).filter(function (item) { return isExternalPlayableUrl(item.url, item.source); })
            .map(internalPlayerPlaylistItem).filter(Boolean);
        var normalizedCurrent = internalPlayerPlaylistItem(current);
        var directCurrent = normalizedCurrent && directPlaylist.filter(function (item) { return item.url === normalizedCurrent.url; })[0] || normalizedCurrent;
        if (!directCurrent) return false;
        if (!directPlaylist.length) directPlaylist = [directCurrent];
        try {
            // Lampa.Player.play follows the globally configured player unless
            // the caller explicitly selects the built-in Lampa engine.
            //
            // That engine is a <video> in the WebView, and a <video> cannot send
            // request headers: it signs every request with the Lampa page as the
            // referrer. Sibnet checks the referrer and answers 403, which the
            // element reports as an unplayable file. The same URL and headers
            // play fine in a native player, so a stream that states headers is
            // left to whichever engine the platform provides instead of being
            // forced into the one that must fail. Streams without headers - CVH,
            // VK, Kodik - keep using the built-in engine exactly as before.
            Lampa.Player.runas('lampa');
            Lampa.Player.play(directCurrent);
            if (Lampa.Player.playlist) Lampa.Player.playlist(directPlaylist);
            if (Lampa.Player.callback) {
                Lampa.Player.callback(function () {
                    flushPlaybackProgress(true, callbackContext);
                    // Closing the previous episode during auto-next invokes its
                    // callback after a new playback session has begun. That old
                    // callback must not restore the detail focus over the next
                    // episode's player.
                    if (playbackReturnState.session !== callbackSession) return;
                    // Player.callback can fire before Lampa finishes removing its
                    // player controller. Verify the detail focus after that lifecycle.
                    restorePlaybackInteraction(null, {timeout: 2400, interval: 120});
                });
            }
            return true;
        } catch (error) {
            console.warn('[YummyAnime] Internal Lampa player failed to start', error);
            return false;
        }
    }

    function isAndroidPlatform() {
        return window.LampaYaniUiUtils && typeof LampaYaniUiUtils.isAndroidPlatform === 'function'
            ? LampaYaniUiUtils.isAndroidPlatform()
            : false;
    }

    function isAndroidTvPlatform() {
        return window.LampaYaniUiUtils && typeof LampaYaniUiUtils.isAndroidTvPlatform === 'function'
            ? LampaYaniUiUtils.isAndroidTvPlatform()
            : false;
    }

    function isWebOsPlatform() {
        return window.LampaYaniUiUtils && typeof LampaYaniUiUtils.isWebOsPlatform === 'function'
            ? LampaYaniUiUtils.isWebOsPlatform()
            : false;
    }

    var PLAYBACK_SOURCE_IDS = ['kodik', 'vk', 'alloha', 'cvh', 'sibnet', 'aksor'];
    var PLAYBACK_SOURCE_LABELS = {kodik: 'Kodik', vk: 'VK', alloha: 'Alloha', cvh: 'CVH', sibnet: 'Sibnet', aksor: 'Aksor'};
    var EXPERIMENTAL_PLAYBACK_SOURCE_IDS = ['alloha', 'cvh'];

    function playbackSourceDefaultEnabled(sourceId) {
        // CVH exposes direct MP4 streams but its JSON endpoints have no CORS
        // headers. The Android internal player uses a source-specific video
        // element while WebOS can play the stream directly; other platforms
        // keep the source opt-in.
        if (sourceId === 'cvh') return isAndroidPlatform() || isWebOsPlatform();
        return EXPERIMENTAL_PLAYBACK_SOURCE_IDS.indexOf(sourceId) < 0;
    }

    function playbackSourceLabel(sourceId) {
        return PLAYBACK_SOURCE_LABELS[sourceId] || String(sourceId || '');
    }

    function triggerSettingEnabled(value, storageKey, fallback) {
        if (value && typeof value === 'object') value = value.value;
        if (value === undefined && Lampa.Storage && Lampa.Storage.get) value = Lampa.Storage.get(storageKey, fallback);
        return value === true || value === 'true' || value === 1 || value === '1';
    }

    function migrateLegacyPlayerPreference() {
        if (!Lampa.Storage || Lampa.Storage.get('yani_player_pref_migrated', false)) return;
        var legacy = Lampa.Storage.get('yani_player_preference', 'last');
        if (legacy === 'lampa') {
            var target = Lampa.Storage.get('yani_playback_target', 'ask');
            if (target === 'ask' || !target) Lampa.Storage.set('yani_playback_target', 'internal');
            Lampa.Storage.set('yani_player_preference', 'last');
        }
        Lampa.Storage.set('yani_player_pref_migrated', true);
    }

    function playbackSourceId(group) {
        var canonical = window.LampaYaniPlaybackPreferences && LampaYaniPlaybackPreferences.source(group);
        if (PLAYBACK_SOURCE_IDS.indexOf(canonical) >= 0) return canonical;
        var key = String(group && (group.player || group.title || group.source) || '').toLowerCase();
        if (!key) return '';
        for (var i = 0; i < PLAYBACK_SOURCE_IDS.length; i++) {
            if (key.indexOf(PLAYBACK_SOURCE_IDS[i]) >= 0) return PLAYBACK_SOURCE_IDS[i];
        }
        return '';
    }

    function isPlaybackSourceEnabled(sourceId) {
        if (!sourceId) return true;
        var fallback = playbackSourceDefaultEnabled(sourceId);
        if (!Lampa.Storage || !Lampa.Storage.get) return fallback;
        var value = Lampa.Storage.get('yani_source_' + sourceId, fallback);
        return value !== false && value !== 'false' && value !== 0 && value !== '0';
    }

    function playbackTargetPreference() {
        migrateLegacyPlayerPreference();
        // External Android players are unavailable outside Android, so playback
        // is always forced through the internal Lampa player on other platforms.
        if (!isAndroidPlatform()) return 'internal';
        var value = Lampa.Storage && Lampa.Storage.get ? Lampa.Storage.get('yani_playback_target', 'ask') : 'ask';
        return value === 'internal' || value === 'external' ? value : 'ask';
    }

    function openExternalPlayer(current, playlist, card) {
        if (!isAndroidPlatform()) return false;
        return openExternalVideo(current.url, current.title, {
            playlist: externalPlayablePlaylist(playlist),
            time: current.time,
            poster: card.poster || card.img || '',
            requireDirect: true,
            source: current.source,
            headers: current.headers || videoStreamHeaders(current.source),
            quality: current.quality || videoStreamQualities(current.source)
        });
    }

    function playInternalPlayer(current, playlist) {
        // Lampa's player also auto-plays the next playlist item when a video
        // ends. If this plugin already owns auto-next, a multi-item playlist
        // would skip one extra episode.
        var items = autoNextEnabled() && current ? [current] : playlist;
        var started = isExternalPlayableUrl(current && current.url, current && current.source) && playInternalDirectVideo(current, items);
        if (started) {
            warnAboutRequestHeaders(current);
            startPlaybackWatcher(playbackContext);
        }
        return started;
    }

    // Set right before playback is dispatched so the watcher knows which title
    // and episode started, whichever of the three entry points ran.
    var playbackContext = null;
    var playbackWatcher = null;
    var playbackWatcherGeneration = 0;
    var PLAYER_STARTUP_GRACE_MS = 120000;
    var INTERNAL_PLAYBACK_RECOVERY_LIMIT = 3;
    var INTERNAL_PLAYBACK_RECOVERY_READY_SECONDS = 3;
    var CVH_STARTUP_STALL_MS = 18000;
    var CVH_PLAYBACK_STALL_MS = 15000;
    var NEXT_PREFETCH_LEAD = 90;
    var PLAYER_CLOSE_POLL_MS = 80;
    var PLAYER_CLOSE_SETTLE_MS = 120;
    var PLAYER_CLOSE_TIMEOUT_MS = 3500;

    function skipPreference() {
        var value = Lampa.Storage && Lampa.Storage.get ? Lampa.Storage.get('yani_aniskip', 'off') : 'off';
        return value === 'op' || value === 'ed' || value === 'op_ed' || value === 'suggest' ? value : 'off';
    }

    function skipTypesForMode(mode) {
        return {
            op: mode === 'op' || mode === 'op_ed' || mode === 'suggest',
            ed: mode === 'ed' || mode === 'op_ed' || mode === 'suggest'
        };
    }

    function autoNextEnabled() {
        if (!Lampa.Storage || !Lampa.Storage.get) return false;
        var value = Lampa.Storage.get('yani_auto_next', false);
        return value === true || value === 'true';
    }

    // Current Lampa builds may wrap the media element (native TV engines do not
    // necessarily leave a usable <video> in the DOM). Prefer the public player
    // accessor and keep the DOM lookup only for older builds.
    function playerVideoElement(preferred) {
        if (window.Lampa && Lampa.PlayerVideo && typeof Lampa.PlayerVideo.video === 'function') {
            try {
                var active = Lampa.PlayerVideo.video();
                if (active && isFinite(active.duration) && active.duration > 0 && !active.ended) return active;
            } catch (ignorePlayerVideo) {}
        }
        if (preferred && isFinite(preferred.duration) && preferred.duration > 0 && !preferred.ended) return preferred;
        var selectors = ['.player-video video', '.player video', 'video'];
        for (var i = 0; i < selectors.length; i++) {
            var elements = document.querySelectorAll(selectors[i]);
            for (var j = elements.length - 1; j >= 0; j--) {
                var element = elements[j];
                // A finished video from the previous player may remain in the
                // DOM briefly. Never attach a new episode watcher to it.
                if (!element.ended && isFinite(element.duration) && element.duration > 0) return element;
            }
        }
        return null;
    }

    function stopPlaybackWatcher() {
        if (!playbackWatcher) return;
        var state = playbackWatcher;
        clearInterval(state.timer);
        var listener = window.Lampa && Lampa.PlayerVideo && Lampa.PlayerVideo.listener;
        if (listener && typeof listener.remove === 'function') {
            if (state.playerTimeHandler) listener.remove('timeupdate', state.playerTimeHandler);
            if (state.playerPauseHandler) listener.remove('pause', state.playerPauseHandler);
            if (state.playerEndedHandler) listener.remove('ended', state.playerEndedHandler);
            if (state.playerDestroyHandler) listener.remove('destroy', state.playerDestroyHandler);
            if (state.playerErrorHandler) listener.remove('error', state.playerErrorHandler);
        }
        if (state.video && state.endedHandler && state.video.removeEventListener) {
            state.video.removeEventListener('ended', state.endedHandler);
        }
        playbackWatcher = null;
        destroySkipPrompt();
    }

    function startPlaybackWatcher(context) {
        stopPlaybackWatcher();
        var generation = ++playbackWatcherGeneration;
        if (!context) return;
        var skipMode = skipPreference();
        var autoNext = autoNextEnabled();
        var progressSync = autoProgressSyncEnabled();

        var state = {
            context: context,
            timer: 0,
            segments: [],
            skipped: {},
            skipMode: skipMode,
            skipPrompt: skipMode === 'suggest',
            skipReady: false,
            skipLoading: false,
            skipLength: 0,
            autoNext: autoNext,
            progressSync: progressSync,
            lastLocalSync: 0,
            lastLocalPosition: Number(context.selected && context.selected.watched && context.selected.watched.end_time || 0),
            lastObservedPosition: Number(context.selected && context.selected.watched && context.selected.watched.end_time || 0),
            lastObservedDuration: Number(context.selected && context.selected.duration || 0),
            lastServerSync: Date.now(),
            lastServerPosition: Number(context.selected && context.selected.watched && context.selected.watched.end_time || 0),
            prefetched: false,
            advanced: false,
            video: null,
            endedHandler: null,
            playerTimeHandler: null,
            playerPauseHandler: null,
            playerEndedHandler: null,
            playerDestroyHandler: null,
            playerErrorHandler: null,
            returnRestoreScheduled: false,
            recoveryAttempts: Number(context.selected && context.selected.yani_internal_recovery || 0),
            recoveryBaselinePosition: Number(context.selected && context.selected.watched && context.selected.watched.end_time || 0),
            recovering: false,
            startedAt: Date.now(),
            lastProgressAt: Date.now(),
            lastSeenAt: Date.now()
        };
        playbackWatcher = state;
        bindPlayerProgressEvents(generation, context, state);
        state.timer = setInterval(function () { watchPlayback(generation, context, state); }, 1000);
        var initialLength = Number(context.selected && context.selected.duration || 0);
        if (skipMode !== 'off' && initialLength >= 60) loadSkipSegments(generation, context, state, skipMode, initialLength);
    }

    function flushPlaybackProgress(remote, expectedContext) {
        var state = playbackWatcher;
        // Replacing a finished video can invoke its old Lampa callback after
        // the next episode has already created a watcher. That stale callback
        // must not flush or stop the new episode.
        if (expectedContext &&
            expectedContext !== playbackContext &&
            (!state || state.context !== expectedContext)) {
            return;
        }
        var context = expectedContext || state && state.context || playbackContext;
        if (!context || !context.selected) {
            stopPlaybackWatcher();
            return;
        }
        var element = playerVideoElement(state && state.context === context ? state.video : null);
        var position = element ? Number(element.currentTime || 0) : Number(state && state.lastObservedPosition || context.selected.watched && context.selected.watched.end_time || 0);
        var duration = element ? Number(element.duration || 0) : Number(state && state.lastObservedDuration || context.selected.duration || 0);
        if (position > 0) updatePlaybackProgress(context, position, duration, Boolean(remote));
        stopPlaybackWatcher();
    }

    function loadSkipSegments(generation, context, state, mode, episodeLength) {
        if (!window.LampaYaniAniSkip) return;
        var ids = (context.card && context.card.yani_remote_ids) || {};
        var malId = Number(ids.myanimelist_id || ids.mal_id || 0);
        var selected = context.selected || {};
        var episode = Number(selected.number || selected.index || 0);
        if (!malId || !episode) return;
        var length = Math.max(0, Math.round(Number(episodeLength) || 0));
        state.skipLoading = true;
        state.skipReady = false;
        state.skipLength = length;
        state.skipRequest = (state.skipRequest || 0) + 1;
        var request = state.skipRequest;
        LampaYaniAniSkip.times(malId, episode, length).then(function (intervals) {
            if (generation !== playbackWatcherGeneration || request !== state.skipRequest) return;
            var types = skipTypesForMode(mode);
            var segments = [];
            if (types.op && intervals.op) segments.push({type: 'op', interval: intervals.op, label: t('aniskip_opening_skipped')});
            if (types.ed && intervals.ed) segments.push({type: 'ed', interval: intervals.ed, label: t('aniskip_ending_skipped')});
            state.segments = segments;
            state.skipLoading = false;
            state.skipReady = true;
        });
    }

    var skipPromptState = {root: null, panel: null, segment: null, video: null, focused: false};

    function skipPromptLabel(segment) {
        if (segment && segment.type === 'ed') return t('aniskip_skip_ending');
        if (segment && segment.type === 'op') return t('aniskip_skip_opening');
        return t('aniskip_skip');
    }

    function skipPromptHost() {
        return document.querySelector('.player') || document.querySelector('.player-video') || document.body;
    }

    function skipPromptIsActive() {
        return Boolean(skipPromptState.root &&
            skipPromptState.segment &&
            skipPromptState.root.classList.contains('yani-skip-prompt--visible'));
    }

    function returnSkipFocusToPlayer() {
        skipPromptState.focused = false;
        if (skipPromptState.root) $(skipPromptState.root).removeClass('focus');
        if (Lampa.Controller && Lampa.Controller.enabled && Lampa.Controller.enabled().name === 'yani_player_skip') {
            Lampa.Controller.toggle('player');
        }
        setTimeout(ensurePlayerSkipUpHook, 0);
    }

    function ensurePlayerSkipUpHook() {
        if (!Lampa.Controller || !Lampa.Controller.enabled) return;
        var enabled = Lampa.Controller.enabled();
        if (!enabled || enabled.name !== 'player' || !enabled.controller || enabled.controller._yani_skip_up) return;
        var originalUp = enabled.controller.up;
        enabled.controller._yani_skip_up = true;
        enabled.controller.up = function () {
            if (skipPromptIsActive()) {
                focusSkipPrompt();
                return;
            }
            if (originalUp) return originalUp.apply(this, arguments);
        };
    }

    function focusSkipPrompt() {
        if (!skipPromptIsActive() || !Lampa.Controller || !Lampa.Controller.add) return;
        var button = skipPromptState.root;
        Lampa.Controller.add('yani_player_skip', {
            toggle: function () {
                if (!skipPromptIsActive()) return;
                var host = $(button);
                if (Lampa.Controller.collectionSet) Lampa.Controller.collectionSet(host);
                if (window.Navigator && Navigator.add) Navigator.add(button);
                if (Lampa.Controller.collectionFocus) Lampa.Controller.collectionFocus(button, host);
                $(button).addClass('focus');
                skipPromptState.focused = true;
            },
            up: returnSkipFocusToPlayer,
            down: returnSkipFocusToPlayer,
            left: returnSkipFocusToPlayer,
            right: returnSkipFocusToPlayer,
            gone: function () {
                skipPromptState.focused = false;
                if (skipPromptState.root) $(skipPromptState.root).removeClass('focus');
            },
            back: function () {
                if (Lampa.Player && Lampa.Player.close) Lampa.Player.close();
                else returnSkipFocusToPlayer();
            }
        });
        var enabled = Lampa.Controller.enabled ? Lampa.Controller.enabled() : null;
        var name = enabled && enabled.name;
        if (name === 'player' || name === 'yani_player_skip' || name === 'player_skip') {
            Lampa.Controller.toggle('yani_player_skip');
        }
    }

    function bindSkipAction(element) {
        if (!element || element._yani_skip_bound) return element;
        element._yani_skip_bound = true;
        element.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            confirmSkipPrompt();
        });
        if (window.$) $(element).on('hover:enter', function () { confirmSkipPrompt(); });
        return element;
    }

    function ensureSkipPrompt() {
        if (skipPromptState.root && document.body.contains(skipPromptState.root)) return skipPromptState.root;
        var button = document.createElement('div');
        button.className = 'yani-skip-prompt selector';
        button.setAttribute('role', 'button');
        skipPromptState.root = bindSkipAction(button);
        return skipPromptState.root;
    }

    function syncSkipPanelButton(segment) {
        var right = document.querySelector('.player-panel__right') ||
            document.querySelector('.player-panel .player-panel__buttons') ||
            document.querySelector('.player-panel');
        if (!right) return;
        var button = skipPromptState.panel;
        if (!button || !document.body.contains(button)) {
            button = document.createElement('div');
            button.className = 'player-panel__button selector yani-skip-panel';
            button.setAttribute('role', 'button');
            skipPromptState.panel = bindSkipAction(button);
        }
        if (skipPromptState.panel.parentNode !== right) right.appendChild(skipPromptState.panel);
        skipPromptState.panel.textContent = skipPromptLabel(segment);
        skipPromptState.panel.style.display = '';
        var enabled = Lampa.Controller && Lampa.Controller.enabled ? Lampa.Controller.enabled() : null;
        if (enabled && enabled.name === 'player_panel' && Lampa.Controller.collectionAppend) {
            Lampa.Controller.collectionAppend(skipPromptState.panel);
        }
    }

    function hideSkipPanelButton() {
        if (skipPromptState.panel) skipPromptState.panel.style.display = 'none';
    }

    function showSkipPrompt(segment, video) {
        var button = ensureSkipPrompt();
        var host = skipPromptHost();
        if (button.parentNode !== host) host.appendChild(button);
        button.textContent = skipPromptLabel(segment);
        button.classList.add('yani-skip-prompt--visible');
        skipPromptState.segment = segment;
        skipPromptState.video = video;
        syncSkipPanelButton(segment);
        ensurePlayerSkipUpHook();
        // Match Lampa's native player-skip: take remote focus while the
        // prompt is active so Enter can confirm without a mouse.
        if (!skipPromptState.focused) focusSkipPrompt();
    }

    function hideSkipPrompt() {
        if (skipPromptState.root) skipPromptState.root.classList.remove('yani-skip-prompt--visible');
        skipPromptState.segment = null;
        skipPromptState.video = null;
        hideSkipPanelButton();
        if (skipPromptState.focused) returnSkipFocusToPlayer();
    }

    function destroySkipPrompt() {
        hideSkipPrompt();
        if (skipPromptState.root && skipPromptState.root.parentNode) skipPromptState.root.parentNode.removeChild(skipPromptState.root);
        skipPromptState.root = null;
        if (skipPromptState.panel && skipPromptState.panel.parentNode) skipPromptState.panel.parentNode.removeChild(skipPromptState.panel);
        skipPromptState.panel = null;
        skipPromptState.focused = false;
    }

    function applySkip(video, segment, state) {
        if (!video || !segment || !state || state.skipped[segment.type]) return;
        state.skipped[segment.type] = true;
        try {
            video.currentTime = segment.interval.end;
        } catch (error) {
            console.warn('[YummyAnime] Could not skip a segment', error);
            state.skipped[segment.type] = false;
            return;
        }
        Lampa.Noty.show(segment.label);
        hideSkipPrompt();
    }

    function confirmSkipPrompt() {
        var state = playbackWatcher;
        var segment = skipPromptState.segment;
        var video = skipPromptState.video || playerVideoElement(state && state.video);
        if (!state || !segment || !video) return;
        applySkip(video, segment, state);
    }

    function advancePlaybackWatcher(generation, context, state) {
        if (generation !== playbackWatcherGeneration || playbackWatcher !== state || !state.autoNext || state.advanced) return;
        var closingVideo = state.video;
        state.advanced = true;
        stopPlaybackWatcher();
        advanceToNextEpisode(context, closingVideo);
    }

    function bindPlaybackVideo(generation, context, state, video) {
        if (state.video === video) return;
        if (state.video && state.endedHandler && state.video.removeEventListener) {
            state.video.removeEventListener('ended', state.endedHandler);
        }
        state.video = video;
        state.endedHandler = function () {
            advancePlaybackWatcher(generation, context, state);
        };
        if (video && video.addEventListener) video.addEventListener('ended', state.endedHandler);
    }

    function storeObservedPlayback(generation, context, state, event, finalState) {
        if (generation !== playbackWatcherGeneration || playbackWatcher !== state) return;
        event = event || {};
        var video = playerVideoElement(state.video);
        var eventPosition = Number(event.current);
        var eventDuration = Number(event.duration);
        var position = isFinite(eventPosition) && eventPosition >= 0
            ? eventPosition
            : Number(video && video.currentTime || state.lastObservedPosition || 0);
        var duration = isFinite(eventDuration) && eventDuration > 0
            ? eventDuration
            : Number(video && video.duration || state.lastObservedDuration || context.selected && context.selected.duration || 0);
        if (video) bindPlaybackVideo(generation, context, state, video);
        if (!(position >= 0)) position = 0;
        if (!(duration >= 0)) duration = 0;
        state.lastSeenAt = Date.now();
        if (Math.abs(position - Number(state.lastObservedPosition || 0)) > 0.25) {
            state.lastProgressAt = state.lastSeenAt;
        }
        state.lastObservedPosition = position;
        state.lastObservedDuration = duration;
        if (!(position > 0)) return;

        var now = Date.now();
        if (now - state.lastLocalSync >= 10000 || finalState && Math.abs(position - state.lastLocalPosition) >= 1) {
            state.lastLocalSync = now;
            state.lastLocalPosition = position;
            updatePlaybackProgress(context, position, duration, false);
        }
        if (state.progressSync && (now - state.lastServerSync >= 60000 || finalState && Math.abs(position - state.lastServerPosition) >= 1)) {
            state.lastServerSync = now;
            state.lastServerPosition = position;
            updatePlaybackProgress(context, position, duration, true);
        }
    }

    function bindPlayerProgressEvents(generation, context, state) {
        var listener = window.Lampa && Lampa.PlayerVideo && Lampa.PlayerVideo.listener;
        if (!listener || typeof listener.follow !== 'function') return;
        state.playerTimeHandler = function (event) {
            storeObservedPlayback(generation, context, state, event, false);
        };
        state.playerPauseHandler = function (event) {
            storeObservedPlayback(generation, context, state, event, true);
        };
        state.playerEndedHandler = function (event) {
            storeObservedPlayback(generation, context, state, event, true);
            advancePlaybackWatcher(generation, context, state);
        };
        state.playerDestroyHandler = function (event) {
            // Lampa may remove the underlying media node before Player.callback.
            // Capture the final position while its player object still exists,
            // then restore the title controller immediately instead of waiting
            // for the later callback. Auto-next and stream recovery deliberately
            // close the player themselves and must keep ownership of navigation.
            storeObservedPlayback(generation, context, state, event, true);
            if (!state.advanced && !state.recovering && !state.returnRestoreScheduled) {
                state.returnRestoreScheduled = true;
                restorePlaybackInteraction(null, {timeout: 2400, interval: 120});
            }
        };
        state.playerErrorHandler = function (event) {
            recoverInternalPlayback(generation, context, state, event);
        };
        listener.follow('timeupdate', state.playerTimeHandler);
        listener.follow('pause', state.playerPauseHandler);
        listener.follow('ended', state.playerEndedHandler);
        listener.follow('destroy', state.playerDestroyHandler);
        listener.follow('error', state.playerErrorHandler);
    }

    function recoverInternalPlayback(generation, context, state, event) {
        if (!event || !event.fatal || generation !== playbackWatcherGeneration || playbackWatcher !== state) return;
        if (state.recovering || state.recoveryAttempts >= INTERNAL_PLAYBACK_RECOVERY_LIMIT || !context || !context.selected) return;
        var origin = videoResolverUrl(context.selected);
        if (!origin || isDirectVideoUrl(origin) || !window.LampaYaniStreamResolver ||
            !LampaYaniStreamResolver.canResolve(origin)) return;

        state.recovering = true;
        state.recoveryAttempts += 1;
        context.selected.yani_internal_recovery = state.recoveryAttempts;
        storeObservedPlayback(generation, context, state, event, true);
        var position = Math.max(0, Number(state.lastObservedPosition || 0));
        var duration = Math.max(0, Number(state.lastObservedDuration || context.selected.duration || 0));
        context.selected.watched = context.selected.watched || {};
        context.selected.watched.end_time = Math.floor(position);
        if (duration > 0) context.selected.duration = Math.floor(duration);
        if (Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(t('internal_player_recovering'));

        LampaYaniStreamResolver.resolve(origin, {force: true}).then(function (result) {
            if (generation !== playbackWatcherGeneration || playbackWatcher !== state || !result || !result.url) return;
            context.selected.yani_stream_url = result.url;
            context.selected.yani_stream_quality = result.quality || '';
            context.selected.yani_stream_qualities = result.qualities || null;
            context.selected.yani_stream_source = result.source || '';
            context.selected.yani_stream_headers = result.headers || null;
            context.selected.yani_stream_headers_required = Boolean(result.headersRequired);
            beginPlaybackNavigation();
            var recoverySession = playbackReturnState.session;
            var closingVideo = state.video;
            stopPlaybackWatcher();
            closeInternalPlayer(closingVideo).then(function () {
                if (playbackReturnState.session !== recoverySession || playbackContext !== context) return;
                launchResolvedVideo(context.card, context.group, context.videos, context.selected, result.url, {
                    autoAdvance: true,
                    recovery: true
                });
            });
        }).catch(function (error) {
            state.recovering = false;
            console.warn('[YummyAnime] Could not refresh an interrupted stream', error);
        });
    }

    function watchPlayback(generation, context, state) {
        // A queued tick from the previous episode must never stop the watcher
        // that belongs to the newly launched player.
        if (generation !== playbackWatcherGeneration || playbackWatcher !== state) return;
        var video = playerVideoElement(state.video);
        if (!video) {
            // The player may still be starting up, so give it a grace period
            // before the watcher gives up on this episode.
            if (Date.now() - state.lastSeenAt > PLAYER_STARTUP_GRACE_MS) stopPlaybackWatcher();
            return;
        }
        bindPlaybackVideo(generation, context, state, video);
        var position = Number(video.currentTime) || 0;
        var duration = Number(video.duration) || 0;
        var finalState = video.paused || video.ended || duration > 0 && position >= duration - 2;
        storeObservedPlayback(generation, context, state, {current: position, duration: duration}, finalState);
        if (state.recoveryAttempts > 0 && !video.paused && !video.ended &&
            position >= state.recoveryBaselinePosition + INTERNAL_PLAYBACK_RECOVERY_READY_SECONDS) {
            // A few seconds of advancing playback mean the refreshed stream is
            // healthy. Future, unrelated interruptions get a fresh bounded
            // retry budget instead of inheriting attempts from an old outage.
            state.recoveryAttempts = 0;
            state.recoveryBaselinePosition = position;
            context.selected.yani_internal_recovery = 0;
        }

        var cvhSource = isCvhPlaybackSource(videoResolverUrl(context.selected), context.group);
        if (cvhSource && !video.paused && !video.ended && !state.recovering &&
            state.recoveryAttempts < INTERNAL_PLAYBACK_RECOVERY_LIMIT) {
            var now = Date.now();
            var startupStalled = position <= 0.25 && now - state.startedAt >= CVH_STARTUP_STALL_MS;
            var playbackStalled = position > 0.25 && now - state.lastProgressAt >= CVH_PLAYBACK_STALL_MS;
            if (startupStalled || playbackStalled) {
                recoverInternalPlayback(generation, context, state, {
                    fatal: true,
                    current: position,
                    duration: duration,
                    reason: startupStalled ? 'cvh-startup-stall' : 'cvh-playback-stall'
                });
                return;
            }
        }

        if (state.skipMode !== 'off' && duration >= 60) {
            var rounded = Math.round(duration);
            if (!state.skipLoading && (!state.skipReady || Math.abs((state.skipLength || 0) - rounded) > 15)) {
                state.segments = [];
                hideSkipPrompt();
                loadSkipSegments(generation, context, state, state.skipMode, rounded);
            }
        }

        var activePrompt = null;
        state.segments.forEach(function (segment) {
            if (state.skipped[segment.type]) return;
            var inside = position >= segment.interval.start && position < segment.interval.end - 1;
            if (state.skipPrompt) {
                if (inside) activePrompt = segment;
                return;
            }
            if (!inside) return;
            applySkip(video, segment, state);
        });
        if (state.skipPrompt) {
            if (activePrompt) showSkipPrompt(activePrompt, video);
            else hideSkipPrompt();
        }

        if (!state.autoNext || duration < 60 || position <= 0) return;
        var remaining = duration - position;
        if (!state.prefetched && remaining <= NEXT_PREFETCH_LEAD) {
            state.prefetched = true;
            prefetchNextEpisode(context);
        }
        if (!state.advanced && video.ended) {
            advancePlaybackWatcher(generation, context, state);
        }
    }

    function videoIdentity(video) {
        if (!video) return '';
        return String(video.video_id || video.id || '') + ':' + window.LampaYaniEpisode.key(window.LampaYaniEpisode.valueOf(video)) + ':' + String(videoSourceUrl(video) || '');
    }

    function nextEpisodeVideo(context) {
        var videos = (context && context.videos) || [];
        var selected = context && context.selected;
        if (!selected || !videos.length) return null;
        var index = videos.indexOf(selected);
        if (index < 0) {
            var selectedId = videoIdentity(selected);
            for (var i = 0; i < videos.length; i++) {
                if (videoIdentity(videos[i]) === selectedId) {
                    index = i;
                    break;
                }
            }
        }
        if (index < 0 || index + 1 >= videos.length) return null;
        return videos[index + 1];
    }

    // Resolving a stream costs a round trip through the source's player page,
    // which is long enough to be noticeable between episodes. Doing it while
    // the current episode still plays hides that entirely, and the resolver
    // caches the result for the launch that follows.
    function prefetchNextEpisode(context) {
        var next = nextEpisodeVideo(context);
        if (!next || next.yani_stream_url) return;
        var url = videoSourceUrl(next);
        if (!url || isExternalPlayableUrl(url, next)) return;
        if (!window.LampaYaniStreamResolver || !LampaYaniStreamResolver.canResolve(url)) return;
        next.yani_stream_origin = url;
        LampaYaniStreamResolver.resolve(url, next).then(function (result) {
            if (!result || !result.url) return;
            next.yani_stream_url = result.url;
            next.yani_stream_quality = result.quality || '';
            next.yani_stream_qualities = result.qualities || null;
            next.yani_stream_source = result.source || '';
            next.yani_stream_headers = result.headers || null;
            next.yani_stream_headers_required = Boolean(result.headersRequired);
        }).catch(function (error) {
            // The episode is launched normally later; a failed prefetch only
            // costs the time it would have saved.
            console.warn('[YummyAnime] Next episode prefetch failed', error);
        });
    }

    // Handing the running player to Lampa's own teardown before starting the
    // next episode. Playing on top of it instead leaves the previous <video>
    // and its MediaSource alive, because Lampa only releases the player it
    // considers current — so every automatic advance stranded one more hardware
    // decoder, and after eight to ten of them the renderer died. Measured: each
    // advance added one live video and one live MediaSource, none of which were
    // ever closed, while a manual launch released both every time.
    function releasePlaybackVideo(video) {
        if (!video) return;
        try { video.pause(); } catch (ignorePause) {}
        try {
            video.removeAttribute('src');
            Array.prototype.forEach.call(video.querySelectorAll('source'), function (source) {
                source.removeAttribute('src');
            });
            if (video.load) video.load();
        } catch (error) {
            console.warn('[YummyAnime] Could not release the previous video element', error);
        }
    }

    function waitForInternalPlayerTeardown(video) {
        var started = Date.now();
        return new Promise(function (resolve) {
            function finish() {
                setTimeout(resolve, PLAYER_CLOSE_SETTLE_MS);
            }
            function check() {
                if (!video || !document.documentElement.contains(video)) {
                    finish();
                    return;
                }
                if (Date.now() - started >= PLAYER_CLOSE_TIMEOUT_MS) {
                    // A few Lampa builds leave the closed video in the DOM on
                    // slower devices. Explicitly clearing its source releases
                    // the MediaSource and hardware decoder before the next one.
                    releasePlaybackVideo(video);
                    finish();
                    return;
                }
                setTimeout(check, PLAYER_CLOSE_POLL_MS);
            }
            setTimeout(check, PLAYER_CLOSE_POLL_MS);
        });
    }

    function closeInternalPlayer(video) {
        var closingVideo = video || playerVideoElement();
        try {
            if (Lampa.Player && Lampa.Player.close) Lampa.Player.close();
        } catch (error) {
            console.warn('[YummyAnime] Could not close the player before advancing', error);
        }
        return waitForInternalPlayerTeardown(closingVideo);
    }

    function titleAiredCount(card) {
        var episodes = card && card.yani_episodes || {};
        return Math.max(0, Number(episodes.aired || episodes.released || episodes.count || episodes.total || 0));
    }

    function autoNextEndMessage(context) {
        var selected = context && context.selected;
        var number = window.LampaYaniEpisode && window.LampaYaniEpisode.number
            ? window.LampaYaniEpisode.number(window.LampaYaniEpisode.valueOf(selected))
            : Number(selected && (selected.number || selected.index) || 0);
        var aired = titleAiredCount(context && context.card);
        if (aired > 0 && isFinite(number) && number >= aired) return t('auto_next_last_title');
        return t('auto_next_last_voice');
    }

    function finishAutoNextPlayback(context, closingVideo) {
        Lampa.Noty.show(autoNextEndMessage(context));
        flushPlaybackProgress(true, context);
        closeInternalPlayer(closingVideo).then(function () {
            restorePlaybackInteraction();
        });
    }

    function advanceToNextEpisode(context, closingVideo) {
        var next = nextEpisodeVideo(context);
        if (!next) {
            finishAutoNextPlayback(context, closingVideo);
            return;
        }
        Lampa.Noty.show(t('auto_next_starting') + ' ' + (next.number || next.index || ''));
        // Bumping the return session first: closing the player schedules a
        // focus restore back to the detail page, which must not fire while the
        // next episode is opening.
        beginPlaybackNavigation();
        var handoffSession = playbackReturnState.session;
        closeInternalPlayer(closingVideo).then(function () {
            if (playbackReturnState.session !== handoffSession || playbackContext !== context) return;
            launchVideo(context.card, context.group, context.videos, next, {autoAdvance: true});
        });
    }

    function externalPlayablePlaylist(playlist) {
        return (playlist || []).filter(function (item) { return isExternalPlayableUrl(item.url, item.source); });
    }

    function videoStreamHeaders(video) {
        if (!video) return null;
        var data = LampaYaniUiUtils.videoData(video);
        return video.yani_stream_headers || data.yani_stream_headers || null;
    }

    function videoStreamQualities(video) {
        if (!video) return null;
        var data = LampaYaniUiUtils.videoData(video);
        return video.yani_stream_qualities || data.yani_stream_qualities || null;
    }

    function isDirectVideoUrl(url) {
        return /\.(m3u8|mpd|mp4|webm)(?:[?#].*)?$/i.test(String(url || ''));
    }

    function isExternalPlayableUrl(url, source) {
        return isDirectVideoUrl(url) || !!(source && source.yani_stream_url && source.yani_stream_url === url);
    }

    function isKodikUrl(url) {
        return /(^|\/\/)(?:www\.)?kodik\.(?:info|cc|biz|site|com|tv)(?:[/:]|$)/i.test(url || '');
    }

    function isAllohaUrl(url) {
        return /(^|\/\/)(?:www\.)?alloha(?:\.[a-z0-9-]+)+(?::\d+)?(?:[/:]|$)/i.test(url || '');
    }

    function isVkPlaybackSource(url, group) {
        var data = group ? LampaYaniUiUtils.videoData(group) : {};
        var value = String(url || '') + ' ' + String(group && (group.player || group.title || group.source || group.yani_stream_source) || '') +
            ' ' + String(data.yani_stream_source || data.player || '');
        return /iframevk|vkvideo|vk\.com|video_ext\.php|(?:^|\s)vk(?:\s|$)/i.test(value);
    }

    function isSibnetPlaybackSource(url, group) {
        var data = group ? LampaYaniUiUtils.videoData(group) : {};
        var value = String(url || '') + ' ' + String(group && (group.player || group.title || group.source || group.yani_stream_source) || '') +
            ' ' + String(data.yani_stream_source || data.player || '');
        return /video\.sibnet\.ru|(?:^|\s)sibnet(?:\s|$)/i.test(value);
    }

    function isCvhPlaybackSource(url, group) {
        var data = group ? LampaYaniUiUtils.videoData(group) : {};
        var value = String(url || '') + ' ' + String(group && (group.player || group.title || group.source || group.yani_stream_source) || '') +
            ' ' + String(data.yani_stream_source || data.player || '');
        return /iframecvh|cdnvideohub|(?:^|\s)cvh(?:\s|$)/i.test(value);
    }


    function videoQualityLabel(video) {
        var data = LampaYaniUiUtils.videoData(video);
        var values = [video && video.yani_stream_quality, video && video.quality, video && video.resolution, data.quality, data.resolution, videoSourceUrl(video)];
        var best = 0;
        values.forEach(function (value) {
            var text = String(value || '');
            var match = text.match(/(2160|1440|1080|720|576|480|360)\s*p?/i);
            if (match) best = Math.max(best, Number(match[1]));
            if (/4k/i.test(text)) best = Math.max(best, 2160);
        });
        return best >= 2160 ? '4K' : best ? best + 'p' : '';
    }

    function getPreferredPlayer() {
        if (!Lampa.Storage) return '';
        var source = window.LampaYaniPlaybackPreferences && LampaYaniPlaybackPreferences.defaults().source;
        return source && source !== 'auto' ? source : Lampa.Storage.get('yani_last_player', '') || '';
    }

    function playerMatchesPreference(group, preference) {
        if (!preference) return false;
        var value = String(group && (group.player || group.title) || '').toLowerCase();
        return value.indexOf(String(preference).toLowerCase()) >= 0;
    }

    function rememberPlayer(group) {
        if (Lampa.Storage) Lampa.Storage.set('yani_last_player', playerKey(group));
    }

    function episodeOptionTitle(card, video) {
        var number = window.LampaYaniEpisode.valueOf(video) || '?';
        var parts = [t('episode') + ' ' + number];
        var quality = videoQualityLabel(video);
        if (quality) parts.push(quality);
        if (video.yani_episode_title) parts.push(video.yani_episode_title);
        if (Number(video.duration) > 0) parts.push(Math.max(1, Math.round(Number(video.duration) / 60)) + ' ' + t('minutes_short'));
        if (Number(video.views) > 0) parts.push(formatCompactNumber(video.views) + ' ' + t('views_short'));
        var playback = getPlayback(card && card.yani_id);
        return (playback && window.LampaYaniEpisode.same(playback.number, number) ? '▶ ' : '') + parts.join(' · ');
    }

    function formatCompactNumber(value) {
        value = Number(value) || 0;
        if (value >= 1000000) return (value / 1000000).toFixed(value >= 10000000 ? 0 : 1).replace('.0', '') + t('million_short');
        if (value >= 1000) return (value / 1000).toFixed(value >= 10000 ? 0 : 1).replace('.0', '') + t('thousand_short');
        return String(value);
    }

    function IframePlayer(object) {
        return LampaYaniPlayer.create(object, {
            t: t,
            // Only Android handles Back outside the web page; everywhere else a
            // focus inside the frame would swallow the way out. See ui-player.
            handOverFocus: isAndroidPlatform(),
            sourceUrl: function (item) { return videoSourceUrl(item) || item && item.iframe_url || ''; },
            goBack: function () {
                goBack();
                setTimeout(function () {
                    restorePlaybackInteraction(object && object.return_snapshot, {timeout: 2400, interval: 120});
                }, 80);
            }
        });
    }

    function openGenres() {
        Lampa.Activity.push({
            url: 'yani/genres',
            title: 'YummyAnime ' + t('genres'),
            component: 'yani_genres'
        });
    }

    var genreHubRows = null;
    var genreHubRowsAt = 0;
    var genreHubRequest = null;
    var genreList = null;
    var genreListAt = 0;
    var genreListRequest = null;
    var GENRE_HUB_TTL = 15 * 60 * 1000;
    var GENRE_HUB_CONCURRENCY = 8;

    function loadGenreList() {
        if (genreList && Date.now() - genreListAt < GENRE_HUB_TTL) {
            LampaYaniApi.genres().catch(function () {});
            return Promise.resolve(genreList);
        }
        if (genreListRequest) return genreListRequest;
        genreListRequest = LampaYaniApi.genres().then(function (payload) {
            var genres = LampaYaniApi.normalizeGenres(payload).filter(function (genre) {
                return genreTitle(genre) && genreValue(genre) !== null;
            });
            if (!genres.length) Lampa.Noty.show(t('genres_empty'));
            genreList = genres;
            genreListAt = Date.now();
            genreListRequest = null;
            return genres;
        }).catch(function (error) {
            genreListRequest = null;
            throw error;
        });
        return genreListRequest;
    }

    function genreTilePoster(title, index) {
        var raw = String(title || '');
        var display = raw.length > 24 ? raw.slice(0, 23) + '…' : raw;
        var label = display.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        var size = display.length > 20 ? 25 : display.length > 15 ? 28 : 34;
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="440" height="200" viewBox="0 0 440 200">' +
            '<rect x="1" y="1" width="438" height="198" rx="12" fill="#333333" stroke="#474747" stroke-width="2"/>' +
            '<text x="28" y="112" fill="#f1f1f1" font-family="sans-serif" font-size="' + size + '" font-weight="600">' + label + '</text></svg>';
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

    function genreTilesRow(genres) {
        var cards = (genres || []).map(function (genre, index) {
            var title = genreTitle(genre);
            var poster = genreTilePoster(title, index);
            return {
                title: title,
                poster: poster,
                img: poster,
                yani_genre_tile: true,
                yani_genre: genre
            };
        });
        return {
            title: t('genre_tiles') + ' · ' + cards.length,
            yani_genre_tiles: true,
            results: cards,
            nomore: true
        };
    }

    function createGenreRowLoader() {
        function loadGenreRows(page) {
            if (Number(page || 0) > 0) return Promise.resolve([]);
            return loadGenreList().then(function (genres) {
                var tiles = genreTilesRow(genres);
                if (genreHubRows && Date.now() - genreHubRowsAt < GENRE_HUB_TTL) return [tiles].concat(genreHubRows);
                if (genreHubRequest) return genreHubRequest.then(function (rows) { return [tiles].concat(rows); });
                genreHubRequest = Promise.resolve().then(function () {
                    return LampaYaniCardRails.mapLimit(genres, GENRE_HUB_CONCURRENCY, function (genre) {
                        var id = genreValue(genre);
                        return LampaYaniApi.catalog({limit: 10, genres: id, sort: 'top', sort_forward: true}, {
                            cacheTtl: GENRE_HUB_TTL,
                            cacheFirst: true,
                            staleFallback: true
                        }).then(function (payload) {
                            var items = LampaYaniApi.normalize(payload).slice(0, 10);
                            if (!items.length) return null;
                            return {
                                title: genreTitle(genre),
                                results: items.map(toCard),
                                onMore: function () { openGenreCatalog(genre); },
                                visual: {
                                    from: '#ff6878',
                                    to: '#825ed8',
                                    icon: '<path d="M4 6h16M4 12h16M4 18h16"/>'
                                }
                            };
                        }).catch(function () { return null; });
                    });
                }).then(function (rows) {
                    genreHubRows = (rows || []).filter(Boolean);
                    genreHubRowsAt = Date.now();
                    genreHubRequest = null;
                    return genreHubRows;
                }).catch(function (error) {
                    genreHubRequest = null;
                    throw error;
                });
                return genreHubRequest.then(function (rows) { return [tiles].concat(rows); });
            });
        }

        return loadGenreRows;
    }

    function genreTitle(genre) {
        return typeof genre === 'string' ? genre : genre && (genre.title || genre.name || genre.label || genre.alias) || '';
    }

    function genreValue(genre) {
        if (typeof genre === 'string') return genre;
        if (!genre) return null;
        var value = genre.value;
        if (value === undefined || value === null || value === '') value = genre.id;
        if (value === undefined || value === null || value === '') value = genre.href;
        if (value === undefined || value === null || value === '') value = genre.alias;
        if (value === undefined || value === null || value === '') value = genre.slug;
        return value === undefined || value === null || value === '' ? null : value;
    }

    function genreDescription(genre) {
        if (!genre || typeof genre === 'string') return '';
        var value = genre.description || genre.desc || genre.about || genre.text || genre.content || genre.seo_description || '';
        if (value && typeof value === 'object') {
            var language = String(locale() || 'ru').slice(0, 2);
            value = value[language] || value.ru || value.en || value.uk || value.text || '';
        }
        value = String(value || '').replace(/<[^>]+>/g, ' ');
        if (value && typeof document !== 'undefined') {
            var decoder = document.createElement('textarea');
            decoder.innerHTML = value;
            value = decoder.value;
        }
        value = value.replace(/\s+/g, ' ').trim();
        if (!value && window.LampaYaniGenreDescriptions) value = LampaYaniGenreDescriptions.resolve(genre, locale());
        return value;
    }

    function detailGenres(card) {
        var raw = card && (card.yani_genres || card.genres || card.genre) || [];
        if (!Array.isArray(raw)) raw = raw && (raw.items || raw.data || raw.genres) || [];
        var seen = {};
        return raw.filter(function (genre) {
            var title = genreTitle(genre), value = genreValue(genre), key = String(value === null ? title : value);
            if (!title || value === null || seen[key]) return false;
            seen[key] = true;
            return true;
        });
    }

    function openGenreCatalog(genre, value) {
        var context = typeof genre === 'object' && genre ? Object.assign({}, genre) : {title: genre, value: value};
        var title = genreTitle(context);
        var genreId = genreValue(context);
        if (!title || genreId === null) return;
        if (!beginTileNavigation('genre:' + String(genreId))) return;
        Lampa.Activity.push({
            url: 'yani/genre/' + encodeURIComponent(genreId),
            title: title,
            component: 'yani_catalog',
            genre_context: context,
            params: {limit: 30, genres: genreId}
        });
    }

    function pushSubjectCatalog(kind, subject) {
        var id = subject && subject.id;
        var title = String(subject && (subject.title || subject.name) || '').trim();
        if (!title || id === undefined || id === null) return;
        var context = Object.assign({}, subject, {kind: kind, title: title});
        if (!beginTileNavigation(kind + ':' + String(id))) return;
        var params = {limit: 30};
        params[kind === 'studio' ? 'studio_ids' : 'director_ids'] = id;
        Lampa.Activity.push({
            url: 'yani/' + kind + '/' + encodeURIComponent(id),
            title: title,
            component: 'yani_catalog',
            subject_context: context,
            params: params
        });
    }

    function openSubjectCatalog(kind, subject) {
        if (!subject) return;
        if (subject.id !== undefined && subject.id !== null) return pushSubjectCatalog(kind, subject);
        if (kind !== 'studio' || !subject.url) return;
        LampaYaniApi.studio(subject.url).then(function (payload) {
            var detailed = payload && payload.response ? payload.response : payload;
            pushSubjectCatalog(kind, Object.assign({}, subject, detailed || {}));
        }).catch(function (error) {
            console.error('[YummyAnime] Studio details failed', error);
            Lampa.Noty.show(t('catalog_load_error'));
        });
    }

    function openSearch() {
        getSearchController().open();
    }

    function openAccount() {
        Lampa.Activity.push({url: 'yani/account', title: 'YummyAnime ' + t('account'), component: 'yani_account'});
    }

    function openCollections() {
        Lampa.Activity.push({url: 'yani/collections', title: 'YummyAnime ' + t('collections'), component: 'yani_collections'});
    }

    function openCollection(collection) {
        if (!collection || collection.id === undefined || collection.id === null) return;
        if (!beginTileNavigation('collection:' + String(collection.id))) return;
        Lampa.Activity.push({
            url: 'yani/collection/' + encodeURIComponent(collection.id),
            title: collection.title || t('collection'),
            component: 'yani_collection',
            collectionId: collection.id
        });
    }

    function openEmbeddedTrailer(url, title) {
        url = LampaYaniUiUtils.normalizeVideoUrl(url);
        if (!url) return false;
        try {
            Lampa.Activity.push({
                url: 'yani/player',
                title: title || t('trailers'),
                component: 'yani_player',
                iframe_url: url
            });
            return true;
        } catch (error) {
            console.warn('[YummyAnime] Embedded trailer failed to open', error);
            return false;
        }
    }

    function openExternalVideo(url, title, options) {
        options = options || {};
        url = options.youtubeIntent ? externalTrailerUrl(url) : LampaYaniUiUtils.normalizeVideoUrl(url);
        if (options.requireDirect && !isExternalPlayableUrl(url, options.source)) return false;
        var playlist = Array.isArray(options.playlist) ? options.playlist.map(function (item) {
            return {
                title: cleanPlaybackTitle(item.title),
                url: item.url,
                time: Number(item.time || 0),
                headers: item.headers || null,
                quality: item.quality || null
            };
        }).filter(function (item) { return item.url; }) : [];
        var payload = {
            title: cleanPlaybackTitle(title || 'YummyAnime'),
            url: url,
            poster: options.poster || '',
            time: Number(options.time || 0),
            playlist: playlist,
            headers: options.headers || null,
            quality: options.quality || null
        };
        if (!options.youtubeIntent) {
            if (tryExternalOpen('Lampa.Android.openPlayer', function () {
                if (!Lampa.Android || !Lampa.Android.openPlayer) return false;
                prepareExternalRestore();
                Lampa.Android.openPlayer(url, payload);
                return true;
            })) return true;
            if (tryExternalOpen('Android.openPlayer', function () {
                if (!window.Android || typeof Android.openPlayer !== 'function') return false;
                prepareExternalRestore();
                Android.openPlayer(url, JSON.stringify(payload));
                return true;
            })) return true;
            if (tryExternalOpen('AndroidJS.openPlayer', function () {
                if (!window.AndroidJS || typeof AndroidJS.openPlayer !== 'function') return false;
                prepareExternalRestore();
                AndroidJS.openPlayer(url, JSON.stringify(payload));
                return true;
            })) return true;
        }
        // A plain https YouTube URL, not a hand-built `intent://...package=
        // com.google.android.youtube...end` string. That form only resolves if
        // whoever receives it calls Android's own `Intent.parseUri(url,
        // URI_INTENT_SCHEME)` before starting it; Lampa's native "open
        // browser" bridges instead do a plain `Uri.parse` + ACTION_VIEW, which
        // has no handler for a literal "intent" scheme and surfaces as "No
        // application can perform this action" - exactly the failure this was
        // written to work around. A verified https:// link needs none of that:
        // Android's own package manager already routes it to the installed
        // YouTube app via App Links, which is also how YummyTV opens trailers
        // (see ExternalIntentUtils.kt - a plain ACTION_VIEW + CATEGORY_BROWSABLE
        // on the unmodified URL, no intent-URI construction at all).
        if (options.youtubeIntent && openAndroidAppUri(url)) return true;
        return openExternalUri(url);
    }

    function openExternalUri(externalUrl) {
        if (!externalUrl) return false;
        if (tryExternalOpen('Lampa.External.open', function () {
            if (!Lampa.External || !Lampa.External.open) return false;
            prepareExternalRestore();
            Lampa.External.open(externalUrl);
            return true;
        })) return true;
        if (tryExternalOpen('Lampa.Utils.open', function () {
            if (!Lampa.Utils || !Lampa.Utils.open) return false;
            prepareExternalRestore();
            Lampa.Utils.open(externalUrl);
            return true;
        })) return true;
        if (tryExternalOpen('navigator.app.loadUrl', function () {
            if (!window.navigator || !navigator.app || !navigator.app.loadUrl) return false;
            prepareExternalRestore();
            navigator.app.loadUrl(externalUrl, {openExternal: true});
            return true;
        })) return true;
        if (tryExternalOpen('window.open', function () {
            if (!window.open) return false;
            prepareExternalRestore();
            window.open(externalUrl, '_system');
            return true;
        })) return true;
        cancelExternalRestore();
        return false;
    }

    function yummyTvEnabled() {
        if (!isAndroidTvPlatform()) return false;
        if (!Lampa.Storage || !Lampa.Storage.get) return false;
        var value = Lampa.Storage.get('yani_yummytv_enabled', false);
        return value === true || value === 'true' || value === 1 || value === '1';
    }

    function yummyTvAnimeId(card) {
        return card && (card.yani_id || card.anime_id || card.yummy_id);
    }

    function openYummyTv(card) {
        if (!yummyTvEnabled()) return false;
        var url = LampaYaniUiUtils.yummyTvDetailsUrl(yummyTvAnimeId(card));
        if (!url) {
            Lampa.Noty.show(t('yummytv_id_missing'));
            return false;
        }
        if (openAndroidAppUri(url)) return true;
        Lampa.Noty.show(t('yummytv_open_failed'));
        return false;
    }

    function openAndroidAppUri(url) {
        if (!url) return false;
        if (tryExternalOpen('Lampa.Android.openBrowser', function () {
            if (!Lampa.Android || typeof Lampa.Android.openBrowser !== 'function') return false;
            prepareExternalRestore();
            Lampa.Android.openBrowser(url);
            return true;
        })) return true;
        if (tryExternalOpen('AndroidJS.openBrowser', function () {
            if (!window.AndroidJS || typeof AndroidJS.openBrowser !== 'function') return false;
            prepareExternalRestore();
            AndroidJS.openBrowser(url);
            return true;
        })) return true;
        if (tryExternalOpen('Android.openBrowser', function () {
            if (!window.Android || typeof Android.openBrowser !== 'function') return false;
            prepareExternalRestore();
            Android.openBrowser(url);
            return true;
        })) return true;
        cancelExternalRestore();
        return false;
    }

    function prepareExternalRestore() {
        installExternalRestoreHooks();
        if (!playbackReturnState.active) beginPlaybackNavigation();
        var origin = playbackReturnSnapshot();
        externalRestoreState.pending = true;
        externalRestoreState.session = playbackReturnState.session;
        externalRestoreState.openedAt = Date.now();
        externalRestoreState.departed = false;
        externalRestoreState.controller = origin.controller;
        externalRestoreState.element = origin.element;
        externalRestoreState.collection = origin.collection;
        // Some Android launchers show their chooser without emitting blur or
        // Cordova pause. A delayed check prevents the underlying detail page
        // from remaining attached to a stale Select controller in that case.
        setTimeout(restoreExternalFocus, 1500);
    }

    function cancelExternalRestore() {
        externalRestoreState.pending = false;
        externalRestoreState.session = 0;
        externalRestoreState.departed = false;
        externalRestoreState.openedAt = 0;
        externalRestoreState.element = null;
        externalRestoreState.collection = null;
    }

    function installExternalRestoreHooks() {
        if (externalRestoreState.installed) return;
        externalRestoreState.installed = true;
        window.addEventListener('blur', markExternalDeparture, false);
        window.addEventListener('focus', restoreExternalFocus, false);
        window.addEventListener('pageshow', restoreExternalFocus, false);
        document.addEventListener('pause', markExternalDeparture, false);
        document.addEventListener('resume', function () {
            externalRestoreState.departed = true;
            restoreExternalFocus();
        }, false);
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) markExternalDeparture();
            else restoreExternalFocus();
        }, false);
    }

    function markExternalDeparture() {
        if (externalRestoreState.pending) externalRestoreState.departed = true;
    }

    function currentControllerName() {
        try {
            var enabled = Lampa.Controller && Lampa.Controller.enabled ? Lampa.Controller.enabled() : null;
            return enabled && enabled.name || '';
        } catch (ignore) {
            return '';
        }
    }

    function restoreExternalFocus() {
        if (!externalRestoreState.pending) return;
        // The active playback-return state is the state we must restore. Only
        // cancel when it was already completed or a newer playback session won.
        if (!playbackReturnState.active || playbackReturnState.session !== externalRestoreState.session) {
            cancelExternalRestore();
            return;
        }
        var elapsed = Date.now() - externalRestoreState.openedAt;
        // Android may emit focus while the chooser is only starting. Ignore
        // that event until the app departed or enough time has passed.
        if (!externalRestoreState.departed && elapsed < 1200) {
            setTimeout(restoreExternalFocus, 1200 - elapsed);
            return;
        }
        var delay = Math.max(0, 250 - elapsed);
        setTimeout(function () {
            if (!externalRestoreState.pending) return;
            if (!playbackReturnState.active || playbackReturnState.session !== externalRestoreState.session) {
                cancelExternalRestore();
                return;
            }
            var snapshot = {
                controller: externalRestoreState.controller || 'content',
                element: externalRestoreState.element,
                collection: externalRestoreState.collection
            };
            cancelExternalRestore();
            restorePlaybackInteraction(snapshot, {timeout: 2400, interval: 120});
        }, delay);
    }

    function showExternalPlaybackOptions(card, options) {
        options = options || {};
        var items = [];
        var yummyTvUrl = yummyTvEnabled() ? LampaYaniUiUtils.yummyTvDetailsUrl(yummyTvAnimeId(card)) : '';
        if (options.url || options.onPlayer) {
            items.push({title: t('watch_in_player'), subtitle: t('watch_in_player_description'), action: 'player'});
        }
        if (yummyTvUrl) items.push({title: t('watch_in_yummytv'), subtitle: t('watch_in_yummytv_description'), action: 'yummytv'});
        if (!items.length || !Lampa.Select || !Lampa.Select.show) {
            if (options.onPlayer && options.onPlayer()) return true;
            if (yummyTvUrl && openYummyTv(card)) return true;
            Lampa.Noty.show(t('external_stream_unavailable'));
            restorePlaybackInteraction();
            return false;
        }
        showPlaybackSelect({
            title: t('choose_playback'),
            items: items,
            onSelect: function (item) {
                if (item && item.action === 'player') {
                    if (options.onPlayer && options.onPlayer()) return;
                    if (options.url && openExternalUri(options.url)) return;
                    Lampa.Noty.show(t('external_stream_unavailable'));
                    restorePlaybackInteraction();
                    return;
                }
                if (item && item.action === 'yummytv' && !openYummyTv(card)) restorePlaybackInteraction();
            }
        });
        return true;
    }

    function tryExternalOpen(name, callback) {
        try {
            return !!callback();
        } catch (error) {
            console.warn('[YummyAnime] Could not open trailer through ' + name, error);
            return false;
        }
    }

    function cleanPlaybackTitle(value) {
        return String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    function externalTrailerUrl(url) {
        var id = youtubeVideoId(url);
        return id ? 'https://www.youtube.com/watch?v=' + encodeURIComponent(id) : url;
    }

    function youtubeVideoId(url) {
        url = String(url || '');
        try {
            var parsed = new URL(url);
            var host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '');
            if (host === 'youtu.be') return parsed.pathname.replace(/^\/+/, '').split('/')[0] || '';
            if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
                if (parsed.searchParams.get('v')) return parsed.searchParams.get('v');
                var match = parsed.pathname.match(/\/(?:embed|shorts|v)\/([^/?#]+)/i);
                if (match) return match[1];
            }
        } catch (error) {
            var fallback = url.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*[&?])?v=|embed\/|shorts\/|v\/))([^&#?/]+)/i);
            return fallback ? fallback[1] : '';
        }
        return '';
    }

    function copyParams(params) {
        var copy = {};
        Object.keys(params || {}).forEach(function (key) {
            copy[key] = params[key];
        });
        return copy;
    }

    function mapUniqueCards(items, seen) {
        if (!Array.isArray(items)) items = items ? [items] : [];
        return items.map(toCard).filter(function (card) {
            var key = card.yani_id || card.yani_url || card.title;
            if (seen[key]) return false;
            seen[key] = true;
            return true;
        });
    }

    function refreshScaledCardLayout() {
        if (typeof document === 'undefined' || !window.$) return;
        $('[data-yani-card-id]').each(function () {
            var bounds = this.getBoundingClientRect();
            if (!bounds.width || bounds.bottom < 0 || bounds.top > window.innerHeight) return;
            syncCardOverlayLayout($(this), this.yaniBoundCard || this.card_data);
        });
    }

    var yummySettingsDefinitions = [];
    function addYummySetting(definition) {
        yummySettingsDefinitions.push(definition);
        Lampa.SettingsApi.addParam(definition);
    }

    function openPluginSettings() {
        if (!window.LampaYaniSettingsPage || !yummySettingsDefinitions.length) return Lampa.Settings.create('yani');
        Lampa.Activity.push({component: 'yani_settings', url: 'yani/settings', title: 'YummyAnime · ' + t('settings')});
    }

    function SettingsPage(object) {
        return LampaYaniSettingsPage.create(object, {
            t: t, definitions: function () { return yummySettingsDefinitions; },
            showSelect: showYummySelect, goBack: goBack
        });
    }

    function addSettings() {
        if (!Lampa.SettingsApi || !Lampa.SettingsApi.addComponent) return;
        yummySettingsDefinitions = [];
        migrateLegacyPlayerPreference();

        Lampa.SettingsApi.addComponent({
            component: 'yani',
            icon: '<svg viewBox="0 0 20 20"><path fill="currentColor" d="M18.45 0H1.55A1.55 1.55 0 000 1.55v16.9A1.54 1.54 0 001.55 20h16.9A1.55 1.55 0 0020 18.45V1.55A1.54 1.54 0 0018.45 0Zm-2.83 5.93-2.1 2.66-2.3-5.43a6.95 6.95 0 014.4 2.77Zm-2.9 6.57h-4l2.03-4.8 1.98 4.8Zm-2.37-9.34L7.8 9.06 4.87 5.33c.64-.7 1.4-1.26 2.27-1.65a8.18 8.18 0 013.2-.52ZM3.57 7.39l3.2 4.06-1.56 3.58A6.96 6.96 0 013.57 7.39Zm6.57 9.56c-1.05.01-2.1-.2-3.05-.65l.76-1.8h5.7l.49 1.15a6.93 6.93 0 01-3.9 1.3Zm6.8-7.07a7.8 7.8 0 01-1.17 4L14.55 11l2.17-2.77c.14.54.21 1.1.23 1.65Z"/></svg>',
            name: 'YummyAnime'
        });

        addYummySetting({
            component: 'yani',
            param: {name: 'yani_account_title', type: 'title'},
            field: {name: t('settings_account_section')}
        });

        // Keep this row stable: the account page reads the token on every render,
        // so sign-in and sign-out never leave stale conditional settings behind.
        authSettingsParamDefinition = {
            component: 'yani',
            param: {name: 'yani_account_state', type: 'button'},
            field: {name: t('auth_title'), description: settingsAuthDescription()},
            onRender: function (item) {
                syncSettingsAuthStatus(item);
            },
            onChange: openSettingsLogin
        };
        addYummySetting(authSettingsParamDefinition);
        addYummySetting({
            component: 'yani',
            param: {name: 'yani_auto_sync_progress', type: 'trigger', default: true},
            field: {name: t('auto_sync_progress'), description: t('auto_sync_progress_description')}
        });

        addYummySetting({
            component: 'yani',
            param: {name: 'yani_interface_title', type: 'title'},
            field: {name: t('settings_interface_section')}
        });

        addYummySetting({
            component: 'yani',
            param: {name: 'yani_language', type: 'select', values: {ru: 'Русский', uk: 'Українська', en: 'English'}, default: 'ru'},
            field: {name: t('language_name'), description: t('language_description')},
            onChange: function (value) {
                if (value && typeof value === 'object') value = value.value;
                LampaYaniI18n.setLanguage(value);
                Lampa.Noty.show(t('language_changed'));
            }
        });

        if (window.LampaYaniScale) {
            var scaleSetting = {
                component: 'yani',
                param: {name: 'yani_interface_scale', type: 'select', values: LampaYaniScale.values(t), default: 'auto'},
                field: {name: t('interface_scale'), description: t('interface_scale_description')},
                onRender: function () {
                    scaleSetting.param.values.auto = LampaYaniScale.values(t).auto;
                },
                onChange: function (value) { LampaYaniScale.apply(value); }
            };
            addYummySetting(scaleSetting);
        }

        addYummySetting({
            component: 'yani',
            param: {name: 'yani_playback_title', type: 'title'},
            field: {name: t('settings_playback_section')}
        });

        if (window.LampaYaniPlaybackPreferences) {
            var sourceValues = {auto: t('playback_auto')};
            PLAYBACK_SOURCE_IDS.forEach(function (id) { sourceValues[id] = playbackSourceLabel(id); });
            addYummySetting({
                component: 'yani',
                param: {name: 'yani_default_source', type: 'select', values: sourceValues, default: 'auto'},
                field: {name: t('playback_default_source'), description: t('playback_default_source_description')},
                onChange: function (value) { LampaYaniPlaybackPreferences.setDefaults({source: value && typeof value === 'object' ? value.value : value}); }
            });
            var voiceRow = null;
            function updateVoiceRow(item) {
                if (item) voiceRow = item;
                if (!voiceRow || !voiceRow.length) return;
                var value = voiceRow.find('.settings-param__value');
                if (!value.length) value = $('<div class="settings-param__value"></div>').appendTo(voiceRow);
                value.text(LampaYaniPlaybackPreferences.defaults().voice || t('playback_auto'));
            }
            addYummySetting({
                component: 'yani',
                param: {name: 'yani_default_voice', type: 'button'},
                field: {name: t('playback_default_voice'), description: t('playback_default_voice_description')},
                onRender: updateVoiceRow,
                onChange: function () {
                    var configured = LampaYaniPlaybackPreferences.defaults().voice;
                    var items = [{title: t('playback_auto'), voice: ''}].concat(LampaYaniPlaybackPreferences.knownVoices().map(function (voice) {
                        return {title: voice, voice: voice};
                    }), [{title: t('playback_enter_voice'), manual: true}]);
                    var selected = 0;
                    items.forEach(function (item, index) {
                        if (!item.manual && LampaYaniPlaybackPreferences.normalizeVoice(item.voice) === LampaYaniPlaybackPreferences.normalizeVoice(configured)) selected = index;
                    });
                    showYummySelect({
                        title: t('playback_default_voice'), items: items, selected: selected,
                        onSelect: function (item) {
                            if (item.manual) return showYummyInput({title: t('playback_enter_voice'), value: configured, nosave: true}, function (value) {
                                LampaYaniPlaybackPreferences.setDefaults({voice: value}); updateVoiceRow();
                            });
                            LampaYaniPlaybackPreferences.setDefaults({voice: item.voice}); updateVoiceRow();
                        }
                    });
                }
            });
        }

        if (isAndroidPlatform()) {
            addYummySetting({
                component: 'yani',
                param: {
                    name: 'yani_playback_target',
                    type: 'select',
                    values: {
                        ask: t('playback_target_ask'),
                        internal: t('playback_target_internal'),
                        external: t('playback_target_external')
                    },
                    default: 'ask'
                },
                field: {name: t('playback_target'), description: t('player_preference_description')}
            });
        } else {
            if (Lampa.Storage) Lampa.Storage.set('yani_playback_target', 'internal');
            addYummySetting({
                component: 'yani',
                param: {name: 'yani_playback_target_locked', type: 'button'},
                field: {
                    name: t('playback_target') + ': ' + t('playback_target_internal'),
                    description: t('player_preference_non_android_description')
                },
                onChange: function () {
                    Lampa.Noty.show(t('player_preference_non_android'));
                }
            });
        }

        addYummySetting({
            component: 'yani',
            param: {
                name: 'yani_aniskip',
                type: 'select',
                values: {off: t('aniskip_off'), op: t('aniskip_openings'), ed: t('aniskip_endings'), op_ed: t('aniskip_openings_endings'), suggest: t('aniskip_suggest')},
                default: 'off'
            },
            field: {name: t('aniskip'), description: t('aniskip_description')}
        });

        addYummySetting({
            component: 'yani',
            param: {name: 'yani_auto_next', type: 'trigger', default: false},
            field: {name: t('auto_next'), description: t('auto_next_description')}
        });

        addYummySetting({
            component: 'yani',
            param: {name: 'yani_add_to_lampa_history', type: 'trigger', default: true},
            field: {name: t('add_to_lampa_history'), description: t('add_to_lampa_history_description')}
        });

        addYummySetting({
            component: 'yani',
            param: {name: 'yani_clear_playback_history', type: 'button'},
            field: {name: t('clear_history'), description: t('clear_history_description')},
            onChange: function () {
                if (Lampa.Storage) Lampa.Storage.set('yani_playback_history', '{}');
                Lampa.Noty.show(t('history_cleared'));
            }
        });

        addYummySetting({
            component: 'yani',
            param: {name: 'yani_display_sources_title', type: 'title'},
            field: {name: t('display_sources'), description: t('display_sources_description')}
        });
        PLAYBACK_SOURCE_IDS.forEach(function (sourceId) {
            var label = playbackSourceLabel(sourceId);
            var storageKey = 'yani_source_' + sourceId;
            var experimental = EXPERIMENTAL_PLAYBACK_SOURCE_IDS.indexOf(sourceId) >= 0;
            addYummySetting({
                component: 'yani',
                param: {name: storageKey, type: 'trigger', default: playbackSourceDefaultEnabled(sourceId)},
                field: {
                    name: label,
                    description: sourceId === 'cvh' ? t('cvh_source_description') : sourceId === 'sibnet' ? t('sibnet_source_description') : experimental ? t('source_external_support_description') : t('source_visibility_description')
                },
                onChange: function (value) {
                    if (experimental && triggerSettingEnabled(value, storageKey, false)) {
                        var warning = sourceId === 'cvh' ? t('cvh_source_warning') : t('source_external_support_warning');
                        Lampa.Noty.show(String(warning).replace(/\{source\}/g, label));
                    }
                }
            });
        });

        addYummySetting({
            component: 'yani',
            param: {name: 'yani_playback_services_title', type: 'title'},
            field: {name: t('settings_integrations_section')}
        });

        if (isAndroidTvPlatform()) {
            addYummySetting({
                component: 'yani',
                param: {name: 'yani_yummytv_enabled', type: 'trigger', default: false},
                field: {name: t('yummytv_integration'), description: t('yummytv_integration_description')}
            });
        }

        var resolverUrl = window.LampaYaniResolver ? LampaYaniResolver.baseUrl() : '';
        addYummySetting({
            component: 'yani',
            param: {name: 'yani_resolver_server', type: 'button'},
            field: {
                name: t('resolver_server'),
                description: t('resolver_server_description') + ': ' + (resolverUrl || t('not_configured'))
            },
            onChange: editResolverServer
        });

        if (resolverUrl) {
            addYummySetting({
                component: 'yani',
                param: {name: 'yani_resolver_check', type: 'button'},
                field: {name: t('resolver_check'), description: t('resolver_check_description')},
                onChange: function () {
                    LampaYaniResolver.health().then(function (payload) {
                        Lampa.Noty.show(t('resolver_ok') + (payload && payload.version ? ' · v' + payload.version : ''));
                    }).catch(function (error) {
                        console.error('[YummyAnime]', error);
                        Lampa.Noty.show(t('resolver_error'));
                    });
                }
            });
        }

        var lampacUrl = window.LampaYaniLampacResolver ? LampaYaniLampacResolver.baseUrl() : '';
        addYummySetting({
            component: 'yani',
            param: {name: 'yani_lampac_server', type: 'button'},
            field: {
                name: t('lampac_server'),
                description: t('lampac_server_description') + ': ' + (lampacUrl || t('not_configured'))
            },
            onChange: editLampacServer
        });

        addYummySetting({
            component: 'yani',
            param: {name: 'yani_alloha_iframe', type: 'trigger', default: false},
            field: {name: t('alloha_iframe'), description: t('alloha_iframe_description')},
            onChange: function (value) {
                if (value === true || value === 'true') acknowledgeAllohaWebNotice();
            }
        });

        addYummySetting({
            component: 'yani',
            param: {name: 'yani_lampa_card_title', type: 'title'},
            field: {name: t('lampa_card_integration')}
        });

        addYummySetting({
            component: 'yani',
            param: {name: 'yani_lampa_card_rating', type: 'trigger', default: true},
            field: {name: t('lampa_card_rating'), description: t('lampa_card_rating_description')}
        });

        addYummySetting({
            component: 'yani',
            param: {name: 'yani_lampa_card_button', type: 'trigger', default: true},
            field: {name: t('lampa_card_button'), description: t('lampa_card_button_description')}
        });

        addYummySetting({
            component: 'yani',
            param: {name: 'yani_home_sections_title', type: 'title'},
            field: {name: t('home_sections')}
        });

        [
            ['catalog', 'catalog'],
            ['genres', 'genres'],
            ['search', 'search'],
            ['schedule', 'schedule'],
            ['new_translations', 'new_translations'],
            ['continue_watching', 'continue_watching'],
            ['user_lists', 'user_lists'],
            ['new_releases', 'new_releases'],
            ['top_rated', 'top_rated'],
            ['for_you', 'for_you'],
            ['updates', 'updates'],
            ['collections', 'collections'],
            ['notifications', 'notifications'],
            ['account', 'account'],
            ['status', 'status']
        ].forEach(function (section) {
            addYummySetting({
                component: 'yani',
                param: {name: 'yani_section_' + section[0], type: 'trigger', default: true},
                field: {name: t(section[1]), description: t('section_visibility_description')}
            });
        });

        addYummySetting({
            component: 'yani',
            param: {name: 'yani_build_title', type: 'title'},
            field: {name: t('settings_build_section')}
        });
        buildInfoRows().forEach(function (row) {
            addYummySetting({
                component: 'yani',
                param: {name: 'yani_build_' + row.key, type: 'title'},
                field: {name: row.label + ': ' + row.value}
            });
        });

        addYummySetting({
            component: 'yani',
            param: {name: 'yani_about_title', type: 'title'},
            field: {name: t('settings_about_section')}
        });

        addYummySetting({
            component: 'yani',
            param: {name: 'yani_about', type: 'button'},
            field: {
                name: t('version_name'),
                description: t('official_plugin') + ' · ' + t('version_label') + ' ' + LampaYaniConfig.version + ' · ' + t('website_description') + ': ' + yummyWebsiteUrl()
            },
            onChange: openYummyWebsite
        });

        addYummySetting({
            component: 'yani',
            param: {name: 'yani_usage_policy', type: 'button'},
            field: {name: t('usage_policy_title'), description: t('usage_policy_settings_description')},
            onChange: showUsagePolicy
        });

        // A title row is deliberately non-interactive: the repository URL is
        // reference text, not another settings action or external link.
        addYummySetting({
            component: 'yani',
            param: {name: 'yani_repo_notice', type: 'title'},
            field: {name: t('repo_notice')}
        });
    }

    // Read the artifact's build stamp, never the time at which Settings opens.
    function buildInfoRows(metadata) {
        var info = metadata || window.LampaYaniBuild || {};
        var commit = String(info.commit || info.shortCommit || '');
        if (!/^[a-f0-9]{7,64}$/i.test(commit)) commit = '';
        var commitLabel = commit ? commit.slice(0, 7) : t('build_not_available');
        if (info.dirty === true) commitLabel += ' · ' + t('build_local_changes');
        var date = info.builtAt ? new Date(info.builtAt) : null;
        var builtAt = date && isFinite(date.getTime())
            ? date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC') : t('build_not_available');
        var channel = {local: t('build_channel_local'), 'github-actions': t('build_channel_actions'), development: t('build_channel_development')};
        return [
            {key: 'version', label: t('build_version'), value: String(info.version || LampaYaniConfig.version || t('build_not_available'))},
            {key: 'commit', label: t('build_commit'), value: commitLabel},
            {key: 'time', label: t('build_time'), value: builtAt},
            {key: 'channel', label: t('build_channel'), value: Object.prototype.hasOwnProperty.call(channel, info.channel) ? channel[info.channel] : t('build_not_available')}
        ];
    }

    function yummyWebsiteUrl() {
        var language = LampaYaniI18n.getLanguage();
        return language === 'en' || language === 'uk' ? 'https://en.yummyani.me/' : 'https://ru.yummyani.me/';
    }

    function localizedAuthText(key) {
        return String(t(key) || '').replace(/\{site\}/g, yummyWebsiteUrl());
    }

    function settingsAuthDescription() {
        var status = LampaYaniAuth.token() ? t('auth_authorized') : t('auth_not_authorized');
        return t('settings_auth_status') + ': ' + status + ' · ' + localizedAuthText('auth_manage_description');
    }

    function syncSettingsAuthStatus(renderedItem) {
        var description = settingsAuthDescription();
        var authorized = Boolean(LampaYaniAuth.token());
        if (authSettingsParamDefinition) authSettingsParamDefinition.field.description = description;
        var rows = renderedItem && renderedItem.length ? renderedItem : $('.settings-param[data-name="yani_account_state"]');
        rows.each(function () {
            var row = $(this);
            var target = row.find('.settings-param__descr');
            if (target.length) target.text(description);
            else row.append($('<div class="settings-param__descr"></div>').text(description));
            row.toggleClass('yani-settings-auth--authorized', authorized);
        });
    }
    function yummyTitleUrl(card) {
        var slug = card && card.yani_url;
        if (!slug || typeof slug !== 'string') return '';
        if (/^https?:\/\//i.test(slug)) return slug;
        slug = slug.replace(/^\/+/, '').replace(/^catalog\/item\//i, '');
        return yummyWebsiteUrl().replace(/\/$/, '') + '/catalog/item/' + encodeURIComponent(slug);
    }

    function openYummyWebsite() {
        var url = yummyWebsiteUrl();
        if (Lampa.Browser && Lampa.Browser.open) return Lampa.Browser.open(url);
        if (Lampa.External && Lampa.External.open) return Lampa.External.open(url);
        if (Lampa.Utils && Lampa.Utils.open) return Lampa.Utils.open(url);
        if (window.open) return window.open(url, '_blank');
        Lampa.Noty.show(url);
    }

    function openSettingsLogin() {
        Lampa.Activity.push({
            url: 'yani/auth',
            title: 'YummyAnime · ' + t('auth_title'),
            component: 'yani_auth'
        });
    }

    function openAccountLogin() {
        Lampa.Activity.push({
            url: 'yani/auth',
            title: 'YummyAnime · ' + t('auth_title'),
            component: 'yani_auth',
            refresh_account_on_authorized: true
        });
    }

    var accountLogoutPending = false;
    function logoutFromAccount() {
        if (accountLogoutPending) return;
        accountLogoutPending = true;
        LampaYaniAuth.logout().then(function () {
            Lampa.Noty.show(t('logged_out'));
        }).catch(function (error) {
            console.error('[YummyAnime]', error);
            Lampa.Noty.show(t('token_removed'));
        }).then(function () {
            accountLogoutPending = false;
            syncSettingsAuthStatus();
            Lampa.Activity.replace({url: 'yani/account', title: 'YummyAnime ' + t('account'), component: 'yani_account'});
        });
    }

    function editLampacServer() {
        if (!window.LampaYaniLampacResolver) return Lampa.Noty.show(t('lampac_unavailable'));
        showYummyInput({
            title: t('lampac_server_prompt'),
            value: LampaYaniLampacResolver.baseUrl(),
            nosave: true
        }, function (value) {
            value = String(value || '').trim();
            var saved = LampaYaniLampacResolver.setBaseUrl(value);
            if (value && !saved) return Lampa.Noty.show(t('lampac_server_invalid'));
            Lampa.Noty.show(saved ? t('lampac_server_saved') : t('lampac_server_disabled'));
        });
    }

    function editResolverServer() {
        if (!window.LampaYaniResolver) return Lampa.Noty.show(t('resolver_unavailable'));
        showYummyInput({
            title: t('resolver_server_prompt'),
            value: LampaYaniResolver.baseUrl(),
            nosave: true
        }, function (value) {
            value = String(value || '').trim();
            var saved = LampaYaniResolver.setBaseUrl(value);
            if (value && !saved) return Lampa.Noty.show(t('resolver_server_invalid'));
            Lampa.Noty.show(saved ? t('resolver_server_saved') : t('resolver_server_disabled'));
        });
    }

    var inputActive = false;
    function showYummyInput(params, callback) {
        if (!Lampa.Input) {
            Lampa.Noty.show(t('input_unavailable'));
            return;
        }
        // Prevent double-showing input on some devices
        if (inputActive) return;
        var controller = currentControllerName();
        if (controller === 'input' || controller === 'keyboard') return;

        inputActive = true;
        var navigation = transientNavigationSnapshot();
        var inputParams = Object.assign({}, params || {});
        var originalBack = inputParams.onBack;
        var complete = function (value) {
            inputActive = false;
            var result = callback(value);
            setTimeout(function () {
                var ctrl = currentControllerName();
                if (!ctrl || ctrl === 'input' || ctrl === 'settings_component') {
                    restoreTransientInteraction(navigation);
                }
            }, 0);
            return result;
        };
        inputParams.onBack = function () {
            inputActive = false;
            if (originalBack) originalBack();
            restoreTransientInteraction(navigation);
        };
        // Prefer Input.edit — documented standard API in recent Lampa versions.
        // Input.show exists on some builds but can render duplicate UI components.
        if (typeof Lampa.Input.edit === 'function') {
            return Lampa.Input.edit(inputParams, complete);
        }
        if (typeof Lampa.Input.show === 'function') {
            inputParams.onEnter = complete;
            return Lampa.Input.show(inputParams);
        }
        inputActive = false;
        Lampa.Noty.show(t('input_unavailable'));
    }

    function commentsMenu(id, skip, existing, navigation) {
        skip = Number(skip || 0);
        existing = existing || [];
        navigation = navigation || transientNavigationSnapshot();
        if (Lampa.Loading && Lampa.Loading.start) Lampa.Loading.start();
        LampaYaniApi.comments(id, skip).then(function (payload) {
            if (Lampa.Loading && Lampa.Loading.stop) Lampa.Loading.stop();
            var page = LampaYaniApi.normalizeComments(payload);
            var comments = existing.concat(page);
            if (!comments.length) return Lampa.Noty.show(t('comments_empty'));
            renderCommentList(t('comments_title'), comments, page.length >= 20 ? function () {
                commentsMenu(id, skip + page.length, comments, navigation);
            } : null, null, navigation);
        }).catch(function (error) {
            if (Lampa.Loading && Lampa.Loading.stop) Lampa.Loading.stop();
            console.error('[YummyAnime Comments]', error);
            Lampa.Noty.show(t('comments_error'));
        });
    }

    function commentReplies(comment, skip, existing, onBack, navigation) {
        skip = Number(skip || 0);
        existing = existing || [];
        navigation = navigation || transientNavigationSnapshot();
        if (Lampa.Loading && Lampa.Loading.start) Lampa.Loading.start();
        LampaYaniApi.commentChildren(comment.id, skip).then(function (payload) {
            if (Lampa.Loading && Lampa.Loading.stop) Lampa.Loading.stop();
            var page = LampaYaniApi.normalizeComments(payload);
            var comments = existing.concat(page);
            if (!comments.length) return Lampa.Noty.show(t('comments_empty'));
            renderCommentList(t('replies_title'), comments, page.length >= 20 ? function () {
                commentReplies(comment, skip + page.length, comments, onBack, navigation);
            } : null, onBack, navigation);
        }).catch(function (error) {
            if (Lampa.Loading && Lampa.Loading.stop) Lampa.Loading.stop();
            console.error('[YummyAnime Comment Replies]', error);
            Lampa.Noty.show(t('comments_error'));
        });
    }

    function renderCommentList(title, comments, onMore, onBack, navigation) {
        navigation = navigation || transientNavigationSnapshot();
        var items = comments.map(commentItem);
        if (onMore) items.push({title: t('load_more'), load_more: true});
        var params = {
            title: title,
            items: items,
            onSelect: function (item) {
                if (item.load_more) return onMore();
                if (item.comment && Number(item.comment.children_count) > 0) {
                    return commentReplies(item.comment, 0, [], function () {
                        // Lampa closes the current Select after onBack. Reopen
                        // the parent on the next turn so that it is not removed
                        // together with the child dialog.
                        setTimeout(function () {
                            renderCommentList(title, comments, onMore, onBack, navigation);
                        }, 0);
                    }, navigation);
                }
            }
        };
        if (onBack) params.onBack = onBack;
        showYummySelect(params, navigation);
    }

    function commentItem(comment) {
        var author = comment.name || (comment.author && comment.author.name) || t('user');
        var text = cleanCommentText(comment.text || comment.body || '');
        var date = Number(comment.time) > 0 ? new Date(Number(comment.time) * 1000).toLocaleDateString(locale()) : '';
        var stats = [];
        if (Number(comment.likes) > 0) stats.push('♥ ' + comment.likes);
        if (Number(comment.dislikes) > 0) stats.push('−' + comment.dislikes);
        if (Number(comment.children_count) > 0) stats.push('↳ ' + comment.children_count + ' ' + t('replies'));
        return {
            title: author + (date ? ' · ' + date : '') + ': ' + text,
            subtitle: stats.join(' · '),
            comment: comment
        };
    }

    function cleanCommentText(text) {
        return String(text || '').replace(/\[ник\]([^[]+)\[\/ник\]/gi, '@$1').replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
    }

}(window));

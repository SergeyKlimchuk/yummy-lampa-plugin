(function (window) {
    'use strict';

    function videoItems(payload) {
        var value = payload && payload.response ? payload.response : payload || {};
        return Array.isArray(value.new_videos) ? value.new_videos : [];
    }

    function animeId(video) {
        video = video || {};
        return video.anime_id || video.animeId || video.anime && (video.anime.anime_id || video.anime.id) || '';
    }

    function latestEvents(payload) {
        var grouped = {};
        videoItems(payload).slice().sort(function (a, b) {
            return Number(b && b.date || 0) - Number(a && a.date || 0);
        }).forEach(function (video) {
            var id = String(animeId(video));
            if (!id) return;
            if (!grouped[id]) grouped[id] = {latest: video, count: 0};
            grouped[id].count += 1;
        });
        return Object.keys(grouped).map(function (id) { return grouped[id]; });
    }

    function label(video, additional) {
        var labels = [video.ep_title, video.dub_title, video.player_title].filter(Boolean);
        if (additional > 0) labels.push('+' + additional);
        return labels.join(' · ');
    }

    function normalize(payload, toCard) {
        return latestEvents(payload).map(function (group) {
            var video = group.latest;
            var card = toCard(video);
            card.yani_id = animeId(video);
            card.yani_update_date = Number(video.date || 0);
            card.yani_translation_count = group.count;
            card.yani_update_label = label(video, group.count - 1);
            card.overview = [video.description, video.dub_title, video.player_title].filter(Boolean).join(' · ');
            return card;
        }).filter(function (card) { return Boolean(card.yani_id); }).sort(function (a, b) {
            return Number(b.yani_update_date || 0) - Number(a.yani_update_date || 0);
        });
    }

    function component(object, deps) {
        object.page = 1;
        var comp = new Lampa.InteractionCategory(object);
        var destroyed = false, generation = 0, pageSize = 30, visibleCards = [], gridTitle = '';
        function buildGrid(self, cards, title) {
            visibleCards = cards;
            gridTitle = title;
            self.build({results: cards.slice(0, pageSize), total_pages: Math.max(1, Math.ceil(cards.length / pageSize)), title: title});
            if (self.render) self.render().addClass('yani-lite-view yani-translations-view');
        }
        comp.nextPageReuest = function (requestObject, resolve) {
            if (destroyed) return;
            var page = Math.max(2, Number(requestObject.page) || 2);
            resolve({results: visibleCards.slice((page - 1) * pageSize, page * pageSize), total_pages: Math.max(1, Math.ceil(visibleCards.length / pageSize)), title: gridTitle});
        };
        comp.nextPageRequest = comp.nextPageReuest;
        comp.create = function () {
            var self = this;
            var states = LampaYaniSectionState.forActivity(self.activity, deps);
            function load() {
                if (destroyed) return;
                var requestGeneration = ++generation;
                states.loading('cards');
                deps.feed().then(function (payload) {
                    if (destroyed || requestGeneration !== generation) return;
                    var cards = normalize(payload, deps.toCard);
                    if (!cards.length) {
                        states.empty({
                            title: deps.t('new_translations_empty'),
                            onRetry: load
                        });
                        self.activity.toggle();
                        states.focus();
                        return;
                    }
                    buildGrid(self, cards, deps.t('new_translations'));
                    if (LampaYaniSectionState.fromCache(payload)) states.cached({onRetry: load});
                    else states.ready();
                }).catch(function (error) {
                    if (destroyed || requestGeneration !== generation) return;
                    console.error('[YummyAnime New Translations]', error);
                    states.offline({
                        title: deps.t('new_translations_error'),
                        onRetry: load
                    });
                    self.activity.toggle();
                    states.focus();
                });
            }
            load();
        };
        comp.cardRender = deps.cardRender;
        var originalDestroy = comp.destroy;
        comp.destroy = function () {
            destroyed = true;
            generation++;
            visibleCards = [];
            if (originalDestroy) originalDestroy.apply(this, arguments);
        };
        return comp;
    }

    window.LampaYani = window.LampaYani || {};
    window.LampaYani.Translations = window.LampaYaniTranslations = {
        component: component,
        videoItems: videoItems,
        animeId: animeId,
        latestEvents: latestEvents,
        normalize: normalize
    };
}(window));

(function (window) {
    'use strict';

    function response(payload) {
        return payload && payload.response ? payload.response : payload || {};
    }

    function releaseItems(payload) {
        var value = response(payload);
        return Array.isArray(value.new) ? value.new : [];
    }

    function releaseLabel(item) {
        item = item || {};
        var status = item.anime_status && (item.anime_status.title || item.anime_status.alias) || '';
        var type = item.type && (item.type.name || item.type.shortname || item.type.alias) || '';
        return [status, type].filter(Boolean).join(' · ');
    }

    function normalize(payload, toCard) {
        var seen = {};
        return releaseItems(payload).map(function (item) {
            var card = toCard(item);
            var key = String(card && (card.yani_id || card.title) || '');
            if (!card || !card.yani_id || !key || seen[key]) return null;
            seen[key] = true;
            card.yani_update_label = releaseLabel(item);
            return card;
        }).filter(Boolean);
    }

    function component(object, deps) {
        object.page = 1;
        var comp = new Lampa.InteractionCategory(object);
        var destroyed = false, generation = 0, pageSize = 30, visibleCards = [], gridTitle = '';
        function buildGrid(self, cards, title) {
            visibleCards = cards;
            gridTitle = title;
            self.build({results: cards.slice(0, pageSize), total_pages: Math.max(1, Math.ceil(cards.length / pageSize)), title: title});
            if (self.render) self.render().addClass('yani-lite-view yani-releases-view');
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
                            title: deps.t('new_releases_empty'),
                            onRetry: load
                        });
                        self.activity.toggle();
                        states.focus();
                        return;
                    }
                    buildGrid(self, cards, deps.t('new_releases'));
                    if (LampaYaniSectionState.fromCache(payload)) states.cached({onRetry: load});
                    else states.ready();
                }).catch(function (error) {
                    if (destroyed || requestGeneration !== generation) return;
                    console.error('[YummyAnime New Releases]', error);
                    states.offline({
                        title: deps.t('new_releases_error'),
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
    window.LampaYani.Releases = window.LampaYaniReleases = {
        component: component,
        normalize: normalize,
        releaseItems: releaseItems,
        releaseLabel: releaseLabel
    };
}(window));

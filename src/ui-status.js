(function (window) {
    'use strict';

    // Each bar represents an interval. Keep its worst observed state so an
    // outage does not disappear when a long server snapshot is condensed.
    function compactHistory(points, limit) {
        points = Array.isArray(points) ? points : [];
        limit = Math.max(1, Number(limit) || 48);
        if (points.length <= limit) return points;
        var result = [], severity = {up: 0, unknown: 1, degraded: 2, down: 3};
        for (var index = 0; index < limit; index++) {
            var start = Math.floor(index * points.length / limit);
            var end = Math.floor((index + 1) * points.length / limit);
            var worst = points[start] || {};
            for (var cursor = start + 1; cursor < end; cursor++) {
                var point = points[cursor] || {};
                if (Number(severity[point.status] || 0) > Number(severity[worst.status] || 0)) worst = point;
            }
            result.push({status: worst.status, time: points[start] && points[start].time, end_time: points[end - 1] && points[end - 1].time});
        }
        return result;
    }

    function create(object, deps) {
        var scroll = new Lampa.Scroll({mask: false, over: true, step: 250, notransition: true});
        var html = $('<div class="yani-status yani-lite-view"></div>');
        var content = $('<div class="yani-status__content"></div>');
        var last, lastKey = '', ready = false, destroyed = false, paused = false, pending = false, generation = 0, period = '3hour', component;
        scroll.minus();

        function date(value) {
            if (!value) return '—';
            try { return new Date(value).toLocaleString(deps.locale(), {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'}); }
            catch (error) { return new Date(value).toLocaleString(); }
        }
        function statusKey(value) { return ['up', 'down', 'degraded', 'unknown'].indexOf(value) >= 0 ? value : 'unknown'; }
        function focus(element, key) {
            if (key) element.attr('data-yani-focus-key', key);
            element.on('hover:focus', function (event) {
                if (destroyed) return;
                var target = event.currentTarget || event.target;
                last = target; lastKey = key || $(target).attr('data-yani-focus-key') || '';
                scroll.update($(target), true);
            });
            return element;
        }
        function metric(title, value) { return $('<div class="yani-status__metric"></div>').append($('<span></span>').text(title), $('<strong></strong>').text(value)); }
        function domainName(domain) {
            var names = {'old.yummyani.me': 'domain_old', 'old.yummy-ani.me': 'domain_old_mirror', 'ru.yummyani.me': 'domain_new', 'ru.yummy-ani.me': 'domain_new_mirror', 'api.yani.tv': 'domain_api', 'waf.valtrix.org': 'domain_waf'};
            return names[domain.domain] ? deps.t(names[domain.domain]) : (domain.label || domain.domain);
        }
        function renderError() {
            if (destroyed) return;
            content.empty();
            var state = LampaYaniSectionState.create({t: deps.t});
            state.show('offline', {title: deps.t('status_load_error'), hint: deps.t('status_error_hint'), onRetry: function () { load(false); }});
            content.append(state.root);
            refreshFocus();
        }
        function render(data) {
            if (destroyed) return;
            data = data || {};
            var periods = data.periods || null;
            var selected = periods ? (periods[period] || periods[data.default_period] || periods['3hour']) : data;
            if (!selected) return renderError();
            content.empty();
            var labels = {'3hour': deps.t('period_3hour'), day: deps.t('period_day'), week: deps.t('period_week'), month: deps.t('period_month')};
            var switches = $('<div class="yani-status__periods"></div>');
            Object.keys(labels).forEach(function (key) {
                var button = focus($('<div class="yani-status__period selector"></div>').text(labels[key]), 'period-' + key);
                if (key === period) button.addClass('active');
                button.on('hover:enter', function () { if (destroyed || period === key) return; period = key; lastKey = 'period-' + key; render(data); });
                switches.append(button);
            });
            content.append(switches);
            var summary = selected.summary || {}, state = statusKey(summary.status);
            var title = state === 'up' ? deps.t('all_up') : state === 'down' ? deps.t('all_down') : state === 'unknown' ? deps.t('no_monitoring') : deps.t('degraded');
            var block = focus($('<div class="yani-status__summary selector yani-status--' + state + '"></div>'), 'summary');
            var info = $('<div class="yani-status__summary-info"></div>');
            info.append($('<div class="yani-status__headline"></div>').text(title));
            info.append($('<div class="yani-status__metrics"></div>').append(
                metric(deps.t('availability'), summary.uptime_percent === undefined ? '—' : Number(summary.uptime_percent).toFixed(1) + '%'),
                metric(deps.t('average_load'), summary.average_ms === undefined ? '—' : String(summary.average_ms) + ' ' + deps.t('milliseconds')),
                metric(deps.t('errors'), summary.failed === undefined ? '—' : String(summary.failed)),
                metric(deps.t('checks'), summary.checks === undefined ? '—' : String(summary.checks)),
                metric(deps.t('updated'), date(selected.generated_at || data.generated_at))
            ));
            block.append(info); content.append(block);
            var legend = focus($('<div class="yani-status__legend selector"></div>'), 'legend');
            [['up', 'up'], ['degraded', 'unstable'], ['down', 'down']].forEach(function (entry) {
                legend.append($('<span class="yani-status__legend-item"></span>').append('<span class="yani-status__dot yani-status__dot--' + entry[0] + '"></span>', $('<span></span>').text(deps.t(entry[1]))));
            });
            content.append(legend);
            (selected.domains || []).forEach(function (domain, index) {
                var row = focus($('<div class="yani-status__domain selector yani-status--' + statusKey(domain.status) + '"></div>'), 'domain-' + index);
                var head = $('<div class="yani-status__domain-head"></div>');
                var name = $('<div class="yani-status__domain-name"></div>').append('<span class="yani-status__state"></span>', $('<strong></strong>').text(domainName(domain)), $('<small></small>').text(domain.domain));
                var values = $('<div class="yani-status__domain-values"></div>').append(
                    $('<span></span>').text('HTTP ' + (domain.average_ms === undefined ? '—' : domain.average_ms + ' ' + deps.t('milliseconds'))),
                    $('<span></span>').text('Ping ' + (domain.ping_ms === undefined ? '—' : domain.ping_ms + ' ' + deps.t('milliseconds')))
                );
                var history = $('<div class="yani-status__history"></div>');
                compactHistory(domain.history, 48).forEach(function (point) {
                    var interval = date(point.time) + (point.end_time && point.end_time !== point.time ? ' — ' + date(point.end_time) : '');
                    history.append($('<i class="yani-status__bar yani-status__bar--' + statusKey(point.status) + '"></i>').attr('title', interval));
                });
                head.append(name, values); row.append(head, history); content.append(row);
            });
            content.append(focus($('<div class="yani-status__source selector"></div>').text(deps.t('source') + ': YummyStatus · ' + deps.t('period') + ': ' + labels[period] + ' · ' + deps.t('snapshot_notice')), 'source'));
            content.append(focus($('<div class="yani-status__refresh selector"></div>').text(deps.t('refresh_status')).on('hover:enter', function () { load(false); }), 'refresh'));
            refreshFocus();
        }
        function refreshFocus() {
            if (!ready || destroyed || paused) return;
            var enabled = Lampa.Controller.enabled && Lampa.Controller.enabled();
            if (enabled && enabled.name !== 'content') return;
            var target = last && document.documentElement.contains(last) ? $(last) : lastKey ? content.find('[data-yani-focus-key="' + lastKey + '"]').first() : $();
            if (!target.length) target = content.find('.selector').first();
            last = target.length ? target[0] : null;
            Lampa.Controller.collectionSet(scroll.render());
            Lampa.Controller.collectionFocus(last || false, scroll.render());
            if (target.length) scroll.update(target, true);
        }
        function load(first) {
            if (destroyed || pending) return;
            pending = true;
            var requestGeneration = ++generation;
            if (first) {
                component.activity.loader(false);
                content.empty();
                var loading = LampaYaniSectionState.create({t: deps.t});
                loading.show('loading', {skeleton: 'rows'}); content.append(loading.root);
            }
            LampaYaniApi.status().then(function (data) {
                if (destroyed || requestGeneration !== generation) return;
                pending = false; render(data);
                if (first) { if (!paused) component.activity.toggle(); ready = true; refreshFocus(); }
            }).catch(function (error) {
                if (destroyed || requestGeneration !== generation) return;
                pending = false; console.error('[YummyAnime Status]', error); renderError();
                if (first) { if (!paused) component.activity.toggle(); ready = true; refreshFocus(); }
            });
        }
        component = {
            create: function () { scroll.append(content); html.append(scroll.render(true)); load(true); },
            start: function () {
                if (destroyed) return;
                paused = false;
                Lampa.Controller.add('content', {toggle: refreshFocus, left: function () { if (Navigator.canmove('left')) Navigator.move('left'); else Lampa.Controller.toggle('menu'); }, right: function () { Navigator.move('right'); }, up: function () { if (Navigator.canmove('up')) Navigator.move('up'); else Lampa.Controller.toggle('head'); }, down: function () { LampaYaniNavigation.moveDown(scroll); }, back: deps.goBack});
                Lampa.Controller.toggle('content');
            },
            pause: function () { paused = true; },
            stop: function () { paused = true; },
            render: function (js) { return js ? html[0] : html; },
            destroy: function () { destroyed = true; generation++; ready = false; last = null; scroll.destroy(); html.remove(); }
        };
        return component;
    }
    window.LampaYani = window.LampaYani || {};
    window.LampaYani.Status = window.LampaYaniStatus = {create: create, compactHistory: compactHistory};
}(window));

(function (window) {
    'use strict';

    var serial = 0;
    function safeSource(value) {
        var url = String(value || '').trim();
        return /^https?:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/i.test(url) ? url : '';
    }
    function create(object, deps) {
        object = object || {}; deps = deps || {};
        var Lampa = window.Lampa, $ = window.$, t = deps.t || function (key) { return key; };
        var html = $('<div class="yani-licenses yani-lite-view"></div>');
        var header = $('<div class="yani-licenses__header"></div>');
        var title = $('<h1 class="yani-licenses__title"></h1>');
        var back = $('<div class="yani-licenses__back selector" role="button"></div>');
        var scroll = new Lampa.Scroll({mask: false, over: true, step: 250, notransition: true});
        var content = $('<div class="yani-licenses__content"></div>');
        var active = false, destroyed = false, detail = null, selected = 0, last = null, reader = null;
        var rows = [], actions = [], events = {}, namespace = '.yaniLicenses' + (++serial), component = {};
        var data = deps.data || window.LampaYaniLicenseData || {};
        var entries = (Array.isArray(data.entries) ? data.entries : []).filter(function (entry) { return entry && typeof entry.id === 'string'; });
        if (scroll.minus) scroll.minus();
        function text(key, fallback) { var value = t(key); return value && value !== key ? value : fallback; }
        function entryText(entry, field) {
            return text('license_' + entry.id.replace(/-/g, '_') + '_' + field, entry[field] || '');
        }
        function status(entry) {
            if (entry.status === 'confirmed') return text('licenses_status_confirmed', 'Confirmed for the stated scope');
            if (entry.status === 'third-party') return text('licenses_status_third_party', 'Third-party rights and conditions');
            return text('licenses_status_unconfirmed', 'License not confirmed');
        }
        function focus(value) {
            if (!active || destroyed || !value) return;
            var element = value.jquery ? value[0] : value;
            last = element;
            Lampa.Controller.collectionSet(html);
            if (window.Navigator && Navigator.add) Navigator.add(element);
            Lampa.Controller.collectionFocus(element, html, true);
            if (element !== back[0] && scroll.update) scroll.update($(element), !reader || element !== reader[0]);
        }
        function liveRow(row) {
            if (!active || destroyed) return false;
            for (var node = row[0]; node; node = node.parentNode) if (node === html[0]) return true;
            return false;
        }
        function bind(row, callback) {
            row.on('hover:focus' + namespace, function () { if (!liveRow(row)) return; last = row[0]; if (scroll.update && row !== back) scroll.update(row, !reader || row[0] !== reader[0]); });
            row.on('hover:enter' + namespace + ' click' + namespace, function (event) {
                if (event && event.preventDefault) event.preventDefault();
                if (event && event.stopImmediatePropagation) event.stopImmediatePropagation();
                if (liveRow(row) && callback) callback();
            });
            return row;
        }
        function reset() { content.empty(); actions = []; reader = null; if (scroll.reset) scroll.reset(); }
        function paragraph(className, value) { return $('<p></p>').addClass(className).text(value || ''); }
        function showList(restore) {
            detail = null; reset(); rows = [];
            title.text(text('licenses_title', 'Licenses'));
            back.text(text('licenses_back_settings', 'Back to settings'));
            content.append(paragraph('yani-licenses__intro', text('licenses_intro', 'Licenses apply only to the stated components and scope. Upstream additions and third-party materials have separate conditions.')));
            entries.forEach(function (entry, index) {
                var row = $('<div class="yani-licenses__entry selector" role="button"></div>').attr('data-yani-license-id', entry.id);
                row.append($('<strong class="yani-licenses__entry-title"></strong>').text(entryText(entry, 'title')),
                    $('<span class="yani-licenses__entry-license"></span>').text(entry.license || text('licenses_not_specified', 'Not specified')),
                    paragraph('yani-licenses__status', status(entry)), paragraph('yani-licenses__scope', entryText(entry, 'scope')));
                bind(row, function () { selected = index; showDetail(entry); });
                rows.push(row); actions.push(row[0]); content.append(row);
            });
            if (!entries.length) content.append(paragraph('yani-licenses__empty', text('licenses_unavailable', 'License information is unavailable in this build.')));
            if (restore) focus(rows[selected] || back);
        }
        function showDetail(entry) {
            detail = entry; reset();
            title.text(entryText(entry, 'title'));
            back.text(text('licenses_back_list', 'Back to components'));
            content.append(paragraph('yani-licenses__license', entry.license || text('licenses_not_specified', 'Not specified')),
                paragraph('yani-licenses__status', status(entry)), paragraph('yani-licenses__scope', entryText(entry, 'scope')));
            if (entry.notice) content.append(paragraph('yani-licenses__notice', entryText(entry, 'notice')));
            (Array.isArray(entry.sources) ? entry.sources : []).forEach(function (source) {
                var url = safeSource(source && source.url);
                if (!url) return;
                var link = $('<div class="yani-licenses__source selector" role="button"></div>').text((source.title || text('licenses_source', 'Source')) + ' · ' + url);
                bind(link, function () { if (deps.openSource) deps.openSource(url); });
                actions.push(link[0]); content.append(link);
            });
            if (typeof entry.licenseText === 'string' && entry.licenseText) {
                content.append(paragraph('yani-licenses__hint', text('licenses_read_hint', 'Focus the text and use Up/Down to read. Back returns to components.')));
                reader = $('<pre class="yani-licenses__text selector" role="region" tabindex="0"></pre>').attr('aria-label', text('licenses_full_text', 'Full license text')).text(entry.licenseText);
                bind(reader); actions.push(reader[0]); content.append(reader);
            } else content.append(paragraph('yani-licenses__no-text', entry.status === 'confirmed'
                ? text('licenses_text_unavailable', 'The full text is unavailable in this build. Refer to the source above.')
                : text('licenses_no_text', 'No license grant is confirmed for this entry. The notice and source links do not grant permission.')));
            focus(actions[0] || back[0]);
        }
        function goBack() {
            if (!active || destroyed) return;
            if (detail) showList(true);
            else if (deps.goBack) deps.goBack();
            else if (Lampa.Activity && Lampa.Activity.backward) Lampa.Activity.backward();
        }
        function move(direction) {
            if (!active || destroyed) return;
            if (reader && last === reader[0] && (direction > 0 || !scroll.position || scroll.position() < 0)) {
                if (scroll.wheel) scroll.wheel(direction * 250);
                return;
            }
            var collection = [back[0]].concat(actions), index = collection.indexOf(last);
            focus(collection[Math.max(0, Math.min(collection.length - 1, index + direction))]);
        }
        bind(back, goBack); header.append(back, title); scroll.append(content); html.append(header, scroll.render());
        component.on = function (name, callback) { (events[name] || (events[name] = [])).push(callback); };
        component.create = function () { showList(false); if (component.activity && component.activity.loader) component.activity.loader(false); };
        component.render = function (js) { return js ? html[0] : html; };
        component.start = function () {
            if (destroyed) return; active = true;
            var controller = {toggle: function () { focus(last || rows[selected] || back); }, up: function () { move(-1); }, down: function () { move(1); },
                left: goBack, right: function () {}, back: goBack};
            Lampa.Controller.add('content', controller); Lampa.Controller.toggle('content');
            (events.controller || []).slice().forEach(function (callback) { callback(controller); });
        };
        component.pause = component.stop = function () { active = false; };
        component.destroy = function () {
            if (destroyed) return; destroyed = true; active = false;
            back.off(namespace); content.find('.selector').off(namespace); html.off(namespace); scroll.destroy(); html.remove();
            rows = []; actions = []; entries = []; events = {}; last = null; reader = null; detail = null;
        };
        return component;
    }
    window.LampaYaniLicenses = {create: create, safeSource: safeSource};
}(window));

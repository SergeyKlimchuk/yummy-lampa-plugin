(function (window) {
    'use strict';

    // One lightweight Activity owns playback setup and episode navigation.
    // Groups are real dubbing/source pairs; changing one never fabricates a pair.
    function create(object, deps) {
        object = object || {};
        deps = deps || {};
        var t = deps.t || function (key) { return key; };
        var preferences = deps.preferences || window.LampaYaniPlaybackPreferences;
        var card = object.card || {};
        var groups = (object.groups || []).filter(function (group) { return group && group.videos && group.videos.length; });
        var selection = object.selection || {};
        var selectedGroup = selection.group || groups[0] || null;
        var scroll = new Lampa.Scroll({mask: false, over: true, step: 250, notransition: true});
        var html = $('<div class="yani-playback yani-lite-view"></div>');
        var content = $('<div class="yani-playback__content"></div>');
        var mode = 'main', optionPage = 0, episodePage = 0, selectedVideo = null, optionItems = null;
        var lastKey = 'watch', ready = false, destroyed = false, paused = false;
        var focusTimer = null, launching = false, missingEpisode = false;
        var playlistCache = [];
        var pageSize = 60, optionPageSize = 30;
        var progress = deps.progress || window.LampaYaniEpisodeProgress;
        var progressOwner = progress && progress.owner ? progress.owner() : null;
        var remoteVideos = Array.isArray(object.progressVideos) ? object.progressVideos : groups.reduce(function (all, group) { return all.concat(group.videos); }, []);
        if (progress && object.progressOwner && !progress.sameOwner(object.progressOwner, progressOwner)) remoteVideos = [];
        var progressIndex = {}, progressTask = null, progressGeneration = 0;
        var progressStatus = '', mustRefreshProgress = false, pendingProgress = null;
        var needsInitialRefresh = Boolean(progress && object.progressOwner && !progress.sameOwner(object.progressOwner, progressOwner));
        scroll.minus();

        function voiceKey(group) {
            var value = group && group.title || '';
            return preferences && preferences.normalizeVoice ? preferences.normalizeVoice(value) : String(value).trim().toLowerCase();
        }
        function sourceKey(group) {
            return deps.sourceId && deps.sourceId(group) || preferences && preferences.source && preferences.source(group) || String(group && (group.playerId || group.player || group.source) || '').toLowerCase();
        }
        function sourceLabel(group) { return deps.sourceLabel ? deps.sourceLabel(group) : group && (group.player || group.source) || t('playback_source'); }
        function episodeValue(video) { return window.LampaYaniEpisode ? LampaYaniEpisode.valueOf(video) : String(video && (video.number || video.index) || ''); }
        function sameEpisode(left, right) { return window.LampaYaniEpisode ? LampaYaniEpisode.same(left, right) : String(left) === String(right); }
        function episodeTitle(video) { return deps.episodeTitle ? deps.episodeTitle(card, video) : t('episode') + ' ' + episodeValue(video); }
        function playback() { return card.yani_resume || deps.getPlayback && deps.getPlayback(card.yani_id) || {}; }
        function target() { return deps.targetPreference ? deps.targetPreference(card) : deps.playbackTargetPreference ? deps.playbackTargetPreference() : 'internal'; }
        function externalAvailable() { return Boolean(deps.externalAvailable && deps.externalAvailable()); }
        function targetTitle(value) { return t('playback_target_' + (value === 'external' || value === 'internal' ? value : 'ask')); }
        function ownsActivity() { return !destroyed && (!Lampa.Activity || typeof Lampa.Activity.own !== 'function' || Lampa.Activity.own(component)); }
        function videosFor(group) {
            var index = groups.indexOf(group);
            if (index >= 0 && playlistCache[index]) return playlistCache[index];
            var videos = deps.playlist ? deps.playlist(card, group) : (group && group.videos || []).slice();
            if (index >= 0) playlistCache[index] = videos;
            return videos;
        }
        function selectEpisode(group, desired, videoId) {
            var videos = videosFor(group), found = -1;
            videos.some(function (video, index) {
                if (videoId && String(video.video_id || video.id || '') === String(videoId)) found = index;
                return found >= 0;
            });
            if (found < 0) videos.some(function (video, index) { if (sameEpisode(episodeValue(video), desired)) found = index; return found >= 0; });
            missingEpisode = Boolean(desired !== undefined && desired !== null && desired !== '' && found < 0);
            if (found < 0 && isFinite(Number(desired))) {
                var distance = Infinity;
                videos.forEach(function (video, index) {
                    var number = Number(episodeValue(video)), difference = Math.abs(number - Number(desired));
                    if (isFinite(number) && difference < distance) { distance = difference; found = index; }
                });
            }
            selectedVideo = videos[Math.max(0, found)] || null;
            episodePage = Math.floor(Math.max(0, found) / pageSize);
        }
        if (selectedGroup) {
            var initialGroup = selectedGroup;
            selectedGroup = groups.filter(function (group) { return voiceKey(group) === voiceKey(initialGroup) && sourceKey(group) === sourceKey(initialGroup); })[0] || groups[0];
            selectEpisode(selectedGroup, playback().number, playback().video_id);
        }

        function rebuildProgress() {
            if (!progress) return;
            var owner = progress.owner();
            if (!progress.sameOwner(owner, progressOwner)) {
                progressOwner = owner; remoteVideos = []; pendingProgress = null;
                progressGeneration += 1; progressTask = null;
            }
            progressIndex = progress.index(card, remoteVideos, playback());
        }
        function paintProgress() {
            if (destroyed || paused || mode !== 'main' || !progress) return;
            var videos = videosFor(selectedGroup);
            content.find('.yani-playback__episode').each(function () {
                var item = $(this), index = Number((item.attr('data-yani-focus-key') || '').split(':')[1]);
                var video = videos[index], value = progress.state(progressIndex, video);
                var state = value.state || 'none', percent = Math.max(0, Math.min(100, Number(value.percent) || 0));
                var signature = state + ':' + percent;
                if (item.attr('data-yani-progress') === signature) return;
                var status = state === 'completed' ? '✓ ' + t('playback_episode_completed') : state === 'started' ? t('playback_episode_started') + (percent ? ' · ' + percent + '%' : '') : '';
                item.attr({'data-yani-progress': signature, 'data-yani-episode-state': state, 'aria-label': episodeTitle(video) + (status ? ' · ' + status : '')});
                item.find('.yani-playback__episode-status').text(status);
                item.find('.yani-playback__episode-fill').attr('style', 'width:' + percent + '%');
            });
        }
        function paintProgressMessage() {
            content.find('.yani-playback__progress-message').text(progressStatus);
            content.find('[data-yani-focus-key="refresh-progress"]').attr('aria-busy', String(Boolean(progressTask)));
        }
        function refreshProgress() {
            if (destroyed || paused || !deps.loadProgress || !progress) return Promise.resolve(false);
            if (progressTask) return progressTask;
            var owner = progress.owner(), generation = ++progressGeneration;
            progressStatus = t('playback_progress_refreshing');
            var task = Promise.resolve().then(function () { return deps.loadProgress(card); }).then(function (videos) {
                if (destroyed || generation !== progressGeneration || !progress.sameOwner(owner, progress.owner())) return false;
                if (!Array.isArray(videos)) return false;
                if (paused || !ownsActivity()) { pendingProgress = {videos: videos, owner: owner}; return true; }
                remoteVideos = videos; progressOwner = owner;
                rebuildProgress(); paintProgress();
                progressStatus = t('playback_progress_updated');
                return true;
            }).catch(function (error) {
                if (!destroyed && generation === progressGeneration && progress.sameOwner(owner, progress.owner())) {
                    progressStatus = t('playback_progress_error');
                    console.warn('[YummyAnime] Could not refresh episode progress', error && error.message || error);
                }
                return false;
            }).then(function (success) {
                if (progressTask === task) {
                    progressTask = null;
                    if (!destroyed && !paused && ownsActivity()) paintProgressMessage();
                }
                return success;
            });
            progressTask = task; paintProgressMessage();
            return task;
        }
        function refreshAfterReturn() {
            if (!mustRefreshProgress || paused || destroyed) return;
            mustRefreshProgress = false;
            refreshProgress();
        }
        function progressChanged(changedCard) {
            if (destroyed || changedCard && String(changedCard.yani_id || changedCard.anime_id || '') !== String(card.yani_id)) return;
            rebuildProgress(); paintProgress();
        }
        function onProgressAuthChanged() {
            if (destroyed) return;
            rebuildProgress(); paintProgress();
            mustRefreshProgress = true;
            if (!paused && ownsActivity()) refreshAfterReturn();
        }
        rebuildProgress();

        function bind(element, key, handler) {
            element.attr({'data-yani-focus-key': key, role: 'button', tabindex: '-1'});
            element.on('hover:focus', function () { if (destroyed || paused) return; lastKey = key; scroll.update(element, true); });
            element.on('hover:enter', function () { if (!destroyed && !paused && !launching) handler(element); });
            return element;
        }
        function button(label, key, handler, className) {
            return bind($('<div class="yani-playback__button selector"></div>').addClass(className || '').text(label), key, handler);
        }
        function focusTarget() {
            return content.find('[data-yani-focus-key="' + lastKey + '"]').first().length ? content.find('[data-yani-focus-key="' + lastKey + '"]').first() : content.find('.selector').first();
        }
        function refreshFocus() {
            if (!ready || paused || !ownsActivity()) return;
            var enabled = Lampa.Controller.enabled && Lampa.Controller.enabled();
            if (enabled && enabled.name && enabled.name !== 'content') return;
            if (mode === 'main') updateCurrentEpisode();
            var element = focusTarget();
            Lampa.Controller.collectionSet(scroll.render());
            if (element.length) {
                if (window.Navigator && Navigator.add) Navigator.add(element[0]);
                Lampa.Controller.collectionFocus(element[0], scroll.render());
                scroll.update(element, true);
            }
        }
        function scheduleFocus() {
            if (focusTimer !== null) clearTimeout(focusTimer);
            focusTimer = setTimeout(function () { focusTimer = null; refreshFocus(); }, 0);
        }
        function heading(title, subtitle) {
            content.append($('<h1 class="yani-playback__title"></h1>').text(title));
            if (subtitle) content.append($('<div class="yani-playback__hint"></div>').text(subtitle));
        }
        function changeField(label, value, key, nextMode) {
            var field = bind($('<div class="yani-playback__field selector"></div>'), key, function () { openOptions(nextMode); });
            field.append($('<span class="yani-playback__field-label"></span>').text(label));
            field.append($('<span class="yani-playback__field-value"></span>').text(value));
            field.append($('<span class="yani-playback__field-change"></span>').text(t('playback_change')));
            return field;
        }
        function originText() {
            if (selection.unavailable) return t('playback_preference_unavailable');
            return t('playback_selected_' + (/^(anime|default|history)$/.test(selection.origin) ? selection.origin : 'auto'));
        }
        function play(video, element) {
            if (!video || !selectedGroup || launching) return;
            selectedVideo = video;
            updateCurrentEpisode();
            var saved = playback();
            if (sameEpisode(episodeValue(video), saved.number)) {
                video.watched = video.watched || {};
                video.watched.end_time = Math.max(Number(video.watched.end_time || 0), Number(saved.time || 0));
                if (!video.duration && saved.duration) video.duration = Number(saved.duration);
            }
            launching = true;
            mustRefreshProgress = true;
            // Root unlocks on a confirmed return/failure; elapsed time cannot
            // authorize a second stream resolver while the first is in flight.
            if (deps.launch) deps.launch(card, selectedGroup, videosFor(selectedGroup), video, element, scroll.render(), target());
        }
        function updateCurrentEpisode() {
            if (!selectedVideo || mode !== 'main') return;
            var saved = playback(), resuming = Number(saved.time || 0) > 0 && sameEpisode(episodeValue(selectedVideo), saved.number);
            var label = content.find('.yani-playback__watch-label'), episode = content.find('.yani-playback__watch-episode');
            var nextLabel = resuming ? t('continue_watching') : t('watch'), nextEpisode = episodeTitle(selectedVideo);
            if (label.text() !== nextLabel) label.text(nextLabel);
            if (episode.text() !== nextEpisode) episode.text(nextEpisode);
            var videos = videosFor(selectedGroup);
            content.find('.yani-playback__episode').each(function () {
                var item = $(this), index = Number((item.attr('data-yani-focus-key') || '').split(':')[1]);
                var active = videos[index] === selectedVideo;
                if (item.attr('aria-pressed') !== String(active)) item.toggleClass('is-selected', active).attr('aria-pressed', String(active));
            });
            paintProgress();
        }
        function renderMain(focusKey) {
            if (destroyed) return;
            mode = 'main';
            optionItems = null;
            if (focusKey) lastKey = focusKey;
            content.empty();
            heading(card.title || t('playback_setup_title'), originText());
            if (!selectedGroup || !selectedVideo) {
                content.append($('<div class="yani-playback__empty"></div>').text(t('no_videos')));
                content.append(button(t('playback_back_to_anime'), 'back', back));
                return scheduleFocus();
            }
            var fields = $('<div class="yani-playback__fields"></div>');
            fields.append(changeField(t('playback_voice'), selectedGroup.title, 'voice', 'voices'));
            fields.append(changeField(t('playback_source'), sourceLabel(selectedGroup), 'source', 'sources'));
            if (externalAvailable()) fields.append(changeField(t('player'), targetTitle(target()), 'target', 'targets'));
            content.append(fields);
            var actions = $('<div class="yani-playback__actions"></div>');
            var saved = playback(), resuming = Number(saved.time || 0) > 0 && sameEpisode(episodeValue(selectedVideo), saved.number);
            var watch = bind($('<div class="yani-playback__watch selector"></div>'), 'watch', function (element) { play(selectedVideo, element); });
            watch.append($('<span class="yani-playback__watch-label"></span>').text(resuming ? t('continue_watching') : t('watch')));
            watch.append($('<span class="yani-playback__watch-episode"></span>').text(episodeTitle(selectedVideo)));
            actions.append(watch);
            var hasSaved = preferences && preferences.saved && preferences.saved(card);
            if (hasSaved) actions.append(button(t('playback_use_defaults'), 'defaults', reset, 'yani-playback__button--subtle'));
            content.append(actions);
            var subtitle = deps.groupSubtitle ? deps.groupSubtitle(selectedGroup) : '';
            if (subtitle) content.append($('<div class="yani-playback__group-meta"></div>').text(subtitle));
            if (missingEpisode) content.append($('<div class="yani-playback__notice"></div>').text(t('playback_episode_missing')));
            var videos = videosFor(selectedGroup), first = episodePage * pageSize, last = Math.min(first + pageSize, videos.length);
            var section = $('<div class="yani-playback__episode-head"></div>').append($('<h2></h2>').text(t('playback_episode_list')));
            section.append($('<span></span>').text((first + 1) + '–' + last + ' / ' + videos.length));
            content.append(section);
            if (progress) {
                var legend = $('<div class="yani-playback__progress-tools"></div>');
                var labels = $('<div class="yani-playback__progress-legend"></div>');
                labels.append($('<span class="is-completed"></span>').text('✓ ' + t('playback_episode_completed')),
                    $('<span class="is-started"></span>').text(t('playback_episode_started')));
                legend.append(labels);
                if (deps.loadProgress) legend.append(button(t('playback_progress_refresh'), 'refresh-progress', refreshProgress, 'yani-playback__button--subtle'));
                content.append(legend, $('<div class="yani-playback__progress-message" role="status" aria-live="polite"></div>').text(progressStatus));
            }
            var grid = $('<div class="yani-playback__episodes"></div>');
            videos.slice(first, last).forEach(function (video, index) {
                var active = video === selectedVideo;
                var item = button(episodeTitle(video), 'episode:' + (first + index), function (element) { play(video, element); }, 'yani-playback__episode');
                item.empty().append($('<span class="yani-playback__episode-title"></span>').text(episodeTitle(video)),
                    $('<span class="yani-playback__episode-status"></span>'),
                    $('<span class="yani-playback__episode-bar" aria-hidden="true"><span class="yani-playback__episode-fill"></span></span>'));
                item.toggleClass('is-selected', active).attr('aria-pressed', String(active));
                grid.append(item);
            });
            content.append(grid);
            pagination(episodePage, Math.ceil(videos.length / pageSize), function (page) { episodePage = page; renderMain('episode:' + (page * pageSize)); });
            paintProgress(); paintProgressMessage();
            scheduleFocus();
        }
        function reset() {
            if (!preferences || !preferences.reset || !preferences.resolve) return;
            var desired = episodeValue(selectedVideo);
            preferences.reset(card);
            selection = preferences.resolve(card, groups, playback());
            selectedGroup = selection.group || groups[0];
            selectEpisode(selectedGroup, desired);
            renderMain('watch');
        }
        function pagination(page, total, select) {
            if (total < 2) return;
            var row = $('<div class="yani-playback__pagination"></div>');
            if (page > 0) row.append(button('‹ ' + t('playback_option_page') + ' ' + page, 'previous', function () { select(page - 1); }));
            if (page + 1 < total) row.append(button(t('playback_option_page') + ' ' + (page + 2) + ' ›', 'next', function () { select(page + 1); }));
            content.append(row);
        }
        function voiceOptions() {
            var seen = {}, result = [];
            groups.forEach(function (group) {
                var key = voiceKey(group);
                if (seen[key]) return;
                seen[key] = true;
                var matches = groups.filter(function (candidate) { return voiceKey(candidate) === key; });
                var sameSource = matches.filter(function (candidate) { return sourceKey(candidate) === sourceKey(selectedGroup); })[0];
                var resolved = preferences && preferences.resolve ? preferences.resolve(card, matches, playback()) : null;
                var chosen = sameSource || resolved && resolved.group || group;
                result.push({title: group.title, subtitle: matches.map(sourceLabel).filter(function (label, index, all) { return all.indexOf(label) === index; }).join(' · '), group: chosen, selected: key === voiceKey(selectedGroup)});
            });
            return result;
        }
        function sourceOptions() {
            var seen = {};
            return groups.filter(function (group) {
                var key = sourceKey(group);
                if (voiceKey(group) !== voiceKey(selectedGroup) || seen[key]) return false;
                seen[key] = true; return true;
            }).map(function (group) {
                return {title: sourceLabel(group), subtitle: deps.groupSubtitle ? deps.groupSubtitle(group) : '', group: group, selected: sourceKey(group) === sourceKey(selectedGroup)};
            });
        }
        function optionsForMode() {
            return mode === 'targets' ? ['internal', 'external', 'ask'].map(function (value) { return {title: targetTitle(value), target: value, selected: target() === value}; }) : mode === 'voices' ? voiceOptions() : sourceOptions();
        }
        function openOptions(nextMode) {
            mode = nextMode;
            optionItems = optionsForMode();
            var selected = 0;
            optionItems.some(function (option, index) { if (option.selected) selected = index; return Boolean(option.selected); });
            optionPage = Math.floor(selected / optionPageSize);
            renderOptions();
        }
        function renderOptions() {
            if (destroyed) return;
            var isVoice = mode === 'voices', isTarget = mode === 'targets';
            var options = optionItems || optionsForMode();
            var title = isTarget ? t('player') : t(isVoice ? 'playback_voice' : 'playback_source');
            content.empty();
            heading(title, isTarget ? card.title : selectedGroup && selectedGroup.title && !isVoice ? selectedGroup.title : card.title);
            content.append(button('‹ ' + t('playback_back_to_episodes'), 'back', function () { renderMain(isTarget ? 'target' : isVoice ? 'voice' : 'source'); }, 'yani-playback__button--subtle'));
            var list = $('<div class="yani-playback__options"></div>');
            var first = optionPage * optionPageSize;
            options.slice(first, first + optionPageSize).forEach(function (option, index) {
                var item = bind($('<div class="yani-playback__option selector"></div>'), 'option:' + (first + index), function () {
                    if (isTarget) {
                        if (deps.rememberTarget) deps.rememberTarget(card, option.target);
                        selection = {group: selectedGroup, origin: 'anime', unavailable: false};
                    } else {
                        var desired = episodeValue(selectedVideo);
                        selectedGroup = option.group;
                        if (preferences && preferences.remember) preferences.remember(card, selectedGroup);
                        selection = {group: selectedGroup, origin: 'anime', unavailable: false};
                        selectEpisode(selectedGroup, desired);
                    }
                    renderMain(isTarget ? 'target' : isVoice ? 'voice' : 'source');
                });
                item.toggleClass('is-selected', option.selected).attr('aria-pressed', String(Boolean(option.selected)));
                item.append($('<div class="yani-playback__option-title"></div>').text(option.title));
                if (option.subtitle) item.append($('<div class="yani-playback__option-subtitle"></div>').text(option.subtitle));
                if (option.selected) item.append($('<span class="yani-playback__selected-label"></span>').text(t('playback_selected')));
                list.append(item);
            });
            content.append(list);
            pagination(optionPage, Math.ceil(options.length / optionPageSize), function (page) { optionPage = page; renderOptions(); });
            var selectedIndex = -1;
            options.some(function (option, index) { if (option.selected && index >= first && index < first + optionPageSize) selectedIndex = index; return selectedIndex >= 0; });
            lastKey = 'option:' + (selectedIndex >= 0 ? selectedIndex : first);
            scheduleFocus();
        }
        function back() {
            if (mode !== 'main') return renderMain(mode === 'voices' ? 'voice' : mode === 'targets' ? 'target' : 'source');
            if (deps.goBack) deps.goBack();
        }
        function cancelFocus() { if (focusTimer !== null) clearTimeout(focusTimer); focusTimer = null; }
        var component = {
            create: function () {
                renderMain(); scroll.append(content); html.append(scroll.render(true)); ready = true;
                if (document.addEventListener) document.addEventListener('yani:auth-changed', onProgressAuthChanged);
                if (this.activity && this.activity.loader) this.activity.loader(false);
                if (this.activity && this.activity.toggle) this.activity.toggle();
            },
            start: function () {
                if (destroyed) return;
                paused = false; launching = false;
                if (pendingProgress && progress && progress.sameOwner(pendingProgress.owner, progress.owner())) {
                    remoteVideos = pendingProgress.videos; progressOwner = pendingProgress.owner; progressStatus = t('playback_progress_updated'); mustRefreshProgress = false;
                }
                pendingProgress = null;
                rebuildProgress(); paintProgress();
                if (needsInitialRefresh) { needsInitialRefresh = false; mustRefreshProgress = true; }
                refreshAfterReturn();
                Lampa.Controller.add('content', {
                    link: component,
                    toggle: refreshFocus,
                    left: function () { if (Navigator.canmove('left')) Navigator.move('left'); },
                    right: function () { if (Navigator.canmove('right')) Navigator.move('right'); },
                    up: function () { if (Navigator.canmove('up')) Navigator.move('up'); else if (mode === 'main') Lampa.Controller.toggle('head'); },
                    down: function () { if (window.LampaYaniNavigation) LampaYaniNavigation.moveDown(scroll); else Navigator.move('down'); },
                    back: back
                });
                Lampa.Controller.toggle('content');
            },
            pause: function () { paused = true; mustRefreshProgress = true; cancelFocus(); },
            stop: function () { paused = true; mustRefreshProgress = true; cancelFocus(); },
            playbackRestored: function () {
                if (destroyed || paused) return;
                launching = false;
                rebuildProgress(); updateCurrentEpisode();
                refreshAfterReturn();
            },
            progressChanged: progressChanged,
            refreshProgress: refreshProgress,
            render: function (js) { return js ? html[0] : html; },
            destroy: function () {
                destroyed = true; ready = false; cancelFocus();
                progressGeneration += 1; progressTask = null; pendingProgress = null; remoteVideos = []; progressIndex = {};
                if (document.removeEventListener) document.removeEventListener('yani:auth-changed', onProgressAuthChanged);
                playlistCache = []; selectedVideo = null; groups = []; scroll.destroy(); html.remove();
                if (deps.onDestroy) deps.onDestroy(component);
            }
        };
        return component;
    }

    window.LampaYaniPlaybackPicker = {create: create};
}(window));

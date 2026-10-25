(function (window) {
    'use strict';

    var key = 'yani_interface_scale';
    var started = false;
    var timer = null;
    var paintedPercent = null;
    var onChange = null;

    // Use the app's CSS viewport, not the panel's advertised resolution or DPR.
    // Lampa already scales its base font with viewport width; these are modest
    // readability multipliers on top of that, not another pixel-density factor.
    function profile(width, height) {
        var longSide = Math.max(Number(width) || 0, Number(height) || 0);
        var shortSide = Math.min(Number(width) || 0, Number(height) || 0);
        if (longSide < 960 || shortSide < 540) return {id: 'compact', percent: 100};
        if (longSide >= 3200 && shortSide >= 1800) return {id: 'uhd', percent: 150};
        if (longSide >= 2200 && shortSide >= 1200) return {id: 'qhd', percent: 145};
        if (longSide >= 1600 && shortSide >= 900) return {id: 'fhd', percent: 140};
        return {id: 'hd', percent: 130};
    }

    function normalize(value) {
        if (value && typeof value === 'object') value = value.value;
        if (typeof value !== 'string' && typeof value !== 'number') return 'auto';
        if (value === 'auto') return 'auto';
        var number = Number(value);
        return number >= 80 && number <= 200 && number % 10 === 0 ? String(number) : 'auto';
    }

    function currentProfile() {
        return profile(window.innerWidth, window.innerHeight);
    }

    function values(t) {
        var result = {auto: t('interface_scale_auto') + ' (' + currentProfile().percent + '%)'};
        for (var percent = 80; percent <= 200; percent += 10) result[percent] = percent + '%';
        return result;
    }

    function apply(value) {
        var storage = window.Lampa && window.Lampa.Storage;
        var setting = normalize(arguments.length ? value : storage && storage.get(key, 'auto'));
        if (arguments.length && storage && storage.set) storage.set(key, setting);
        var selectedProfile = currentProfile();
        var percent = setting === 'auto' ? selectedProfile.percent : Number(setting);
        var state = {profile: selectedProfile.id, percent: percent, setting: setting};
        var root = window.document && window.document.documentElement;
        if (root && root.style && paintedPercent !== percent) {
            root.style.setProperty('--yani-ui-scale', (percent / 100) + 'em');
            paintedPercent = percent;
            if (onChange) onChange(state);
        }
        return state;
    }

    function schedule() {
        if (timer !== null) window.clearTimeout(timer);
        timer = window.setTimeout(function () {
            timer = null;
            apply();
        }, 160);
    }

    function start(callback) {
        if (started) return;
        started = true;
        onChange = callback || null;
        apply();
        // Native fallback also covers hosts without resize_end. Both paths share
        // one timer, after Lampa has recomputed its own font and scroll geometry.
        if (window.addEventListener) window.addEventListener('resize', schedule);
        if (window.Lampa && window.Lampa.Listener && window.Lampa.Listener.follow) {
            window.Lampa.Listener.follow('resize_end', schedule);
        }
    }

    window.LampaYaniScale = {profile: profile, normalize: normalize, values: values, apply: apply, start: start};
}(window));

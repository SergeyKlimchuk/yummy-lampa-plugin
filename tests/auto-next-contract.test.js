const assert = require('assert');
const fs = require('fs');
const source = fs.readFileSync('src/ui.js', 'utf8');
const native = fs.readFileSync('src/ui-native-playlist.js', 'utf8');

// Native Playlist alone owns manual and automatic episode selection. A second
// plugin ended handler must never race its playlist_next subscription.
assert.doesNotMatch(source, /function (?:advancePlaybackWatcher|advanceToNextEpisode|switchInternalEpisode)\(/);
assert.doesNotMatch(source, /yani_auto_next|LampaYaniPlayerEpisodes|episodeNavigationToken/);
assert.doesNotMatch(source, /Storage\.set\(['"]playlist_next/);
assert.match(source, /yani_native_player_settings.*type: 'button'/);
assert.match(source, /onChange: function \(\) \{ Lampa\.Settings\.create\('player'\); \}/);
assert.match(source, /var directPlaylist = session\.playlist\.items/);
assert.match(source, /Lampa\.Player\.playlist\(directPlaylist\)/);
assert.match(source, /callbackContext = session\.context/);
assert.match(source, /flushPlaybackProgress\(true, callbackContext\)/);
assert.match(source, /expectedContext !== playbackContext/);
assert.match(source, /playbackReturnState\.session !== callbackSession/);
assert.match(source, /if \(!context\.nativePlaylist && !state\.advanced/);
assert.match(source, /beforeSelect: function \(\) \{[\s\S]*?flushPlaybackProgress\(true, session\.context\)/);
assert.match(source, /nativePlaylist: session/);
assert.match(source, /normalized\.timeline = \{time: position/);
assert.match(native, /item\.callback = function/);
assert.match(native, /previousItem && previousItem !== item/);
assert.doesNotMatch(native, /Lampa\.Player\.(?:close|play)\(/);
assert.doesNotMatch(native, /Storage\.set|setInterval|setTimeout/);

// Closing/releasing a decoder remains available for fatal stream recovery and
// failed URL resolution, rather than reimplementing every native series jump.
assert.match(source, /function waitForInternalPlayerTeardown/);
assert.match(source, /document\.documentElement\.contains\(video\)/);
assert.match(source, /releasePlaybackVideo\(video\)/);
console.log('Native playlist ownership and auto-next contract tests passed');

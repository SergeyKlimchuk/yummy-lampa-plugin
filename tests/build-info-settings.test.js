'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const ui = fs.readFileSync('src/ui.js', 'utf8');
const prototype = fs.readFileSync('docs/mockups/tv-next/app.js', 'utf8');
const localeContext = {window: {}};
vm.runInNewContext(fs.readFileSync('src/i18n.js', 'utf8'), localeContext);
const t = localeContext.window.LampaYaniI18n.t;
class StampedDate extends Date {
    constructor(value) { assert.equal(arguments.length, 1, 'build time must never become settings-open time'); super(value); }
    static now() { throw new Error('build settings must not read the current time'); }
}
function helper(source, start, end, name) {
    const first = source.indexOf(start), last = source.indexOf(end, first);
    assert.ok(first >= 0 && last > first);
    const context = {window: {}, LampaYaniConfig: {version: '0.47.22'}, t, Date: StampedDate};
    vm.runInNewContext(source.slice(first, last) + '\nthis.rows = ' + name + ';', context);
    return {context, rows: context.rows};
}
const production = helper(ui, '    function buildInfoRows(', '    function yummyWebsiteUrl(', 'buildInfoRows');
const preview = helper(prototype, '    function prototypeBuildInfoRows(', '    function settingRow(', 'prototypeBuildInfoRows');
const metadata = {version: '0.48.0', commit: 'abcdef1234567890abcdef1234567890abcdef1234', shortCommit: 'abcdef1', builtAt: '2026-10-26T03:04:05.000Z', dirty: false, channel: 'github-actions'};
for (const env of [production, preview]) {
    let rows = env.rows(metadata);
    assert.equal(rows.length, 4);
    assert.equal(rows[0].value, '0.48.0');
    assert.equal(rows[1].value, 'abcdef1');
    assert.equal(rows[2].value, '2026-10-26 03:04:05 UTC');
    assert.equal(rows[3].value, 'GitHub Actions');
    rows = env.rows({...metadata, dirty: true, channel: 'local'});
    assert.equal(rows[1].value, 'abcdef1 · с локальными изменениями');
    assert.equal(rows[3].value, 'Локальная');
    rows = env.rows({shortCommit: '123abcd', builtAt: 'not-a-date', channel: 'development'});
    assert.equal(rows[1].value, '123abcd');
    assert.equal(rows[2].value, 'Не указано');
    assert.equal(rows[3].value, 'Режим разработки');
    rows = env.rows({commit: '<script>bad</script>', dirty: 'false', channel: 'not-a-channel'});
    assert.equal(rows[1].value, 'Не указано', 'malformed commit text cannot be presented as artifact identity');
    assert.equal(rows[2].value, 'Не указано');
    assert.equal(rows[3].value, 'Не указано');
    assert.equal(env.rows({channel:'__proto__'})[3].value, 'Не указано');
    env.context.window.LampaYaniBuild = metadata;
    assert.equal(env.rows()[2].value, '2026-10-26 03:04:05 UTC', 'late metadata is read when rendering settings');
    env.context.window.LampaYaniBuild = undefined;
    assert.equal(env.rows()[2].value, 'Не указано', 'legacy artifacts must not invent build timestamps');
}
assert.equal(production.rows({})[0].value, '0.47.22', 'production version still falls back to the actual config');
assert.match(ui, /name: 'yani_build_title', type: 'title'/);
assert.match(ui, /name: 'yani_build_' \+ row\.key, type: 'title'/, 'build rows stay read-only and outside the remote focus path');
assert.ok(ui.indexOf("name: 'yani_build_title'") < ui.indexOf("name: 'yani_about_title'"));
assert.ok(prototype.includes("['build','О сборке']"));
console.log('Build info settings: artifact identity, fixed UTC time, dirty flag, fallback and read-only sections passed');

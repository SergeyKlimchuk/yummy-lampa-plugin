'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const licenses = require('../scripts/licenses');
const release = require('../scripts/release');

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'yummy-license-packaging-'));
try {
    fs.cpSync('LICENSES', path.join(temporary, 'LICENSES'), {recursive: true});
    fs.copyFileSync('licenses.json', path.join(temporary, 'licenses.json'));
    const development = "function pluginYummyAnime() { return 'development'; }\n";
    const historicalStable = "window.LampaYaniConfig = {version: '0.47.21'};\r\n// Keep original video logic.\r\n";
    fs.writeFileSync(path.join(temporary, 'index.js'), development);
    fs.mkdirSync(path.join(temporary, 'stable'));
    fs.writeFileSync(path.join(temporary, 'stable/index.js'), historicalStable);
    licenses.sync({root: temporary});
    const dataPath = path.join(temporary, licenses.DATA_PATH);
    const firstData = fs.readFileSync(dataPath, 'utf8');
    const firstDev = fs.readFileSync(path.join(temporary, 'index.js'), 'utf8');
    const firstStable = fs.readFileSync(path.join(temporary, 'stable/index.js'), 'utf8');
    assert.strictEqual(licenses.stripNotices(firstDev), development);
    assert.strictEqual(licenses.stripNotices(firstStable), historicalStable, 'old stable code/newlines must remain byte-identical');
    assert.ok(firstDev.includes(fs.readFileSync('LICENSES/MIT-original.txt', 'utf8').trimEnd()));
    assert.ok(firstDev.includes(fs.readFileSync('LICENSES/MIT-fork.txt', 'utf8').trimEnd()));
    assert.ok(firstStable.includes('Copyright (c) 2026 Andrew Rasskazoff Codeman'));
    assert.ok(!firstStable.includes('Copyright (c) 2026 SergeyKlimchuk'), 'unchanged upstream stable does not claim fork contributions');
    assert.match(firstDev, /Later upstream additions have unconfirmed licensing/);
    licenses.sync({root: temporary});
    licenses.sync({root: temporary, check: true});
    assert.strictEqual(fs.readFileSync(dataPath, 'utf8'), firstData, 'generation is deterministic');
    assert.strictEqual(fs.readFileSync(path.join(temporary, 'index.js'), 'utf8'), firstDev, 'notice updates are idempotent');
    assert.strictEqual((firstDev.match(/YUMMY_LICENSE_NOTICES_START/g) || []).length, 1);

    const context = {window: {}};
    vm.runInNewContext(firstData, context);
    const entries = context.window.LampaYaniLicenseData.entries;
    const unconfirmed = entries.find(entry => entry.id === 'upstream-unconfirmed');
    assert.strictEqual(unconfirmed.license, null);
    assert.strictEqual(unconfirmed.licenseText, null);
    assert.strictEqual(unconfirmed.status, 'unconfirmed');
    for (const entry of entries) {
        assert.strictEqual(entry.licenseText, entry.licenseFile ? fs.readFileSync(path.join(temporary, entry.licenseFile), 'utf8').replace(/\r\n?/g, '\n') : null);
    }
    assert.strictEqual(entries.find(entry => entry.id === 'lampa-fixtures').licenseText, fs.readFileSync('tests/fixtures/lampa-native/LICENSE', 'utf8'));
    assert.doesNotMatch(firstData, /import Subscribe from|let listener = Subscribe\(\)|let work = null/, 'license data must not embed native Lampa program fixtures');

    fs.appendFileSync(path.join(temporary, 'LICENSES/MIT-fork.txt'), '\nAdditional scoped notice.\n');
    assert.throws(() => licenses.sync({root: temporary, check: true}), /out of date/, 'changed canonical text must invalidate generated data and notices');
    licenses.sync({root: temporary});
    licenses.sync({root: temporary, check: true});
    const updated = fs.readFileSync(dataPath, 'utf8');
    assert.ok(updated.includes('Additional scoped notice.'));

    const current = "window.LampaYaniConfig = {version: '0.47.22'};\n// Original fork code.\n";
    release.writeStable({root: temporary, version: '0.47.22', bundle: current, includeForkNotice: true, releasedAt: '2026-10-28T00:00:00Z'});
    const promoted = fs.readFileSync(path.join(temporary, 'stable/index.js'), 'utf8');
    assert.strictEqual(licenses.stripNotices(promoted), current);
    assert.match(promoted, /Copyright \(c\) 2026 SergeyKlimchuk/, 'promotion adds scoped fork notice');
    assert.strictEqual(licenses.forkNoticePresent(current), false, 'version numbering alone cannot establish fork authorship');
    assert.strictEqual(licenses.forkNoticePresent(promoted), true, 'explicit existing scope notice survives later promotion');
    assert.strictEqual(licenses.forkNoticePresent('window.LampaYaniLicenseData = {};\n'), true, 'current fork bundle has explicit publication metadata');
    assert.strictEqual(release.parseArgs(['node', 'release.js', '--promote', '0.47.22', '--fork-notice']).includeForkNotice, true);
    release.writeStable({root: temporary, version: '0.47.21', bundle: historicalStable});
    assert.strictEqual(licenses.stripNotices(fs.readFileSync(path.join(temporary, 'stable/index.js'), 'utf8')), historicalStable, 'older releases regain notices without code changes');

    const registry = JSON.parse(fs.readFileSync(path.join(temporary, 'licenses.json'), 'utf8'));
    registry.entries[0].licenseFile = '../outside.txt';
    fs.writeFileSync(path.join(temporary, 'licenses.json'), JSON.stringify(registry));
    assert.throws(() => licenses.loadRegistry(temporary), /Invalid license file/);
    registry.entries[0].licenseFile = 'LICENSES/MIT-original.txt';
    registry.entries.find(entry => entry.id === 'upstream-unconfirmed').license = 'MIT';
    fs.writeFileSync(path.join(temporary, 'licenses.json'), JSON.stringify(registry));
    assert.throws(() => licenses.loadRegistry(temporary), /Unconfirmed component cannot claim a license/);
} finally {
    fs.rmSync(temporary, {recursive: true, force: true});
}

// Pin the one release whose change in this task is strictly notices-only.
const stable = licenses.stripNotices(fs.readFileSync('stable/index.js', 'utf8'));
if (/version:\s*'0\.47\.21'/.test(stable)) {
    assert.strictEqual(crypto.createHash('sha256').update(stable).digest('hex'), 'bcf6157314e68f6696a857270541a7957ea85aa2759be610ba3dede12ca6dd11');
}
const pages = fs.readFileSync('.github/workflows/pages.yml', 'utf8');
assert.match(pages, /cp -R LICENSES _pages\//);
assert.match(pages, /cp LICENSE licenses\.json THIRD_PARTY_NOTICES\.md _pages\//);
const releaseWorkflow = fs.readFileSync('.github/workflows/release.yml', 'utf8');
assert.match(releaseWorkflow, /LICENSE THIRD_PARTY_NOTICES\.md licenses\.json LICENSES\/\*\.txt/);
console.log('License packaging: scoped grants, deterministic offline data, body-preserving notices, promotion and publication assets passed');

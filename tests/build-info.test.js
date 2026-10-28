'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const {execFileSync, spawnSync} = require('child_process');
const buildInfo = require('../scripts/build-info');

const revision = 'a'.repeat(40);
const fixed = '2026-10-26T08:24:41.000Z';
const calls = [];
function metadata(status, env) {
    return buildInfo.create({root: '/unused', version: '1.2.3', now: () => new Date(fixed), env: env || {}, git: args => {
        calls.push(args);
        if (args[0] === 'rev-parse') return revision;
        if (args[0] === 'status') return status;
        if (args[0] === 'remote') return 'git@github.com:Example/Fork.git';
        throw new Error('Unexpected git operation');
    }});
}
const local = metadata(' M src/ui.js');
assert.strictEqual(local.commit, revision);
assert.strictEqual(local.shortCommit, 'aaaaaaa');
assert.strictEqual(local.builtAt, fixed);
assert.strictEqual(local.dirty, true);
assert.strictEqual(local.repository, 'https://github.com/Example/Fork');
assert.strictEqual(local.channel, 'local');
assert.strictEqual(metadata('').dirty, false);
assert.strictEqual(metadata(null).dirty, null, 'missing Git information must not claim a clean build');
assert.ok(calls.find(args => args[0] === 'status').includes(':(exclude)dist/build-info.json'));
assert.strictEqual(buildInfo.repositoryUrl('https://user:password@example.com/org/repo.git?token=secret'), 'https://example.com/org/repo');
assert.strictEqual(buildInfo.repositoryUrl('ssh://git@github.com/Example/Fork.git'), 'https://github.com/Example/Fork');
assert.strictEqual(buildInfo.repositoryUrl('not a repository'), null);
const ciRevision = 'b'.repeat(40);
const ci = metadata('', {GITHUB_ACTIONS: 'true', GITHUB_SHA: ciRevision, GITHUB_REPOSITORY: 'Owner/Plugin', GITHUB_SERVER_URL: 'https://github.com'});
assert.strictEqual(ci.commit, ciRevision);
assert.strictEqual(ci.channel, 'github-actions');
assert.strictEqual(ci.repository, 'https://github.com/Owner/Plugin');
assert.deepStrictEqual(buildInfo.read(buildInfo.block(ci)), ci);
assert.throws(() => buildInfo.read('var version = 1;'), /no build metadata/);
const unknown = buildInfo.create({version: '1.2.3', now: () => fixed, env: {}, git: () => null});
assert.strictEqual(unknown.commit, null);
assert.strictEqual(unknown.builtAt, fixed, 'unversioned local builds still have a real build timestamp');
assert.strictEqual(unknown.repository, null);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'yani-build-info-'));
try {
    const builder = fs.readFileSync('build.js', 'utf8');
    const modules = vm.runInNewContext(builder.match(/const modules = (\[[^;]+\]);/)[1]);
    modules.push('src/episode.js');
    modules.forEach(file => {
        fs.mkdirSync(path.dirname(path.join(temp, file)), {recursive: true});
        fs.writeFileSync(path.join(temp, file), file === 'src/config.js' ? "window.LampaYaniConfig = {version: '1.2.3'};\n" : '// ' + file + '\n');
    });
    fs.mkdirSync(path.join(temp, 'scripts'), {recursive: true});
    fs.copyFileSync('scripts/build-info.js', path.join(temp, 'scripts/build-info.js'));
    fs.copyFileSync('scripts/licenses.js', path.join(temp, 'scripts/licenses.js'));
    fs.copyFileSync('licenses.json', path.join(temp, 'licenses.json'));
    fs.cpSync('LICENSES', path.join(temp, 'LICENSES'), {recursive: true});
    fs.writeFileSync(path.join(temp, 'build.js'), builder);
    fs.writeFileSync(path.join(temp, 'style.css'), '.test {color: #333;}\n');
    const env = Object.assign({}, process.env, {GITHUB_ACTIONS: 'true', GITHUB_SHA: ciRevision, GITHUB_REPOSITORY: 'Owner/Plugin'});
    const command = args => execFileSync(process.execPath, ['build.js'].concat(args), {cwd: temp, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
    const before = Date.now();
    command([]);
    const bundle = fs.readFileSync(path.join(temp, 'dist/index.js'), 'utf8');
    const manifest = fs.readFileSync(path.join(temp, 'dist/build-info.json'), 'utf8');
    const info = JSON.parse(manifest);
    assert.ok(Date.parse(info.builtAt) >= before && Date.parse(info.builtAt) <= Date.now(), 'stamp records assembly time, not commit time or runtime');
    assert.strictEqual(info.commit, ciRevision);
    assert.deepStrictEqual(buildInfo.read(bundle), info);
    assert.strictEqual(fs.readFileSync(path.join(temp, 'dist/build-info.js'), 'utf8'), buildInfo.script(info));
    command(['--check']);
    assert.strictEqual(fs.readFileSync(path.join(temp, 'dist/index.js'), 'utf8'), bundle, 'verification cannot restamp an existing bundle');
    assert.strictEqual(fs.readFileSync(path.join(temp, 'dist/build-info.json'), 'utf8'), manifest);
    fs.appendFileSync(path.join(temp, 'src/i18n.js'), '// actual source change\n');
    let result = spawnSync(process.execPath, ['build.js', '--check'], {cwd: temp, env, encoding: 'utf8'});
    assert.notStrictEqual(result.status, 0, 'source mismatch must fail even though metadata may vary between builds');
    command([]);
    fs.writeFileSync(path.join(temp, 'dist/build-info.json'), '{}\n');
    result = spawnSync(process.execPath, ['build.js', '--check'], {cwd: temp, env, encoding: 'utf8'});
    assert.notStrictEqual(result.status, 0, 'manifest mismatch cannot pass verification');
} finally {
    fs.rmSync(temp, {recursive: true, force: true});
}
console.log('Build metadata: source revision, actual assembly time, safe origin, CI stamps and timestamp-independent source verification passed');

for (const file of ['validate.yml', 'pages.yml', 'release.yml']) {
    const workflow = fs.readFileSync(path.join('.github/workflows', file), 'utf8');
    assert.ok(workflow.indexOf('run: node build.js --check') < workflow.indexOf('run: node build.js\n'), file + ' must verify committed content before creating a fresh stamp');
    assert.doesNotMatch(workflow, /git diff --(?:exit-code).*dist\/index\.js/, 'fresh timestamps cannot be compared to committed local timestamps');
}
assert.match(fs.readFileSync('.github/workflows/pages.yml', 'utf8'), /cp -R dist assets status src docs _pages\//, 'preview and source-loader dependencies must be hosted');
const preview = fs.readFileSync('docs/mockups/tv-next/index.html', 'utf8');
assert.ok(preview.indexOf('../../../dist/build-info.js') < preview.indexOf('app.js?v='), 'preview receives build identity before rendering Settings');

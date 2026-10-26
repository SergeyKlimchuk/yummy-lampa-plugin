'use strict';

const {execFileSync} = require('child_process');

const START = '    // YUMMY_BUILD_INFO_START\n';
const END = '    // YUMMY_BUILD_INFO_END\n';
const GENERATED = ['dist/index.js', 'dist/build-info.json', 'dist/build-info.js'];

function gitRead(root, args) {
    try {
        return execFileSync('git', args, {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();
    } catch (error) {
        return null;
    }
}

function repositoryUrl(value) {
    const text = String(value || '').trim().replace(/^git@([^:]+):/, 'https://$1/');
    try {
        const url = new URL(text);
        if (!['https:', 'http:', 'ssh:'].includes(url.protocol) || !url.hostname) return null;
        const pathname = url.pathname.replace(/\.git\/?$/, '').replace(/\/$/, '');
        if (!/^\/[\w.-]+\/[\w.-]+$/.test(pathname)) return null;
        return 'https://' + url.host + pathname;
    } catch (error) {
        return null;
    }
}

function create(options) {
    options = options || {};
    const env = options.env || process.env;
    const git = options.git || function (args) { return gitRead(options.root, args); };
    const ci = env.GITHUB_ACTIONS === 'true';
    const revision = ci && /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/i.test(env.GITHUB_SHA || '') ? env.GITHUB_SHA : git(['rev-parse', 'HEAD']);
    const commit = /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/i.test(revision || '') ? revision.toLowerCase() : null;
    // Generated artifacts describe the build; they cannot make their own source dirty.
    const status = git(['status', '--porcelain', '--untracked-files=normal', '--', '.', ...GENERATED.map(file => ':(exclude)' + file)]);
    const origin = git(['remote', 'get-url', 'origin']);
    const ciRepository = ci && /^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY || '')
        ? repositoryUrl((env.GITHUB_SERVER_URL || 'https://github.com') + '/' + env.GITHUB_REPOSITORY) : null;
    const instant = options.now ? options.now() : new Date();
    const date = instant instanceof Date ? instant : new Date(instant);
    if (!Number.isFinite(date.getTime())) throw new Error('Invalid build timestamp');
    return {
        schemaVersion: 1,
        version: options.version,
        commit: commit,
        shortCommit: commit ? commit.slice(0, 7) : null,
        builtAt: date.toISOString(),
        dirty: status === null ? null : Boolean(status),
        channel: ci ? 'github-actions' : 'local',
        repository: ciRepository || repositoryUrl(origin)
    };
}

function script(info) {
    // Keep exactly the same object in the bundle, JSON manifest and preview script.
    return 'window.LampaYaniBuild = ' + JSON.stringify(info) + ';\n';
}

function block(info) {
    return START + '    ' + script(info) + END;
}

function read(bundle) {
    const start = bundle.indexOf(START);
    const end = bundle.indexOf(END, start + START.length);
    if (start < 0 || end < 0) throw new Error('Bundle has no build metadata. Run node build.js and commit dist artifacts.');
    const source = bundle.slice(start + START.length, end).trim();
    const match = /^window\.LampaYaniBuild = (\{[^\n]*\});$/.exec(source);
    if (!match) throw new Error('Invalid embedded build metadata');
    const info = JSON.parse(match[1]);
    if (info.schemaVersion !== 1 || !/^\d+\.\d+\.\d+$/.test(info.version || '') ||
        !Number.isFinite(Date.parse(info.builtAt || '')) ||
        !['local', 'github-actions'].includes(info.channel) ||
        info.commit !== null && !/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(info.commit) ||
        info.shortCommit !== (info.commit ? info.commit.slice(0, 7) : null) ||
        ![true, false, null].includes(info.dirty)) throw new Error('Invalid embedded build metadata values');
    return info;
}

module.exports = {create, repositoryUrl, script, block, read};

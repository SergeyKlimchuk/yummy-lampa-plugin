const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// Runtime navigation and request budgets are exercised by ui-home's behavioral
// tests. This checks the production wiring, so a correct isolated module cannot
// accidentally be omitted from the installable plugin.
const ui = fs.readFileSync('src/ui.js', 'utf8');
const source = fs.readFileSync('src/ui-home.js', 'utf8');
const build = fs.readFileSync('build.js', 'utf8');
const context = {window: {}};
vm.runInNewContext(source, context);
assert.strictEqual(typeof context.window.LampaYaniHome.create, 'function');
assert.ok(context.window.LampaYaniHome.limits.continueWatching <= 3, 'home preview must stay bounded');
assert.ok(context.window.LampaYaniHome.limits.ongoing <= 6, 'home catalog preview must stay bounded');

const homeModule = build.indexOf("'src/ui-home.js'");
const uiModule = build.indexOf("'src/ui.js'");
assert.ok(homeModule !== -1 && homeModule < uiModule, 'home factory must load before the UI adapter');
assert.match(ui, /LampaYaniHome\.create\(object,/);

// Replacing the landing page must leave the existing account/list/playback
// components registered under their stable navigation identifiers.
[
    'yani_catalog', 'yani_user_lists', 'yani_account_list', 'yani_detail',
    'yani_history', 'yani_schedule', 'yani_new_translations', 'yani_account',
    'yani_notifications', 'yani_auth', 'yani_player'
].forEach((name) => {
    assert.ok(ui.includes("Lampa.Component.add('" + name + "',"), name + ' must remain available');
});

console.log('lightweight home production integration checks passed');

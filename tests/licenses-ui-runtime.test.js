'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const {tvEnvironment, $} = require('./helpers/tv-dom');

function setup(data) {
    const env = tvEnvironment(), opened = [], wheels = [], updates = [];
    let returned = 0, position = 0, destroyedScroll = 0;
    env.context.Lampa.Scroll = function () {
        const view = $('<div class="scroll"></div>');
        this.minus = () => {};
        this.render = () => view;
        this.append = value => view.append(value);
        this.update = (element, center) => updates.push({element:element[0], center});
        this.wheel = value => { wheels.push(value); position = Math.min(0, position - value); };
        this.position = () => position;
        this.reset = () => { position = 0; };
        this.destroy = () => { destroyedScroll++; view.remove(); };
    };
    env.context.fetch = () => { throw new Error('license views must work without a network'); };
    env.load('i18n.js'); env.load('license-data.js'); env.load('ui-licenses.js');
    const registry = data || env.context.LampaYaniLicenseData;
    const comp = env.context.LampaYaniLicenses.create({}, {data:registry, t:env.context.LampaYaniI18n.t,
        openSource:url => opened.push(url), goBack:() => returned++});
    env.mount(comp); comp.start();
    return Object.assign(env, {comp, registry, opened, wheels, updates, returned:()=>returned, destroyedScroll:()=>destroyedScroll,
        row:id => comp.render().find('[data-yani-license-id="'+id+'"]')});
}

{
    const env=setup(), c=()=>env.controls.content;
    assert.equal(env.comp.render().find('.yani-licenses__entry').length, env.registry.entries.length);
    assert.equal(env.comp.render().find('pre').length, 0, 'the list must not mount all legal texts');
    assert.equal(env.focusCalls.at(-1), env.row('upstream-mit')[0]);
    c().down(); assert.equal(env.focusCalls.at(-1),env.row('fork-mit')[0], 'Down selects the next component');
    c().up(); env.row('upstream-mit').trigger('hover:enter');
    assert.equal(env.comp.render().find('pre').length,1);
    assert.equal(env.comp.render().find('pre').text(),env.registry.entries[0].licenseText,'legal text is complete and unchanged');
    const source=env.comp.render().find('.yani-licenses__source').first();
    source.trigger('hover:enter'); assert.equal(env.opened.length,1);
    const reader=env.comp.render().find('pre');
    c().down(); assert.equal(env.focusCalls.at(-1),reader[0]);
    assert.equal(env.updates.at(-1).center,false,'a long text starts at its top, not its middle');
    c().down(); assert.equal(env.wheels.at(-1),250);
    c().up(); assert.equal(env.wheels.at(-1),-250);
    c().up(); assert.equal(env.focusCalls.at(-1),source[0]);
    c().back(); assert.equal(env.comp.render().find('pre').length,0); assert.equal(env.returned(),0);
    assert.equal(env.focusCalls.at(-1), env.row('upstream-mit')[0], 'Back restores the selected list row');
    source.trigger('hover:enter'); assert.equal(env.opened.length,1,'late events from the old detail are ignored');
    env.row('upstream-unconfirmed').trigger('hover:enter');
    assert.equal(env.comp.render().find('pre').length,0);
    assert.match(env.comp.render().find('.yani-licenses__status').text(),/не подтверждена/);
    assert.match(env.comp.render().find('.yani-licenses__no-text').text(),/не предоставляют разрешение/);
    c().back(); assert.equal(env.focusCalls.at(-1),env.row('upstream-unconfirmed')[0]);
    c().back(); assert.equal(env.returned(),1,'second Back returns to the settings activity');
    env.comp.destroy(); assert.equal(env.destroyedScroll(),1);
}

{
    const env=setup({entries:[{id:'unsafe',title:'<img src=x onerror=evil()>',license:'<script>bad()</script>',status:'invented',
        scope:'<b>Not HTML</b>',notice:'<svg onload=evil()>',licenseText:'<script>not executable</script>', sources:[
            {title:'unsafe',url:'javascript:evil()'},{title:'invalid',url:'https://'},{title:'data',url:'data:text/html,evil'},
            {title:'<img src=x>',url:'https://example.test/license'}]}]});
    assert.equal(env.comp.render().find('img').length,0);
    env.row('unsafe').trigger('hover:enter');
    assert.equal(env.comp.render().find('script').length,0); assert.equal(env.comp.render().find('img').length,0);
    assert.equal(env.comp.render().find('pre').text(),'<script>not executable</script>');
    assert.equal(env.comp.render().find('.yani-licenses__source').length,1,'only HTTP(S) sources are actionable');
    assert.match(env.comp.render().find('.yani-licenses__status').text(),/не подтверждена/,'unknown statuses must never become a confirmed grant');
    const source=env.comp.render().find('.yani-licenses__source');
    env.comp.pause(); source.trigger('hover:enter'); env.controls.content.back(); assert.equal(env.opened.length,0); assert.equal(env.returned(),0);
    env.comp.start(); source.trigger('hover:enter'); assert.deepEqual(env.opened,['https://example.test/license']);
    env.comp.destroy(); env.comp.destroy(); source.trigger('hover:enter'); env.controls.content.back();
    assert.equal(env.opened.length,1); assert.equal(env.returned(),0); assert.equal(env.destroyedScroll(),1);
}

{
    const env=setup({entries:[]});
    assert.match(env.comp.render().find('.yani-licenses__empty').text(),/отсутствуют/);
    env.controls.content.back(); assert.equal(env.returned(),1); env.comp.destroy();
}

// The real settings opener must hide native Lampa's overlay while the license
// activity owns focus, then restore its original controller and exact snapshot.
const rootSource=fs.readFileSync('src/ui.js','utf8');
const start=rootSource.indexOf('    var licensesReturnSnapshot = null;');
const end=rootSource.indexOf('    function addSettings()',start);
assert.ok(start>=0&&end>start);
for (const native of [false,true]) {
    const body=$('<body></body>'), settings=$('<div class="settings"></div>');
    if(native){body.addClass('settings--open');settings.addClass('animate animate-down');}
    const snapshot={controller:native?'settings_component':'content',element:{id:'licenses-button'}}, restored=[];
    let pushed,dep,backs=0;
    const context={window:{LampaYaniLicenses:{create:(object,deps)=>{dep=deps;return {};}}},
        $:value=>value==='body'?body:value==='.settings'?settings:$(value),
        Lampa:{Activity:{push:object=>{pushed=object;}}},t:key=>key,
        transientNavigationSnapshot:()=>snapshot,restoreTransientInteraction:value=>restored.push(value),
        openExternalUri:()=>{},goBack:()=>{backs++;}};
    vm.runInNewContext(rootSource.slice(start,end),context);
    context.openLicenses(); assert.equal(pushed.component,'yani_licenses');
    assert.equal(body.hasClass('settings--open'),false);
    if(native)assert.equal(settings.hasClass('animate'),false);
    context.LicensesPage({}); dep.goBack();
    assert.equal(backs,1);assert.strictEqual(restored[0],snapshot);
    assert.equal(body.hasClass('settings--open'),native);
    assert.equal(settings.hasClass('animate'),native);assert.equal(settings.hasClass('animate-down'),native);
}
console.log('License UI: offline texts, scope, D-pad, reader, safe sources, lifecycle and native settings return passed');

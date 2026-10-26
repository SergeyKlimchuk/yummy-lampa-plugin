'use strict';
const assert = require('assert');
const {tvEnvironment,$} = require('./helpers/tv-dom');

function setup() {
    const env = tvEnvironment(), values = {}, callbacks = [], panels = [];
    $.contains = (parent, child) => { for (let current = child; current; current = current.parentNode) if (current === parent) return true; return false; };
    env.context.Lampa.Storage = {get:(key,fallback)=>key in values ? values[key] : fallback,set:(key,value)=>values[key]=value};
    env.context.window.LampaYaniChoicePanel = {show(options) {
        const panel = {options,destroyed:false,destroy(){this.destroyed=true;if(options.onClose)options.onClose('destroy');}};
        panels.push(panel);return panel;
    }};
    env.load('ui-settings-page.js');
    const definitions = [
        {param:{name:'yani_account_title',type:'title'},field:{name:'Account'}},
        {param:{name:'auth',type:'button'},field:{name:'Sign in'},onChange(){callbacks.push(['button']);},onRender(row){row.find('.settings-param__descr').text('Actual account status');}},
        {param:{name:'yani_interface_title',type:'title'},field:{name:'Interface'}},
        {param:{name:'scale',type:'select',values:{auto:'Auto',150:'150%'},default:'auto'},field:{name:'Scale'},onRender(){this.param.values.auto='Auto (130%)';}},
        {param:{name:'yani_playback_title',type:'title'},field:{name:'Playback'}},
        {param:{name:'source',type:'select',values:{auto:'Automatic',kodik:'Kodik'},default:'auto'},field:{name:'Source',description:'Preferred source'},onChange(value){callbacks.push(['source',value,values.source]);}},
        {param:{name:'next',type:'trigger',default:false},field:{name:'Next episode'},onChange(value){callbacks.push(['trigger',value,values.next]);}},
        {param:{name:'voice',type:'button'},field:{name:'Voice'},onRender(row){row.find('.settings-param__value').text(values.voice || 'Auto');},onChange(){values.voice='Example voice';}},
        {param:{name:'yani_display_sources_title',type:'title'},field:{name:'Sources'}},
        {param:{name:'show_kodik',type:'trigger',default:true},field:{name:'Kodik'}},
        {param:{name:'yani_home_sections_title',type:'title'},field:{name:'Home sections'}},
        {param:{name:'show_home',type:'trigger',default:true},field:{name:'Home'}},
        {param:{name:'yani_build_title',type:'title'},field:{name:'Build'}},
        {param:{name:'yani_build_commit',type:'title'},field:{name:'Commit: abcdef0'}},
        {param:{name:'yani_about_title',type:'title'},field:{name:'About'}},
        {param:{name:'website',type:'button'},field:{name:'Website'},onChange(){callbacks.push(['website']);}}
    ];
    // Native definitions may close over their own object rather than `this`.
    definitions[3].onRender=()=>{definitions[3].param.values.auto='Auto (130%)';};
    const component=env.context.LampaYaniSettingsPage.create({}, {t:key=>({settings:'Settings',settings_playback_section:'Playback',settings_interface_section:'Interface',settings_account_section:'Account',settings_build_section:'Build',settings_enabled:'Enabled',settings_disabled:'Disabled'}[key]||key),definitions:()=>definitions});
    env.mount(component);component.start();
    function row(key){return component.render().find('[data-yani-settings-key="'+key+'"]');}
    return Object.assign(env,{component,values,callbacks,panels,definitions,row});
}
{
    const env=setup(),groups=env.context.LampaYaniSettingsPage.groupDefinitions(env.definitions);
    assert.equal(groups.playback.length,6,'sources stay under playback');
    assert.equal(groups.interface.length,4,'home settings stay under interface');
    assert.equal(groups.account.length,2);assert.equal(groups.build.length,4);
    assert.equal(env.row('source').find('.settings-param__value').text(),'Automatic');
    let controller;env.component.on('controller',value=>controller=value);env.component.start();assert.equal(controller,env.controls.content,'shell receives the actual content controller');
    env.row('source').trigger('hover:enter');
    const choice=env.panels[0].options;
    assert.equal(choice.origin[0],env.row('source')[0]);assert.equal(choice.items[0].selected,true);
    choice.onSelect(choice.items[1]);
    assert.equal(env.values.source,'kodik');assert.deepEqual(env.callbacks[0],['source','kodik','kodik'],'Storage is written before native callback just as host Settings does');
    assert.equal(env.row('source').find('.settings-param__value').text(),'Kodik');
    env.row('next').trigger('hover:enter');env.panels[1].options.onSelect(env.panels[1].options.items[0]);
    assert.strictEqual(env.values.next,true);assert.deepEqual(env.callbacks[1],['trigger',true,true]);
    assert.equal(env.row('next').find('.settings-param__value').text(),'Enabled');
    env.row('voice').trigger('hover:enter');assert.equal(env.row('voice').find('.settings-param__value').text(),'Example voice','button onRender remains responsible for current custom value');
    env.component.destroy();
}
{
    const env=setup();env.row('tab:interface').trigger('hover:enter');
    assert.equal(env.row('scale').find('.settings-param__value').text(),'Auto (130%)','dynamic onRender refreshes real select values');
    env.row('scale').trigger('hover:focus');env.values.scale='150';env.component.pause();env.component.start();
    assert.equal(env.row('scale').find('.settings-param__value').text(),'150%');
    assert.equal(env.focusCalls.at(-1),env.row('scale')[0],'resume preserves focused setting instead of rebuilding rows');
    env.row('tab:build').trigger('hover:enter');
    assert.equal(env.component.render().find('.yani-settings__static').text(),'Commit: abcdef0');
    assert.equal(env.component.render().find('.yani-settings__row').length,1,'read-only build fields do not add D-pad stops');
    env.row('website').trigger('hover:enter');assert.deepEqual(env.callbacks,[['website']]);
    env.row('tab:account').trigger('hover:enter');assert.equal(env.row('auth').find('.settings-param__descr').text(),'Actual account status');
    env.row('auth').trigger('hover:enter');assert.deepEqual(env.callbacks.at(-1),['button']);
    env.component.destroy();
}
{
    const env=setup();env.row('source').trigger('hover:enter');const panel=env.panels[0];
    env.component.pause();assert.equal(panel.destroyed,true,'pause closes owned panel');assert.equal(panel.options.valid(),false);
    panel.options.onSelect(panel.options.items[1]);assert.equal(env.values.source,undefined,'late choice cannot write after pause');
    env.component.start();env.row('source').trigger('hover:enter');const last=env.panels.at(-1);env.component.destroy();env.component.destroy();
    assert.equal(last.destroyed,true);assert.equal(last.options.valid(),false);last.options.onSelect(last.options.items[1]);assert.equal(env.values.source,undefined,'destroyed settings ignore late writes');
}
console.log('Settings page runtime tests passed');

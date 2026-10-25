'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('src/ui-detail.js','utf8');
function group(names){const g={names};g.nodes=names.map(name=>({name,group:g,kind:names.length===4?'action':'category'}));return g;}
const actions=group(['watch','open','trailers','subscribe']),categories=group(['watching','planned','completed','dropped','postponed','favorite']);
let current=actions.nodes[0],selected=categories.nodes[1],focused;
function wrap(node) {
    return {
        0:node, length:node?1:0, jquery:true,
        first(){return this;},
        hasClass(name){return name==='yani-detail__list-action'&&node&&node.kind==='category';},
        attr(){return '';},
        closest(sel){return {length:node&&((sel.includes('__actions')&&node.kind==='action')||(sel.includes('__list-panel')&&node.kind==='category'))?1:0};},
        parent(){
            return {children(){return {
                length:node.group.nodes.length,
                index(w){return node.group.nodes.indexOf(w[0]);},
                eq(i){return wrap(node.group.nodes[i]);}
            };}};
        }
    };
}
const c={document:{documentElement:{contains:()=>true}},$:wrap,button:wrap(actions.nodes[0]),lastPrimaryAction:null,
 focusedDetailElement:()=>wrap(current),focusDetailElement:w=>{focused=w[0];current=focused;return !!focused;},detailVerticalTarget:()=>wrap(null),
 html:{find:s=>wrap(s.includes('.active')?selected:categories.nodes[0])}};
vm.runInNewContext(source.slice(source.indexOf('        function moveDetailVertical('),source.indexOf('        function bindDetailScrollTargets')),c);
current=actions.nodes[3];assert.strictEqual(c.moveDetailVertical('down'),true);assert.strictEqual(focused,categories.nodes[1],'one Down reaches the current category');
assert.strictEqual(c.moveDetailVertical('up'),true);assert.strictEqual(focused,actions.nodes[3],'one Up returns to the actual previous action');
selected=null;current=actions.nodes[0];c.moveDetailVertical('down');assert.strictEqual(focused,categories.nodes[0],'unknown category starts at Watching');
current=categories.nodes[0];c.moveDetailHorizontal('right');assert.strictEqual(focused,categories.nodes[1]);
c.moveDetailHorizontal('left');assert.strictEqual(focused,categories.nodes[0]);
c.moveDetailHorizontal('left');assert.strictEqual(current,categories.nodes[0],'category boundary must stay in its strip, not jump to a distant poster');
current=actions.nodes[0];c.moveDetailHorizontal('right');assert.strictEqual(focused,actions.nodes[1],'Open follows Watch');
assert.match(source,/button && button\.length \? button : titleFocus/,'a fresh detail opens on Watch');
console.log('Priority navigation passed: Watch first, one-key category access, action return and horizontal strips without geometry scans');

'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const css = fs.readFileSync('style.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
// A desktop FPS result cannot enforce a budget on a television. Keep the costly
// paint/compositing primitives out of the shipped stylesheet on every screen.
assert.doesNotMatch(css, /(?:linear|radial|conic)-gradient\(/, 'plugin surfaces must be flat');
assert.doesNotMatch(css, /@(?:-webkit-)?keyframes\b/, 'plugin must not ship continuous/entrance animation');
const declarations = Array.from(css.matchAll(/(?:^|[;{])\s*([\w-]+)\s*:\s*([^;{}]+)/g));
declarations.forEach(([,property,value]) => {
    if (/^(?:(?:-webkit-)?(?:backdrop-filter|filter|animation|transition)|(?:box|text)-shadow)$/.test(property)) {
        assert.match(value.trim(), /^none(?:\s*!important)?$/, property + ' must not introduce extra paint work');
    }
});
assert.match(css, /\.yani-lite-view \.scroll--mask\s*\{[^}]*mask-image:\s*none/, 'native list edge masks must also be disabled');
assert.match(css, /\.yani-lite-view \.card\.focus \.card__view[^}]*outline:/, 'flat focus remains visible with remote navigation');
assert.match(css, /\.yani-lite-view \.card\.focus[^}]*transform:\s*none/, 'focus must not scale the card grid');
assert.doesNotMatch(css, /@(?:import|font-face)\b/, 'use the host font without more network/decode work');

// Both supported distribution entry points must load the same dependencies in
// order; a missing module can otherwise silently leave only some screens usable.
const build = fs.readFileSync('build.js', 'utf8');
const declaration = build.match(/const modules = (\[[^;]+\]);/)[1];
const modules = vm.runInNewContext(declaration);
modules.splice(modules.indexOf('src/stream-resolver.js'), 0, 'src/episode.js');
const loader = fs.readFileSync('index.js', 'utf8');
const actual = vm.runInNewContext(loader.match(/var scripts = (\[[^;]+\]);/)[1]);
assert.deepStrictEqual(Array.from(actual), Array.from(modules), 'development loader follows the built bundle exactly');
console.log('All-screen TV paint budget and loader dependency parity passed');

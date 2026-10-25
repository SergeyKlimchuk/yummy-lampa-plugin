const assert = require('assert');
const fs = require('fs');

// These are intentional rendering constraints for the TV landing page. Other
// pages keep their own CSS and are outside this lightweight-home contract.
const css = fs.readFileSync('style.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const homeRules = Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g)).filter((match) =>
    /\.yani-(?:lite-|home--lite)/.test(match[1]));
assert.ok(homeRules.length > 0, 'production CSS must include the lightweight home');
const homeCss = homeRules.map((match) => match[0]).join('\n');
['#292929', '#333333', '#ff6666'].forEach((color) => {
    assert.ok(homeCss.toLowerCase().includes(color), 'requested palette color must be present: ' + color);
});
homeRules.forEach((match) => {
    const selector = match[1].trim();
    const declarations = match[2];
    const properties = Array.from(declarations.matchAll(/(?:^|;)\s*([\w-]+)\s*:\s*([^;]+)/g));
    properties.forEach((property) => {
        if (/^(?:-webkit-)?(?:backdrop-filter|filter)$/.test(property[1])) {
            assert.match(property[2].trim(), /^none(?:\s*!important)?$/, selector + ' must not blur the TV surface');
        }
        if (/^(?:-webkit-)?animation(?:-name)?$/.test(property[1])) {
            assert.match(property[2].trim(), /^(?:none|0(?:s|ms)?)(?:\s*!important)?$/, selector + ' must not animate continuously');
        }
    });
});

assert.doesNotMatch(css, /@(?:-webkit-)?keyframes\s+yani-home-/, 'obsolete wave/orbit/pulse animations must be removed');
assert.doesNotMatch(homeCss, /(?:radial|linear)-gradient\(/, 'flat home surfaces must not retain decorative gradient layers');
assert.ok(homeRules.some((match) => /\.focus(?:\b|:)/.test(match[1]) && /(?:outline|border-color)\s*:/.test(match[2])),
    'TV remote focus needs a visible outline or border without a scaling animation');

console.log('lightweight home palette and rendering-budget checks passed');

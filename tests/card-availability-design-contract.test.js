const assert = require('assert');
const fs = require('fs');

const cards = fs.readFileSync('src/ui-card-renderers.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

assert.match(cards, /function cardMediaMotionAllowed\(\)/);
assert.match(cards, /yani-card-media__availability/);
assert.match(cards, /yani-card-media__availability-part yani-card-media__quality/);
assert.match(cards, /yani-card-media__availability-part yani-card-media__voices/);
assert.match(cards, /function cardMediaMotionAllowed\(\)[\s\S]{0,300}return false/, 'TV card decoration is static on every device');

assert.match(css, /\.yani-card-media__availability \{/);
assert.doesNotMatch(css, /@keyframes yani-card-availability-in/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
assert.doesNotMatch(css, /\.yani-card-media__quality \{ background: #f1c40f/);

console.log('card availability design contract checks passed');

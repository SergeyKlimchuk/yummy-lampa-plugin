// Episode schedule, translation metadata and card rendering remain available
// independently of the removed decorative homepage timeline.
const assert = require('assert');
const fs = require('fs');

const api = fs.readFileSync('src/api.js', 'utf8');
const ui = fs.readFileSync('src/ui.js', 'utf8');
const model = fs.readFileSync('src/ui-card-model.js', 'utf8');
const translations = fs.readFileSync('src/ui-translations.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

assert.match(api, /feed: function \(control\)/);
assert.match(api, /request\('\/feed'/);
assert.match(ui, /Lampa\.Component\.add\('yani_schedule', Schedule\)/);
assert.match(ui, /Lampa\.Component\.add\('yani_new_translations', NewTranslations\)/);
assert.match(ui, /LampaYaniTranslations\.component/);
assert.match(translations, /value\.new_videos/);
assert.match(translations, /video\.dub_title/);
assert.match(translations, /yani_update_label/);
assert.match(model, /window\.LampaYaniUiUtils\.posterSources/);
assert.match(fs.readFileSync('src/ui-utils.js', 'utf8'), /value\.huge \|\| value\.mega \|\| value\.fullsize/);
assert.match(css, /\.yani-card-update[^}]*text-overflow: ellipsis/);

console.log('episode flow contract checks passed');

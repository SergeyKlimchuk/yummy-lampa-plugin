// Shared transport cancellation remains required by all pages, including the lightweight home.
const assert = require('assert');
const fs = require('fs');

const api = fs.readFileSync('src/api.js', 'utf8');

assert.match(api, /var externalSignal = options && options\.signal/);
assert.match(api, /externalSignal\.addEventListener\('abort', abortRequest/);
assert.match(api, /externalSignal\.removeEventListener\('abort', abortRequest/);
assert.match(api, /method === 'GET' && options\.dedupe !== false && !options\.signal/);
assert.match(api, /schedule: function \(control\)/);
assert.match(api, /lastWatches: function \(watches, control\)/);
assert.match(api, /watchHistory: function \(limit, offset, control\)/);



console.log('dashboard lifecycle contract checks passed');

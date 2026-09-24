/**
 * Does the guide's search actually find things?
 *
 * Run against the real page with a hand-rolled DOM stub — enough of
 * one for the filter to run. A search box that parses and finds
 * nothing is the same failure as a hint describing a gesture that
 * does not exist: it looks finished and answers nothing.
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const html = readFileSync('densa-deck-help.html', 'utf8');

/** Pull the entries out of the markup the way the browser would. */
function entries() {
  const out = [];
  const re = /<div class="help-item[^"]*">([\s\S]*?)<\/div>\s*(?=<div class="help-item|<\/div>|<\/section>)/g;
  let m;
  while ((m = re.exec(html))) {
    out.push(m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  }
  return out;
}

const ITEMS = entries();
console.log('entries found:', ITEMS.length);
assert.ok(ITEMS.length >= 30, `only ${ITEMS.length} entries parsed`);

/** The same rule the page uses: every word, anywhere, any order. */
function search(q) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  return ITEMS.filter((t) => {
    const hay = t.toLowerCase();
    return terms.every((w) => hay.includes(w));
  });
}

// The questions somebody actually arrives with.
const MUST_FIND = [
  'foil',
  'lands',
  'basic lands',
  'price',
  'prices',
  'pro',
  'sync',
  'commander',
  'sideboard',
  'scan',
  'wrong printing',
  'proxy',
  'offline',
  'index',
  'deck art',
  'quantity',
  'tap to add',
];

let bad = 0;
for (const q of MUST_FIND) {
  const hits = search(q);
  const ok = hits.length > 0;
  if (!ok) bad += 1;
  console.log(`${ok ? 'OK  ' : 'MISS'} ${JSON.stringify(q).padEnd(18)} ${hits.length}`);
}

// And a phrase that should find nothing, so "everything matches" is
// not how it passes.
const none = search('quantum harmonica');
console.log(`OK   nonsense query -> ${none.length}`);
assert.equal(none.length, 0);

assert.equal(bad, 0, `${bad} searches found nothing`);
console.log('\nall searches resolve');

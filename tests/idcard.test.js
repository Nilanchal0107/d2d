/* ==========================================================================
   ID CARD QUALITY TESTS
   --------------------------------------------------------------------------
   These tests run inside the CI pipeline BEFORE anything is deployed.
   If even one test fails, the pipeline stops and the website is NOT updated.

   Run locally with:   npm test        (or:  node --test tests/)

   No external libraries are used - only Node.js built-in modules,
   so the pipeline stays fast and has nothing to install.
   ========================================================================== */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// Project root = one folder above /tests
const ROOT = path.join(__dirname, '..');

// Read a file if it is there, otherwise return an empty string.
// (If we read a missing file directly, the whole test file would crash before
//  any test could run, and TEST 1 below would never get to report the problem.)
const readIfPresent = (file) => {
  const full = path.join(ROOT, file);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
};

const html = readIfPresent('index.html');
const css = readIfPresent('style.css');


/* --------------------------------------------------------------------------
   TEST 1 - The required files must exist
   -------------------------------------------------------------------------- */
test('required project files exist', () => {
  for (const file of ['index.html', 'style.css']) {
    assert.ok(
      fs.existsSync(path.join(ROOT, file)),
      `Missing required file: ${file}`
    );
  }
});


/* --------------------------------------------------------------------------
   TEST 2 - THE MAIN ONE (broken asset links)

   Every local file the HTML points to (images, stylesheets, scripts) must
   actually exist on the disk.

   Example of a bug this catches:
     folder has  ->  img.jpg
     html says   ->  <img src="img1.jpg">
   The page would show a broken image online, so the test FAILS here and
   deployment is blocked until the name is fixed.
   -------------------------------------------------------------------------- */
test('every file referenced in index.html actually exists', () => {
  // Pull out every src="..." and href="..." value from the HTML
  const refs = [...html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)]
    .map(match => match[1].trim())
    // Ignore anything that is not a local file in this repo
    .filter(url =>
      !/^(https?:)?\/\//i.test(url) &&   // external links
      !url.startsWith('#') &&            // page anchors
      !url.startsWith('data:') &&        // inline data URIs
      !url.startsWith('mailto:')         // email links
    );

  assert.ok(refs.length > 0, 'No local files referenced - is index.html empty?');

  const missing = refs.filter(ref => {
    const clean = ref.split('?')[0].split('#')[0];       // strip ?v=1 and #anchor
    return !fs.existsSync(path.join(ROOT, clean));
  });

  assert.deepStrictEqual(
    missing, [],
    `Broken link(s) in index.html -> these files do NOT exist: ${missing.join(', ')}`
  );
});


/* --------------------------------------------------------------------------
   TEST 3 - Every CSS class used in the HTML is actually styled

   Catches spelling mistakes like class="card-hedaer" which would silently
   render an unstyled, ugly card instead of throwing an error.
   -------------------------------------------------------------------------- */
test('every class used in index.html is defined in style.css', () => {
  const usedClasses = new Set();

  for (const match of html.matchAll(/class\s*=\s*["']([^"']+)["']/gi)) {
    match[1].split(/\s+/).filter(Boolean).forEach(cls => usedClasses.add(cls));
  }

  // Look for ".class-name" inside style.css, making sure it is the WHOLE name
  // (so ".info" does not wrongly match the rule ".info-row")
  const isStyled = (cls) => {
    const needle = '.' + cls;
    let at = css.indexOf(needle);
    while (at !== -1) {
      const charAfter = css.charAt(at + needle.length);
      if (charAfter === '' || !/[A-Za-z0-9_-]/.test(charAfter)) return true;
      at = css.indexOf(needle, at + 1);
    }
    return false;
  };

  const undefinedClasses = [...usedClasses].filter(cls => !isStyled(cls));

  assert.deepStrictEqual(
    undefinedClasses, [],
    `These classes are used in HTML but have no style rule: ${undefinedClasses.join(', ')}`
  );
});


/* --------------------------------------------------------------------------
   TEST 4 - The ID card has all its required parts
   -------------------------------------------------------------------------- */
test('ID card contains header, photo and student details', () => {
  assert.match(html, /class\s*=\s*["'][^"']*card-header/i,
    'The card header section is missing');

  assert.match(html, /<img[^>]+class\s*=\s*["'][^"']*student-photo/i,
    'The student photograph is missing');

  const infoRows = html.match(/class\s*=\s*["'][^"']*info-row/gi) || [];
  assert.ok(infoRows.length >= 5,
    `The card should show at least 5 details, found only ${infoRows.length}`);

  assert.match(html, /class\s*=\s*["'][^"']*student-name/i,
    'The student name is missing');
});


/* --------------------------------------------------------------------------
   TEST 5 - No empty or placeholder information left on the card
   -------------------------------------------------------------------------- */
test('no placeholder or blank values on the card', () => {
  const values = [...html.matchAll(/class\s*=\s*["'][^"']*info-value[^"']*["']\s*>([^<]*)</gi)]
    .map(match => match[1].trim());

  values.forEach(value => {
    assert.ok(value.length > 0, 'Found an empty detail on the ID card');
    assert.ok(
      !/^(xxx+|todo|tbd|lorem|n\/a|-+)$/i.test(value),
      `Placeholder text left on the card: "${value}"`
    );
  });
});


/* --------------------------------------------------------------------------
   TEST 6 - Basic web-page hygiene (accessibility + mobile friendliness)
   -------------------------------------------------------------------------- */
test('page has title, language, viewport and image alt text', () => {
  assert.match(html, /<title>\s*\S[^<]*<\/title>/i, '<title> tag is missing or empty');
  assert.match(html, /<html[^>]+lang\s*=/i, 'lang attribute is missing on <html>');
  assert.match(html, /name\s*=\s*["']viewport["']/i, 'viewport meta tag is missing');

  const imagesWithoutAlt = (html.match(/<img\b(?![^>]*\balt\s*=)[^>]*>/gi) || []);
  assert.deepStrictEqual(
    imagesWithoutAlt, [],
    'Every <img> must have an alt attribute for screen readers'
  );
});

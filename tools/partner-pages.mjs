// Builds the partners' landing pages: one copy of the site per partner link,
// in English only, whose download buttons carry that link's tag (Google Play's
// install referrer, read by the app on first launch, and Apple's campaign link,
// counted in App Store Connect). The main site (index.html) is not changed.
//
// Run from the site's folder after any change to index.html:
//   node tools/partner-pages.mjs
// Each page is served at stablue.app/<file without .html>, e.g. stablue.app/bv-social
import { readFileSync, writeFileSync } from 'node:fs';

const PAGES = [
  { file: 'bv-social.html', p: 'bv', c: 'social' },
  { file: 'bv-banners.html', p: 'bv', c: 'banners' },
];

const APPLE_PROVIDER_TOKEN = '128860063';
const TITLE = 'Stablue: Your way back to balance';
// The site's own English description (META.en in index.html).
const DESC = 'An app for anxiety and stress in English and Hebrew: a voice-guided calming protocol, AI chat, a mood journal, a support screen and calming sounds. For iPhone and Android.';

const src = readFileSync('index.html', 'utf8');

// U.S. versions of the English texts: [from, to, how many times].
// U.S. prices = the App Store's (Google Play's are set to the same).
const US_TEXT = [
  ['the chat points you straight to ER’AN 1201 and MDA 101', 'the chat points you straight to the 988 Lifeline and 911', 1],
  ['<strong>ER’AN 1201</strong>, emotional first aid in Israel, free and one tap away', '<strong>The 988 Lifeline</strong>, 24/7 emotional support, free and one tap away', 1],
  ['<li>ER’AN 1201 in one tap</li>', '<li>The 988 Lifeline in one tap</li>', 1],
  ['the ER’AN helpline', 'the 988 Lifeline', 2],
  ['₪0<', '$0<', 1],
  ['₪29.90', '$7.99', 1],
  ['₪69.90', '$19.99', 1],
  ['₪23/mo', '$6.66/mo', 1],
  ['₪179.90', '$49.99', 1],
  ['₪15/mo', '$4.17/mo', 1],
  ['Prices are shown in ILS; your store may show local pricing.', 'Prices are shown in U.S. dollars; your store may show local pricing.', 1],
];

// Replaces exactly `count` occurrences, or stops: a changed index.html must
// not silently produce a page with untagged buttons.
function swap(html, from, to, count = 1) {
  const found = html.split(from).length - 1;
  if (found !== count) throw new Error(`expected ${count} of: ${String(from).slice(0, 80)} (found ${found})`);
  return html.split(from).join(to);
}
function swapRe(html, re, to) {
  if (!re.test(html)) throw new Error('not found: ' + re);
  return html.replace(re, to);
}

for (const { file, p, c, k } of PAGES) {
  const referrer = `utm_source=${p}&utm_medium=partner` + (c ? `&utm_campaign=${c}` : '') + (k ? `&utm_content=${k}` : '');
  const ct = [p, c, k].filter(Boolean).join('-').slice(0, 30); // Apple: at most 30 characters
  const apple = `https://apps.apple.com/app/apple-store/id6771805032?pt=${APPLE_PROVIDER_TOKEN}&amp;ct=${encodeURIComponent(ct)}&amp;mt=8`;
  const play = `https://play.google.com/store/apps/details?id=com.stablue.app&amp;hl=en&amp;referrer=${encodeURIComponent(referrer)}`;
  const url = `https://stablue.app/${file.replace(/\.html$/, '')}`;

  let h = src;
  h = swap(h, '<html lang="he" dir="rtl">', '<html lang="en" dir="ltr" class="lang-pending">');
  // English before first paint, whatever language the visitor picked on the main site.
  h = swapRe(h, /\/\/ Apply the saved\/linked language before first paint[\s\S]*?\}\)\(\);/,
    '// A partner page: always English.\n    (function () { var h = document.documentElement; h.lang = \'en\'; h.dir = \'ltr\'; h.classList.add(\'lang-pending\'); })();');
  // What a link preview shows (Facebook reads it before any script runs) and search engines.
  h = swapRe(h, /<title>[^<]*<\/title>/, `<title>${TITLE}</title>\n  <meta name="robots" content="noindex, nofollow" />`);
  h = swapRe(h, /(<meta name="description" id="metaDesc" content=")[^"]*(")/, `$1${DESC}$2`);
  h = swapRe(h, /(<meta property="og:title" content=")[^"]*(")/, `$1${TITLE}$2`);
  h = swapRe(h, /(<meta property="og:description" content=")[^"]*(")/, `$1${DESC}$2`);
  h = swap(h, '<meta property="og:url" content="https://stablue.app/" />', `<meta property="og:url" content="${url}" />`);
  h = swap(h, '<meta property="og:locale" content="he_IL" />', '<meta property="og:locale" content="en_US" />');
  h = swap(h, '<link rel="canonical" href="https://stablue.app/" />\n', '');
  h = swapRe(h, /\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/, '');
  // A label read aloud by screen readers, left in Hebrew on the main site.
  h = h.split('aria-label="5 כוכבים"').join('aria-label="5 stars"');
  // English only: no language switch.
  h = swap(h, '<button type="button" class="lang-btn" id="langBtn"', '<button type="button" class="lang-btn" id="langBtn" style="display:none"');
  // Every download button carries the partner's tag, in both of its addresses.
  h = swap(h, 'href="https://apps.apple.com/il/app/id6771805032" data-href-en="https://apps.apple.com/app/id6771805032"',
    `href="${apple}" data-href-en="${apple}"`, 3);
  h = swap(h, 'href="https://play.google.com/store/apps/details?id=com.stablue.app&amp;hl=iw" data-href-en="https://play.google.com/store/apps/details?id=com.stablue.app&amp;hl=en"',
    `href="${play}" data-href-en="${play}"`, 3);
  if (/apps\.apple\.com\/(il\/)?app\/id|hl=iw/.test(h)) throw new Error('an untagged store link is left in ' + file);
  // The English text, for an American audience: U.S. prices (the App Store's,
  // and Google Play's once set the same) and the crisis lines the app itself
  // gives a U.S. phone (988 and 911, chosen by the phone's country).
  const a = h.indexOf('const EN = ');
  const b = h.indexOf('\n};', a);
  if (a < 0 || b < 0) throw new Error('English texts not found');
  let en = h.slice(a, b);
  for (const [from, to, count] of US_TEXT) en = swap(en, from, to, count);
  if (/₪|ER’AN|MDA 101|Israel|ILS/.test(en)) throw new Error('Israeli details left in the English texts of ' + file);
  h = h.slice(0, a) + en + h.slice(b);

  // The note goes after the doctype: anything before it puts browsers in quirks mode.
  h = swap(h, '<!DOCTYPE html>\n', '<!DOCTYPE html>\n<!-- Built by tools/partner-pages.mjs from index.html: do not edit by hand. -->\n');
  writeFileSync(file, h);
  console.log('built', file, '→', url);
}

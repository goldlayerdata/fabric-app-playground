// The playground's one top bar, the same on every screen: the course's start screen and lesson screen
// (src/index.html) and every Visuals page (src/visuals/index.html). tools/build.mjs writes it into both pages in
// place of their <top-bar page="…">…</top-bar> element; what that element holds is the page's slot. Its styles are
// in src/top.css.
//
// Left to right: the brand, the two pages as tabs (the current one marked, the only pink in the bar), the page's
// slot (the course: the lessons drawer button and the sign-in switch; the Visuals page: nothing), the Simulated chip.

import { CHIP_MORE, DISCLAIMER_TITLE } from './disclaimer.mjs';

const MARK = '<svg class="brand-mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 16.6 12 21.2 21 16.6" fill="none" stroke="#2A4A8C" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 12.1 12 16.7 21 12.1" fill="none" stroke="#4069C4" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 3 21 7.6 12 12.2 3 7.6Z" fill="#F2C811" stroke="#F2C811" stroke-width="1.2" stroke-linejoin="round"/></svg>';

const PAGES = {
  // href: from that page to each page; chip: what the Simulated chip's tooltip says there.
  course: {
    course: './',
    visuals: 'visuals/',
    chip: 'Nothing here talks to Fabric or Power BI: the connectors answer from saved results, and the app\'s database, sign-in and permissions run in this browser. Click for more.',
  },
  visuals: {
    course: '../',
    visuals: '#/',
    chip: 'Nothing here talks to Fabric or Power BI: the app side answers its queries from saved results of the Contoso model. Click for the Notes page.',
  },
};

/** The top bar's HTML for `page` ('course' or 'visuals'), with `slot` (HTML) in the page's slot. */
export function topBar(page, slot = '') {
  const p = PAGES[page];
  if (!p) throw new Error(`topBar: unknown page ${page}`);
  const tab = (id, label, title) =>
    `<a class="top-tab" id="tab-${id}" href="${p[id]}" title="${title}"${id === page ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<header class="top" id="top">
      <div class="brand">
        <a class="brand-home" href="https://goldlayerdata.com/tools.html" target="_blank" rel="noopener" title="Gold Layer Tools on goldlayerdata.com (opens in a new tab)">${MARK} Gold Layer</a>
        <span class="brand-sep">/</span>
        <a class="brand-here" id="brand" href="${p.course}" title="The playground's start screen">
          <span class="brand-lane">Tools</span>
          <span class="brand-sep">/</span>
          <span class="brand-page">Fabric app playground</span>
        </a>
      </div>
      <nav class="top-tabs" aria-label="The playground's pages">
        ${tab('course', 'Playground', 'Build a Fabric app, one step at a time')}
        ${tab('visuals', 'Visuals', 'Each Power BI visual beside the same visual in a Fabric app')}
      </nav>
      <div class="top-slot">${slot.trim()}</div>
      <button type="button" class="sim-chip" id="btn-version" title="${DISCLAIMER_TITLE} Our reading of the docs, unofficial. ${p.chip}">Simulated<span class="chip-more">${CHIP_MORE}</span></button>
    </header>`;
}

/** Replaces the <top-bar page="…">slot</top-bar> element of an HTML page with the top bar. */
export function withTopBar(html) {
  const out = html.replace(/<top-bar page="(\w+)">([\s\S]*?)<\/top-bar>/, (_, page, slot) => topBar(page, slot));
  if (out === html) throw new Error('withTopBar: no <top-bar> element in the page');
  return out;
}

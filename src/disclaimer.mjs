// The disclaimer, in one place: the start screen (and its footer), the top bar's chip, About (course), the Visuals
// landing, its Notes page and its footer all read it from here, so they never say different things. Keep it plain
// and short. The sources it names become links where it is shown in full (see disclaimerParts).

/** The heading of the full text. */
export const DISCLAIMER_TITLE = 'Our interpretation, not a guarantee.';

/** The full text: About, the Visuals Notes page, the README. */
export const DISCLAIMER_TEXT =
  "Everything here is Gold Layer's reading of Microsoft's public documentation and the Rayfin 2.0 packages, checked as carefully as we can. " +
  'It can still be incomplete, out of date or wrong, and Fabric and Rayfin keep changing. ' +
  'Before you build something real, check Microsoft Learn and rayfin.ai. ' +
  'Unofficial: not made, checked or endorsed by Microsoft. Provided as is, without warranty.';

/** The short version, shown after the title: the start screen and the Visuals landing. */
export const DISCLAIMER_SHORT =
  "This is Gold Layer's reading of Microsoft's public docs and the Rayfin 2.0 packages. " +
  'It can be incomplete, out of date or wrong. Check Microsoft Learn and rayfin.ai before you build for real. Unofficial, not endorsed by Microsoft.';

/** One line for the footers. */
export const DISCLAIMER_FOOTER = 'Our interpretation of the docs, not a guarantee. Unofficial, and not affiliated with Microsoft.';

/** The words on the top bar's chip, after "Simulated". */
export const CHIP_MORE = ' · our reading of the docs · unofficial';

/** Where to report a mistake: a GitHub issue, with the "A step is wrong" form. */
export const REPORT_MISTAKE_URL = 'https://github.com/goldlayerdata/fabric-app-playground/issues/new?template=step-is-wrong.yml';
export const REPORT_MISTAKE_LABEL = 'Found a mistake? Tell us →';

/** The sources the text names, and where they point. */
export const SOURCES = {
  'Microsoft Learn': 'https://learn.microsoft.com/fabric/',
  'rayfin.ai': 'https://rayfin.ai/',
};

/** Splits a text into plain parts and links, so each page can draw the sources as links its own way. */
export function disclaimerParts(text) {
  const names = Object.keys(SOURCES);
  const parts = [];
  let rest = text;
  while (rest) {
    const hits = names.map((n) => [n, rest.indexOf(n)]).filter(([, i]) => i >= 0).sort((a, b) => a[1] - b[1]);
    if (!hits.length) {
      parts.push({ text: rest });
      break;
    }
    const [name, i] = hits[0];
    if (i) parts.push({ text: rest.slice(0, i) });
    parts.push({ text: name, href: SOURCES[name] });
    rest = rest.slice(i + name.length);
  }
  return parts;
}

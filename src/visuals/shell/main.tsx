import '@fontsource/figtree/latin-400.css';
import '@fontsource/figtree/latin-600.css';
import '@fontsource/figtree/latin-700.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import './shell.css';

import { Component, Fragment, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import sources from 'virtual:sources';
import { answerBookInfo, resetUsedAnswers, subscribeAnswers, usedAnswers } from '../sim/answer-book';
import { CategoryCrossFilter } from '../app/components/category-cross-filter';
import { MarginGauge } from '../app/components/margin-gauge';
import { OrdersAndRevenueScatterChart } from '../app/components/orders-and-revenue-scatter-chart';
import { RevenueAndOrdersComboChart } from '../app/components/revenue-and-orders-combo-chart';
import { RevenueByCategoryDonutChart } from '../app/components/revenue-by-category-donut-chart';
import { RevenueByCategoryFunnelChart } from '../app/components/revenue-by-category-funnel-chart';
import { RevenueByCategoryMatrix } from '../app/components/revenue-by-category-matrix';
import { RevenueByCategoryRibbonChart } from '../app/components/revenue-by-category-ribbon-chart';
import { RevenueByCategoryWaterfallChart } from '../app/components/revenue-by-category-waterfall-chart';
import { RevenueByCountryPieChart } from '../app/components/revenue-by-country-pie-chart';
import { RevenueByMonthAreaChart } from '../app/components/revenue-by-month-area-chart';
import { RevenueByMonthLineChart } from '../app/components/revenue-by-month-line-chart';
import { RevenueByYearColumnChart } from '../app/components/revenue-by-year-column-chart';
import { RevenueCard } from '../app/components/revenue-card';
import { RevenueKpi } from '../app/components/revenue-kpi';
import { SalesByCountryTable } from '../app/components/sales-by-country-table';
import { YearSlicer } from '../app/components/year-slicer';
import { Glyph } from './sketches';
import { MARK_LABEL, MISMATCHES, NOT_BUILT, PLAIN, type Excerpt, type Job, type Mark, type ScoreItem, type Side, type VisualDef } from './visuals';
import { VISUALS } from './all-visuals';
import { COURSE_LINKS } from '../pages.mjs';

/** The learner's component each page runs on its app side. Pages without one have no drop-in equivalent. */
const APPS: Record<string, () => ReactNode> = {
  bar: () => <CategoryCrossFilter />,
  column: () => <RevenueByYearColumnChart />,
  line: () => <RevenueByMonthLineChart />,
  area: () => <RevenueByMonthAreaChart />,
  combo: () => <RevenueAndOrdersComboChart />,
  pie: () => <RevenueByCountryPieChart />,
  donut: () => <RevenueByCategoryDonutChart />,
  scatter: () => <OrdersAndRevenueScatterChart />,
  funnel: () => <RevenueByCategoryFunnelChart />,
  waterfall: () => <RevenueByCategoryWaterfallChart />,
  ribbon: () => <RevenueByCategoryRibbonChart />,
  gauge: () => <MarginGauge />,
  card: () => <RevenueCard />,
  kpi: () => <RevenueKpi />,
  table: () => <SalesByCountryTable />,
  matrix: () => <RevenueByCategoryMatrix />,
  slicer: () => <YearSlicer />,
};

// ------------------------------------------------------------------ counting: one rule, every page
const isCodeLine = (l: string) => l.trim() !== '' && !/^\s*(\/\/|\/\*|\*)/.test(l);
const countLines = (text: string) => text.split('\n').filter(isCodeLine).length;
const fileLines = (path: string) => countLines(sources[path] ?? '');
const sumLines = (files: string[]) => files.reduce((a, f) => a + fileLines(f), 0);
const extraLines = (v: VisualDef) => v.extras.reduce((a, x) => a + sumLines(x.files), 0);
const runLines = (v: VisualDef) => sumLines(v.headlineFiles) + extraLines(v);
const HEADLINE_RULE = (
  <>
    <b>Headline:</b> what the page runs for that visual: its DAX queries, its chart spec and its components
    (<code>.dax</code>, <code>.json</code>, <code>.tsx</code>). <b>Second line:</b> the same, for the other visual on the
    page (the table a click filters, or the chart a slicer filters). <b>Full count:</b> adds the small <code>.ts</code> query
    files (column names, formats, picking the query) and any query they import that the page doesn't run. A line counts
    unless it is blank or only a comment; imports count. Rayfin's template files (<code>useSemanticModelQuery</code>,{' '}
    <code>toDataTable</code>) are never counted.
  </>
);

// ------------------------------------------------------------------ routing and app theme
function useRoute() {
  const read = () => location.hash.replace(/^#\/?/, '');
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => { setRoute(read()); window.scrollTo(0, 0); };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}
function useAppDark() {
  const [dark, setDark] = useState(true);
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);
  return [dark, setDark] as const;
}

// ------------------------------------------------------------------ small pieces
/** The playground's top bar (src/index.html), with Course and Visuals side by side. */
function Header() {
  return (
    <header className="top">
      <div className="brand">
        <a className="brand-home" href="https://goldlayerdata.com/tools.html" target="_blank" rel="noopener" title="Gold Layer Tools on goldlayerdata.com (opens in a new tab)">
          <svg className="brand-mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 16.6 12 21.2 21 16.6" fill="none" stroke="#2A4A8C" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 12.1 12 16.7 21 12.1" fill="none" stroke="#4069C4" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 3 21 7.6 12 12.2 3 7.6Z" fill="#F2C811" stroke="#F2C811" strokeWidth="1.2" strokeLinejoin="round" /></svg> Gold Layer
        </a>
        <span className="brand-sep">/</span>
        <a className="brand-here" href="../" title="The playground's start screen">
          <span className="brand-lane">Tools</span>
          <span className="brand-sep">/</span>
          <span className="brand-page">Fabric app playground</span>
        </a>
      </div>
      <a className="top-link" href="../" title="The course: build a Fabric app, one step at a time">
        <span className="burger" aria-hidden="true">☰</span> Course
      </a>
      <a className="top-link" href="#/" aria-current="page">Visuals</a>
      <span className="top-gap" />
      <a className="sim-chip" href="#/notes" title="Nothing here talks to Fabric or Power BI: the app side answers its queries from saved results of the Contoso model. Click for the Notes page.">
        Simulated<span className="chip-more"> · mirrors Rayfin 2.0 · unofficial</span>
      </a>
    </header>
  );
}

/** A lesson that builds a similar visual by hand (src/visuals/pages.mjs). */
function CourseLink({ id }: { id: string }) {
  const c = (COURSE_LINKS as Record<string, { lesson: string; title: string; what: string } | undefined>)[id];
  if (!c) return null;
  return (
    <p className="course-link">
      <a href={`../#${c.lesson}/0`}>Build one yourself in the course →</a>{' '}
      <span className="muted small">{c.title}: {c.what}.</span>
    </p>
  );
}

function TilePreview({ id }: { id: string }) {
  if (id === 'bar') return <svg viewBox="0 0 80 48" aria-hidden="true">{[34, 26, 20, 14, 8].map((w, i) => <rect key={i} x="6" y={4 + i * 9} width={w * 2} height="6" rx="1.5" />)}</svg>;
  if (id === 'slicer') return <svg viewBox="0 0 80 48" aria-hidden="true"><rect x="8" y="6" width="64" height="11" rx="3" className="o" /><path d="M62 10l3 3 3-3" className="o" />{[0, 1, 2].map((i) => <g key={i}><rect x="10" y={23 + i * 8} width="5" height="5" rx="1" className={i === 1 ? '' : 'o'} /><rect x="19" y={24.5 + i * 8} width={20 + i * 6} height="2" rx="1" className="m" /></g>)}</svg>;
  if (id === 'key-influencers') return <svg viewBox="0 0 80 48" aria-hidden="true"><circle cx="22" cy="24" r="10" className="o" /><circle cx="50" cy="16" r="6" className="o" /><circle cx="56" cy="34" r="4" className="o" /><path d="M14 40 L66 8" className="dash" /></svg>;
  return <svg viewBox="0 0 200 110" className="g" aria-hidden="true"><Glyph id={id} /></svg>;
}

class Boundary extends Component<{ children: ReactNode }, { err?: Error }> {
  state: { err?: Error } = {};
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() { return this.state.err ? <p role="alert" className="err">The app side crashed: {this.state.err.message}</p> : this.props.children; }
}

function Badge({ m }: { m: Mark }) {
  return <span className={`mark m-${m}`}>{MARK_LABEL[m]}</span>;
}

// ------------------------------------------------------------------ landing
function Landing() {
  const groups = [...new Set(VISUALS.map((v) => v.group))];
  return (
    <main className="wrap">
      <h1>Visuals</h1>
      <p className="lead">
        In Power BI you drop fields on a visual. In a Fabric app you write it. Each page shows the same visual both ways, so you
        can see what it takes before you build one. The course then teaches you to build them, one step at a time:{' '}
        <a href="../">open the course →</a>
      </p>
      {groups.map((g) => (
        <section key={g} className="group">
          <h2>{g}</h2>
          <div className="group-tiles">
            {VISUALS.filter((v) => v.group === g).map((v) => (
              <a key={v.id} className="tile" href={`#/${v.id}`} title={v.blurb}>
                <TilePreview id={v.id} />
                <span className="tile-name">{v.name}</span>
                {v.noEquiv && <span className="tile-tag">no drop-in</span>}
              </a>
            ))}
          </div>
        </section>
      ))}
      <p className="small muted foot-link"><a href="#/notes">Notes for developers</a>: package versions, page weight, sources, the counting rule.</p>
    </main>
  );
}

// ------------------------------------------------------------------ the Power BI side: a field-well sketch
function Well({ name, fields }: { name: string; fields: string[] }) {
  return (
    <div className="well">
      <span className="well-name">{name}</span>
      {fields.map((f) => <span key={f} className="well-field">{f}</span>)}
    </div>
  );
}
function PowerBISketch({ v }: { v: VisualDef }) {
  return (
    <div className="sketch">
      <div className="sk-canvas" aria-hidden="true">
        <svg viewBox="0 0 200 110"><Glyph id={v.id} /></svg>
      </div>
      <div className="sk-pane">
        <div className="sk-pane-title">Visualizations · Build visual</div>
        {v.wells.map((w) => <Well key={w.name} name={w.name} fields={w.fields} />)}
        {v.formatWells && (
          <>
            <div className="sk-pane-title">{v.formatWells.title}</div>
            {v.formatWells.wells.map((w) => <Well key={w.name} name={w.name} fields={w.fields} />)}
          </>
        )}
      </div>
      <p className="sk-note small">A sketch of the Power BI visual and the fields you drop in its wells.</p>
    </div>
  );
}

// ------------------------------------------------------------------ code: excerpts with gutter notes
function linesOf(text: string, ex: Pick<Excerpt, 'find' | 'block'>): Set<number> {
  const out = new Set<number>();
  const lines = text.split('\n');
  lines.forEach((l, i) => { if (ex.find?.some((f) => l.includes(f))) out.add(i); });
  for (const start of ex.block ?? []) {
    const i0 = lines.findIndex((l) => l.includes(start));
    if (i0 < 0) continue;
    let depth = 0, seen = false;
    for (let i = i0; i < lines.length; i++) {
      out.add(i);
      for (const ch of lines[i]) { if (ch === '{' || ch === '(') { depth++; seen = true; } else if (ch === '}' || ch === ')') depth--; }
      if (seen && depth <= 0) break;
    }
  }
  return out;
}

function CodeLines({ text, show, marked, notes, noNumbers }: { text: string; show: Set<number> | null; marked?: Set<number>; notes?: Map<number, string>; noNumbers?: boolean }) {
  const lines = text.split('\n');
  const rows: ReactNode[] = [];
  let prev = -2;
  lines.forEach((l, i) => {
    if (show && !show.has(i)) return;
    if (show && prev >= 0 && i > prev + 1) rows.push(<div key={`gap${i}`} className="ln gap"><span className="no" /><span>⋯</span></div>);
    prev = i;
    const note = notes?.get(i);
    rows.push(
      <div key={i} className={marked?.has(i) ? 'ln hl' : 'ln'}>
        <span className="no">{noNumbers ? '' : i + 1}</span><span className="code-text">{l || ' '}</span>
        {note && <span className="gutter">{note}</span>}
      </div>,
    );
  });
  return <pre className="src">{rows}</pre>;
}

function ExcerptView({ ex }: { ex: Excerpt }) {
  const real = (sources[ex.path] ?? '').replace(/\n$/, '');
  const simple = ex.simplify?.(real) ?? null;
  const text = simple ?? real;
  const [whole, setWhole] = useState(false);
  const show = useMemo(() => (ex.whole ? null : linesOf(text, ex)), [text, ex]);
  const notes = useMemo(() => {
    const m = new Map<number, string>();
    const lines = text.split('\n');
    for (const n of ex.notes ?? []) { const i = lines.findIndex((l) => l.includes(n.at)); if (i >= 0) m.set(i, n.note); }
    return m;
  }, [text, ex]);
  const name = ex.path.split('/').pop();
  return (
    <div className="excerpt">
      <div className="ex-head small">
        <code>{name}</code>
        {simple && <span className="muted"> · simplified (no line numbers), see For developers</span>}
        {!ex.whole && <button className="linkish" onClick={() => setWhole(!whole)}>{whole ? 'Show only the key lines' : 'Show the whole file'}</button>}
      </div>
      {whole
        ? <CodeLines text={real} show={null} marked={linesOf(real, ex)} />
        : <CodeLines text={text} show={show} notes={notes} noNumbers={!!simple} />}
    </div>
  );
}

function shownLines(job: Job) {
  return job.excerpts.reduce((a, ex) => {
    const real = (sources[ex.path] ?? '').replace(/\n$/, '');
    const text = ex.simplify?.(real) ?? real;
    const lines = text.split('\n');
    const set = ex.whole ? null : linesOf(text, ex);
    return a + lines.filter((l, i) => (set ? set.has(i) : true) && isCodeLine(l)).length;
  }, 0);
}

function JobCard({ n, job }: { n: number; job: Job }) {
  const shown = shownLines(job);
  if (!job.excerpts.length) {
    return (
      <div className="job nothing">
        <div className="job-summary">
          <span className="job-n">{n}</span>
          <span className="job-map"><b>{job.pbi}</b> <span className="arrow">→</span> <b className="app-word">{job.app}</b></span>
          <span className="job-text">{job.text}</span>
        </div>
      </div>
    );
  }
  return (
    <details className="job">
      <summary>
        <span className="job-n">{n}</span>
        <span className="job-map"><b>{job.pbi}</b> <span className="arrow">→</span> <b className="app-word">{job.app}</b></span>
        <span className="job-text">{job.text}</span>
        <span className="job-open">Show the {shown} lines</span>
      </summary>
      <div className="job-body">
        {job.excerpts.map((ex, i) => <ExcerptView key={i} ex={ex} />)}
        {job.after && <p className="small muted">{job.after}</p>}
      </div>
    </details>
  );
}

// ------------------------------------------------------------------ what it takes
const plainName = (s: ScoreItem) => s.plain ?? PLAIN[s.item] ?? s.item;

function WhatItTakes({ v }: { v: VisualDef }) {
  const [open, setOpen] = useState<string | null>(null);
  const notBuilt = (s: ScoreItem) => s.app.short === NOT_BUILT || /\(not built here\)/.test(plainName(s));
  const names = (m: Mark) => v.score.filter((s) => s.app.mark === m && !s.unlisted && !notBuilt(s)).map(plainName).join(', ');
  const leftOut = v.score.filter(notBuilt).map((s) => plainName(s).replace(/ \(not built here\)$/, ''));
  const notPossible = names('no');
  const allInPowerBI = v.score.every((s) => s.pbi.mark === 'pbi');
  const lists: [string, Mark, string][] = [
    ['✓ Done for you', 'pkg', names('pkg')],
    ['✎ You write', 'you', names('you')],
    ['✕ Not possible', 'no', notPossible],
  ];
  return (
    <section className="card">
      <h2>What it takes</h2>
      <p className="takes-lead">
        Power BI does {allInPowerBI ? 'all' : 'most'} of this for you.{' '}
        {v.takesLead ?? <>In an app, Microsoft's packages do some of it, and you write the rest.</>}
      </p>
      <dl className="takes">
        {lists.map(([label, m, items]) => items && (
          <div key={m} className="takes-row">
            <dt className={`m-${m}`}>{label}</dt>
            <dd>{items}</dd>
          </div>
        ))}
      </dl>
      <details className="takes-more">
        <summary>More detail</summary>
        <p className="small muted">Each item, in Power BI and in an app. "Why?" opens the explanation and its sources.</p>
        {leftOut.length > 0 && <p className="small">Not built on this page, so not in the lists above: {leftOut.join(', ')}.</p>}
        <table className="score">
          <thead><tr><th>Item</th><th>In Power BI</th><th>In a Fabric app</th><th /></tr></thead>
          <tbody>
            {v.score.map((s) => (
              <Fragment key={s.item}>
                <tr>
                  <th scope="row">{s.item}</th>
                  <td>{s.pbi.mark !== 'pbi' && <Badge m={s.pbi.mark} />} {s.pbi.short}</td>
                  <td><Badge m={s.app.mark} /> {s.app.short}</td>
                  <td>{(s.app.why || s.pbi.why || s.app.cite || s.pbi.cite) && <button className="linkish" aria-expanded={open === s.item} onClick={() => setOpen(open === s.item ? null : s.item)}>Why?</button>}</td>
                </tr>
                {open === s.item && (
                  <tr className="why-row"><td colSpan={4}>
                    {([['Power BI', s.pbi], ['Fabric app', s.app]] as [string, Side][]).map(([who, side]) => (side.why || side.cite) && (
                      <div key={who} className="why">
                        <b>{who}:</b> {side.why}
                        {side.cite && <div className="cite">{side.cite.map((c) => <code key={c}>{c}</code>)}{side.cite.some((c) => !c.startsWith('learn.')) && <span className="small muted">Package paths are under node_modules/@microsoft/.</span>}</div>}
                      </div>
                    ))}
                  </td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

// ------------------------------------------------------------------ developer layer
function Provenance() {
  const used = useSyncExternalStore(subscribeAnswers, usedAnswers);
  const rows = Object.entries(used);
  if (!rows.length) return <p className="small muted">No query run yet.</p>;
  return (
    <ul className="small">
      {rows.map(([group, u]) => (
        <li key={group}>
          <code>{group}</code>:{' '}
          {!u.source ? <span className="bad">no saved answer</span>
            : u.source.kind === 'saved' ? <>saved answer <code>{u.source.ids[0]}</code></>
            : <><span className="warn">derived</span> from {u.source.ids.map((id, i) => <span key={id}>{i ? ', ' : ''}<code>{id}</code></span>)}. {u.source.note}</>}
        </li>
      ))}
    </ul>
  );
}

function AllFiles({ v }: { v: VisualDef }) {
  const [path, setPath] = useState(v.allFiles[0]);
  const text = (sources[path] ?? '').replace(/\n$/, '');
  return (
    <div>
      <div className="files">
        {v.allFiles.map((f) => (
          <button key={f} className={f === path ? 'on' : ''} onClick={() => setPath(f)}>
            {f.split('/').pop()} <span className="muted">{fileLines(f)}</span>{v.headlineFiles.includes(f) ? '' : v.extras.some((x) => x.files.includes(f)) ? ' +' : ' *'}
          </button>
        ))}
        <span className="gap" />
        <button onClick={() => navigator.clipboard?.writeText(text)}>Copy</button>
      </div>
      <p className="small muted">src/{path} · the file as it runs. No mark: headline. +: second line. *: full count only.</p>
      <CodeLines text={text} show={null} />
    </div>
  );
}

function ForDevelopers({ v }: { v: VisualDef }) {
  const total = v.allFiles.reduce((a, f) => a + fileLines(f), 0);
  return (
    <details className="card dev">
      <summary><h2>For developers</h2><span className="small muted">versions, sources, every file, the counting rule, page weight</span></summary>
      <h3>Packages</h3>
      <p className="small">{v.packages}</p>
      {v.devNotes.length > 0 && (<><h3>Notes</h3><ul className="small">{v.devNotes.map((n, i) => <li key={i}>{n}</li>)}</ul></>)}
      {v.allFiles.length > 0 && (
        <>
          <h3>Where the numbers come from</h3>
          <Provenance />
          <p className="small muted">Saved answers: {answerBookInfo.source}, {answerBookInfo.takenAt}. The build stops if the app's DAX differs from the saved query text.</p>
          <h3>Counting</h3>
          <p className="small">{HEADLINE_RULE}</p>
          <p className="small">This page: headline <b>{sumLines(v.headlineFiles)}</b> lines in {v.headlineFiles.length} files; second line <b>+{extraLines(v)}</b>; full count <b>{total}</b> lines in {v.allFiles.length} files. The cards under How it's built show {v.jobs.reduce((a, j) => a + shownLines(j), 0)} of the {runLines(v)} lines this page runs.</p>
          <h3>Every file</h3>
          <AllFiles v={v} />
        </>
      )}
      <h3>Page weight</h3>
      <p className="small">The Fabric visuals packages and their dependencies add about 1.2 MB of minified JavaScript. Details on the <a href="#/notes">Notes page</a>.</p>
    </details>
  );
}

// ------------------------------------------------------------------ no drop-in equivalent: instead
function Instead({ v }: { v: VisualDef }) {
  if (!v.noEquiv) return null;
  return (
    <section className="card">
      <h2>What you'd do in an app instead</h2>
      <ol className="instead">{v.noEquiv.instead.map((x, i) => <li key={i}>{x}</li>)}</ol>
      <p className="small muted">{v.noEquiv.source}</p>
    </section>
  );
}

// ------------------------------------------------------------------ the visual page
function VisualPage({ v }: { v: VisualDef }) {
  const [dark, setDark] = useAppDark();
  useEffect(() => { resetUsedAnswers(); }, [v.id]);
  const lines = sumLines(v.headlineFiles);
  const live = !v.noEquiv;
  const App = APPS[v.id];
  const shown = v.jobs.reduce((a, j) => a + shownLines(j), 0);
  return (
    <main className="wrap">
      <p className="crumbs small"><a href="#/">Visuals</a> / {v.group}</p>
      <h1>{v.name}</h1>
      <p className="headline">
        In Power BI: <b>{v.inPowerBI}</b>.&nbsp; In a Fabric app:{' '}
        {live ? <b className="pink">{lines} lines in {v.headlineFiles.length} files</b> : <b className="pink">no drop-in equivalent</b>}.
      </p>
      {v.extras.map((x) => (
        <p key={x.label} className="headline-2">+ {sumLines(x.files)} lines in {x.files.length} files {x.label}.</p>
      ))}
      <CourseLink id={v.id} />

      <div className="sides">
        <section className="card side">
          <h2>Power BI</h2>
          <PowerBISketch v={v} />
          <p className="pbi-text">{v.pbiText}</p>
        </section>
        <section className="card side">
          <div className="side-head">
            <h2>Fabric app {live && <span className="muted small">(running)</span>}</h2>
            {live && <button onClick={() => setDark(!dark)} aria-pressed={!dark}>Theme: {dark ? 'dark' : 'light'}</button>}
          </div>
          {v.hint && <p className="hint">→ {v.hint}</p>}
          <div className="app-surface">
            <Boundary>
              {v.noEquiv ? (
                <div className="noequiv">
                  <p className="ne-title">No drop-in equivalent</p>
                  <p>{v.noEquiv.why}</p>
                </div>
              ) : App?.()}
            </Boundary>
          </div>
          {v.appNote && <p className="small muted">{v.appNote}</p>}
        </section>
      </div>

      {live ? (
        <section className="built">
          <h2>How it's built</h2>
          <p className="small muted">Three jobs you know from Power BI, each with the code that does it in an app. Open one.</p>
          {v.jobs.map((j, i) => <JobCard key={j.pbi} n={i + 1} job={j} />)}
          <p className="small muted done">The cards show the key lines. The rest: {v.restNote}.</p>
          <p className="small muted">Done for you by Rayfin's template: sending the query, and turning the answer into rows the visuals read.</p>
        </section>
      ) : <Instead v={v} />}

      <WhatItTakes v={v} />
      <ForDevelopers v={v} />
    </main>
  );
}

// ------------------------------------------------------------------ notes page
interface Report { measuredAt: string; mainJs: number; lazyJs: number; gzipJsCss: number; fontsAndFiles: number; byInput: Record<string, number> }
function Weight() {
  const [r, setR] = useState<Report | null>(null);
  useEffect(() => { fetch('bundle-report.json').then((x) => x.json()).then(setR).catch(() => setR(null)); }, []);
  if (!r) return <p className="small muted">The weight report is written by the build (dist/bundle-report.json).</p>;
  const kb = (n: number) => `${Math.round(n / 1024).toLocaleString('en')} KB`;
  const pick = (re: RegExp) => Object.entries(r.byInput).filter(([k]) => re.test(k));
  const fabric = pick(/^fabric-/), deps = pick(/^(vega|numfmt|radix|@tanstack|@griffel|@fluentui)/);
  const sum = (rows: [string, number][]) => rows.reduce((a, [, v]) => a + v, 0);
  return (
    <>
      <p className="small">This page, minified: <b>{kb(r.mainJs)}</b> of JavaScript up front, plus {kb(r.lazyJs)} of chunks that load only when asked (fabric-visuals-core 5.4.0's translations, pulled in by the slicer); {kb(r.gzipJsCss)} gzipped for all JS and CSS.</p>
      <p className="small">The Fabric visuals stack adds <b>{kb(sum(fabric) + sum(deps) - r.lazyJs)}</b> up front: the Fabric packages' own code {kb(sum(fabric) - r.lazyJs)}, their dependencies {kb(sum(deps))} (vega and vega-lite are most of it).</p>
      <table className="weights small"><tbody>
        {[...fabric, ...deps].sort((a, b) => b[1] - a[1]).map(([k, v]) => <tr key={k}><td>{kb(v)}</td><td>{k}{k.includes('5.4.0') ? `, ${kb(r.lazyJs)} of it lazy translations` : ''}</td></tr>)}
        {pick(/^(react|page shell|saved)/).map(([k, v]) => <tr key={k} className="muted"><td>{kb(v)}</td><td>{k} (not the visuals stack)</td></tr>)}
      </tbody></table>
      <p className="small muted">From esbuild's metafile, {new Date(r.measuredAt).toLocaleString('en-GB')}; minified bytes before gzip. Two copies each of fabric-visuals-core (1.0.0, and the slicer's 5.4.0) and numfmt (3.2.6 and 4.1.5).</p>
    </>
  );
}

function Notes() {
  return (
    <main className="wrap notes">
      <p className="crumbs small"><a href="#/">Visuals</a> / Notes</p>
      <h1>Notes for developers</h1>
      <section className="card">
        <h2>Versions: 1.0.0 here, 5.4.0 on npm</h2>
        <p className="small">A new Rayfin 2.0 data app pins <code>@microsoft/fabric-visuals</code>, <code>-core</code> and <code>fabric-datagrid</code> at 1.0.0 (May 2026). npm is at 5.4.0 (19 November 2026). What changes for this code. 1.0.0: the installed packages. <b>5.4.0: read from the npm tarballs</b> (type definitions and code, not installed here), except the compile check, which used a scratch install.</p>
        <ul className="small">
          <li><b>Interaction events changed shape.</b> <code>name</code> became <code>fieldId</code>; values became <code>{'{ kind: "value", value }'}</code> or <code>{'{ kind: "blank" }'}</code>. <code>DataPointSelection</code>, <code>SetPredicate</code>, <code>RangePredicate</code> and <code>selectionsMatch</code> are gone. The Bar chart handler fails to compile against 5.4.0; a version that reads <code>.value</code> compiles (checked against a scratch install of 5.4.0).</li>
          <li><b>Keyboard</b> (npm tarball): 5.4.0's chart fires <code>onInteraction</code> on click, Enter or Space; 1.0.0 is mouse only.</li>
          <li><b>A frame with actions</b> (npm tarball): 5.4.0 wraps the chart and the grid in a <code>VisualContainer</code> with "Copy visual" and "Show as table", an optional <code>header</code>, and <code>chromeless</code> to opt out.</li>
          <li><b>On by default</b> (<code>capabilities</code>, npm tarball): entrance motion, compact numbers on axes and data labels, scrolling past 15 categories, and self-highlight, which dims unclicked marks. The d.ts says self-highlight is "Skipped automatically when the spec already manages selection params or opacity". The Bar chart spec dims bars with <code>fillOpacity</code>; whether that counts as managing opacity was not checked.</li>
          <li><b>Controlled selection</b> (npm tarball): <code>selections</code> and <code>selectableFields</code> on both components.</li>
          <li><b>DataGrid</b> (npm tarball): <code>numeric</code> is now <code>numericStyling</code>; new <code>hidden</code>, <code>grandTotals</code>, <code>capabilities</code>. Its column filters use fabric-slicers 4.4.0.</li>
          <li><b>ColumnDef</b> (npm tarball) gains <code>semanticType</code>, <code>defaultAggregation</code>, <code>disambiguateBy</code>. 5.4.0's compiler reads <code>displayName</code> (read from the tarball's code, not run).</li>
          <li><b>Palette</b> (npm tarball): <code>--color-data-1</code> to <code>--color-data-10</code> set the chart colours.</li>
        </ul>
      </section>
      <section className="card">
        <h2>Where Rayfin's skill and the 1.0.0 packages disagree</h2>
        <ul className="small mismatch">{MISMATCHES.map((m, i) => <li key={i}>{m.text}<div className="cite">{m.cite.map((c) => <code key={c}>{c}</code>)}</div></li>)}</ul>
      </section>
      <section className="card">
        <h2>Page weight</h2>
        <Weight />
      </section>
      <section className="card">
        <h2>Counting</h2>
        <p className="small">{HEADLINE_RULE}</p>
        <ul className="small">{VISUALS.filter((v) => v.allFiles.length).map((v) => (
          <li key={v.id}>{v.name}: headline {sumLines(v.headlineFiles)} lines in {v.headlineFiles.length} files; second line +{extraLines(v)}; full {sumLines(v.allFiles)} lines in {v.allFiles.length} files.</li>
        ))}</ul>
      </section>
      <section className="card">
        <h2>Sources</h2>
        <ul className="small">
          <li>Numbers: {answerBookInfo.source}, {answerBookInfo.takenAt}. The course uses the same saved answers (<code>data/snapshots.json</code>). Answers not captured as one query are built from saved ones and marked "derived".</li>
          <li>Code style: Rayfin 2.0's data-app template (<code>AGENTS.md</code>, <code>src/lib/to-data-table.ts</code>, <code>src/hooks/use-semantic-model-query.ts</code>) and its visuals skill with <code>references/</code>.</li>
          <li>Package claims: the installed files under <code>node_modules/@microsoft/</code>, cited by line. 5.4.0: the npm tarballs' type definitions.</li>
          <li>Power BI claims: Microsoft Learn pages cited in each "Why?".</li>
        </ul>
      </section>
    </main>
  );
}

// ------------------------------------------------------------------ the sidebar: every visual, on every page
function SideNav({ route }: { route: string }) {
  const groups = [...new Set(VISUALS.map((v) => v.group))];
  const home = route !== 'notes' && !VISUALS.some((v) => v.id === route);
  return (
    <nav className="side-nav" aria-label="Visuals">
      <a className="side-top" href="#/" aria-current={home ? 'page' : undefined}>All visuals</a>
      {groups.map((g) => {
        const items = VISUALS.filter((v) => v.group === g);
        // Each group folds, like the archive years on the site, and starts folded on every page, the group of
        // the visual you're on included; the visual stays marked inside it.
        return (
          <details key={g} className="side-group">
            <summary>
              <span className="side-title">{g}</span>
              <span className="side-count">{items.length}</span>
            </summary>
            <ul className="side-list">
              {items.map((v) => (
                <li key={v.id}>
                  <a href={`#/${v.id}`} aria-current={route === v.id ? 'page' : undefined}>{v.name}</a>
                </li>
              ))}
            </ul>
          </details>
        );
      })}
      <a className="side-top" href="#/notes" aria-current={route === 'notes' ? 'page' : undefined}>Notes for developers</a>
    </nav>
  );
}

function App() {
  const route = useRoute();
  const v = VISUALS.find((x) => x.id === route);
  return (
    <>
      <Header />
      <div className="layout">
        <SideNav route={route} />
        <div className="layout-main">{route === 'notes' ? <Notes /> : v ? <VisualPage key={v.id} v={v} /> : <Landing />}</div>
      </div>
      <footer className="foot small muted">Part of the Gold Layer Fabric app playground. Simulated: nothing here connects to Fabric or Power BI. Unofficial, not affiliated with Microsoft. Numbers: the Contoso sample model (SQLBI Contoso Data Generator V2). <a href="../THIRD-PARTY-NOTICES.md">Third-party notices</a>.</footer>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);

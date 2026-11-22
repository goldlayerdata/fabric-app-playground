// The Visuals page's pages, in landing order (the groups appear in the order of their first visual), and its
// links to the course. Plain JavaScript, so tools/check-lessons.mjs and tools/check-visuals.mjs read it too.
export const VISUAL_IDS = [
  'bar', 'column', 'line', 'area', 'combo', 'pie', 'donut', 'scatter', 'treemap', 'funnel', 'waterfall', 'ribbon', 'gauge',
  'card', 'kpi',
  'table', 'matrix',
  'slicer',
  'key-influencers', 'decomposition-tree', 'azure-map',
];

/**
 * A lesson of the course that builds a similar visual by hand: the visual's page links to it ("Build one
 * yourself in the course"). `title` is the lesson's title, checked against src/lesson-list.mjs.
 */
export const COURSE_LINKS = {
  bar: { lesson: 'cross-filter', title: 'Cross-filter', what: 'a bar chart whose click filters the page, drawn with plain React instead of a chart package' },
  slicer: { lesson: 'slicer', title: 'State as a slicer', what: 'a year slicer that drives the queries, drawn as plain buttons' },
  card: { lesson: 'component', title: 'A component', what: 'a card that shows one number, written once and used for every card' },
};

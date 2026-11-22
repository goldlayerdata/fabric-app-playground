// Every page of the Visuals section, in landing-page order (src/visuals/pages.mjs).
import { VISUAL_IDS } from '../pages.mjs';
import { FIRST_VISUALS, type VisualDef } from './visuals';
import { GALLERY } from './visuals-gallery';

const all = [...FIRST_VISUALS, ...GALLERY];

export const VISUALS: VisualDef[] = VISUAL_IDS.map((id) => {
  const v = all.find((x) => x.id === id);
  if (!v) throw new Error(`no page for ${id}`);
  return v;
});

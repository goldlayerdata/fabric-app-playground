# Third-party notices

The Gold Layer page playground is unofficial and not affiliated with Microsoft. It bundles or derives from the following. Each is used under its own licence.

| Component | Version | Licence | Copyright |
| --- | --- | --- | --- |
| React, React DOM, Scheduler | 19.3.1 / 19.3.1 / 0.28.0 | MIT | Meta Platforms, Inc. and affiliates |
| Monaco Editor (includes TypeScript; see `monaco-ThirdPartyNotices.txt`) | 0.57.0 | MIT (TypeScript: Apache-2.0) | Microsoft Corporation |
| Tailwind CSS, in-browser build (`@tailwindcss/browser`) | 4.3.4 | MIT | Tailwind Labs, Inc. |
| React type definitions (`@types/react`) | 19.3.0 | MIT | Microsoft Corporation |
| csstype | 3.2.4 | MIT | Fredrik Nicol |
| Type subsets adapted from `@microsoft/rayfin-connector-fabric-semanticmodel`, `@microsoft/rayfin-connector-fabric-graphql`, `@microsoft/rayfin-connectors`, `@microsoft/rayfin-core`, `@microsoft/rayfin-data`, `@microsoft/rayfin-client`, `@microsoft/rayfin-lib`, `@microsoft/rayfin-auth`, `@microsoft/fabric-user-data-functions` (in `src/editor-types/packages/`) | 2.0.0 | MIT | Microsoft Corporation |
| The placeholder `schema.ts` and the messages of `connector add` for an entity connector, from `@microsoft/rayfin-cli` (dist/commands/connector/connector-add.js, dist/services/connector-schema-discovery.js), and the read gating messages of `@microsoft/rayfin-connectors` (in `src/project.mjs`, `src/runtime.tsx`) | 2.0.0 | MIT | Microsoft Corporation |
| The functions scaffold's `function_app.ts` (assets/functions/function_app.ts.template) and the messages of `functions init` (dist/commands/functions/functions-init.js), from `@microsoft/rayfin-cli` (in `src/project.mjs`) | 2.0.0 | MIT | Microsoft Corporation |
| Data app template files the simulated terminal writes (`package.json` scripts and dependencies, `rayfin/rayfin.yml`, `rayfin/data/schema.ts`, `src/vite-env.d.ts`; the other files' paths, whose placeholders are written for the playground), from `@microsoft/rayfin-cli` templates/data-app (in `src/project.mjs`) | 2.0.0 | MIT | Microsoft Corporation |
| Figtree font (`@fontsource/figtree`) | 5.3.0 | SIL Open Font License 1.1 | The Figtree Project Authors |
| IBM Plex Mono font (`@fontsource/ibm-plex-mono`) | 5.3.0 | SIL Open Font License 1.1 | IBM Corp. |

**The Visuals page** (`visuals/`) also bundles the following. The lessons page does not.

| Component | Version | Licence | Copyright |
| --- | --- | --- | --- |
| `@microsoft/fabric-visuals`, `@microsoft/fabric-visuals-core`, `@microsoft/fabric-datagrid` | 1.0.0 | MIT | Microsoft Corporation |
| `@microsoft/fabric-slicers`, with its own `@microsoft/fabric-visuals-core` | 4.4.0 (core 5.4.0) | MIT | Microsoft Corporation |
| Griffel (`@griffel/react`, `@griffel/core`) | 1.7.8 / 1.21.4 | MIT | Microsoft Corporation |
| `@fluentui/react-icons` | 2.0.347 | MIT | Not named in the package (it ships no licence file); repository: microsoft/fluentui-system-icons |
| tslib | 2.9.1 | 0BSD | Microsoft Corporation |
| Vega (`vega` and its `vega-*` modules), Vega-Lite | 6.4.0, 6.5.0 | BSD-3-Clause | University of Washington Interactive Data Lab |
| vega-tooltip | 1.1.0 | BSD-3-Clause | Interactive Data Lab and contributors |
| D3 modules (`d3-array`, `d3-color`, `d3-dispatch`, `d3-dsv`, `d3-force`, `d3-format`, `d3-geo`, `d3-geo-projection`, `d3-hierarchy`, `d3-interpolate`, `d3-path`, `d3-quadtree`, `d3-scale`, `d3-scale-chromatic`, `d3-shape`, `d3-time`, `d3-time-format`, `d3-timer`), `internmap`, `topojson-client` | as installed by Vega | ISC | Mike Bostock |
| `d3-delaunay` | 6.0.6 | ISC | Observable, Inc.; Mapbox |
| delaunator (built into d3-delaunay's `dist/d3-delaunay.mjs`, which the bundle uses) | 5.1.0 installed | ISC | Mapbox |
| robust-predicates (built into d3-delaunay's `dist/d3-delaunay.mjs`) | 3.0.3 installed | Unlicense | Public domain (Vladimir Agafonkin) |
| `d3-ease` | 3.0.2 | BSD-3-Clause | Mike Bostock; Robert Penner |
| numfmt (and a second copy under fabric-slicers) | 3.2.6 (4.1.5) | MIT | Borgar Þorsteinsson |
| Radix UI primitives (`@radix-ui/*`) | as installed by fabric-slicers | MIT | WorkOS |
| Floating UI (`@floating-ui/core`, `-dom`, `-react-dom`, `-utils`) | 1.8.0, 1.8.0, 2.1.9, 0.2.12 | MIT | Floating UI contributors |
| TanStack Virtual (`@tanstack/react-virtual`, `@tanstack/virtual-core`) | 3.14.26 / 3.19.11 | MIT | Tanner Linsley |
| `@date-fns/utc` | 2.1.1 | MIT | Sasha Koss |
| `react-remove-scroll`, `react-remove-scroll-bar`, `react-style-singleton`, `use-callback-ref`, `use-sidecar`, `aria-hidden`, `get-nonce` | as installed by fabric-slicers | MIT | Anton Korzunov |
| `lodash.debounce` | 4.0.8 | MIT | jQuery Foundation and other contributors |
| `rtl-css-js` | 1.16.1 | MIT | Kent C. Dodds |
| `stylis` | 4.4.0 | MIT | Sultan Tarimo |
| `@emotion/hash` | 0.9.2 | MIT | Emotion team and other contributors |

The list follows esbuild's metafile: every package with code in the Visuals page's output. fabric-slicers also installs `@daypicker/react`, `date-fns` and `@date-fns/tz`; none of their code ends up in the bundle, so they are not listed. Versions not listed are in `package-lock.json`. `dist/visuals/assets/main.js.LEGAL.txt` holds the licence comments found in the bundled code.

**Data.** The query results are aggregates from a Contoso sample model built with the [SQLBI Contoso Data Generator V2](https://github.com/sql-bi/Contoso-Data-Generator-V2) (MIT, © SQLBI). The lakehouse rows (`data/lakehouse.json`: every store, and the sales lines of the stores in France in 2023) come from the same generated Contoso files (MIT, © SQLBI).

## MIT License (applies to each MIT component above, with its own copyright line)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## BSD 3-Clause License (Vega, Vega-Lite, vega-tooltip, d3-ease; each with its own copyright line)

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## ISC License (the D3 modules, internmap, topojson-client, delaunator; each with its own copyright line)

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

## Zero-Clause BSD (tslib)

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

## The Unlicense (robust-predicates)

This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or distribute this software, either in source code form or as a compiled binary, for any purpose, commercial or non-commercial, and by any means.

In jurisdictions that recognize copyright laws, the author or authors of this software dedicate any and all copyright interest in the software to the public domain. We make this dedication for the benefit of the public at large and to the detriment of our heirs and successors. We intend this dedication to be an overt act of relinquishment in perpetuity of all present and future rights to this software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <http://unlicense.org>

## SIL Open Font License 1.1

The fonts are used under the SIL Open Font License, Version 1.1: <https://openfontlicense.org>

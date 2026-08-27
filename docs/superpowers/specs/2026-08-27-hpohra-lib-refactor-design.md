# hpohra lib/app refactor — design

## Goal

Turn this repo into a simple two-project Angular workspace: a publishable library
(`@p2gx/hpohra`) exposing one component whose only public input is an HPO id, and a
demo app that exercises it. Stand up CI and get the repo ready for an npm release
(not an actual `npm publish` — that stays a manual/human step).

## Non-goals

- No zero-config asset serving for the CSV — consumers wire it into their own
  `assets` for now (documented, not automated).
- No actual `npm publish` execution, no `NPM_TOKEN` secret creation.
- No revisiting the Angular 22 upgrade — staying on Angular 21.x.
- No Storybook, no Nx.

## Workspace layout

Angular CLI multi-project workspace, no Nx:

```
lib/                          # library project "hpohra" (ng-packagr)
  ng-package.json
  package.json                # name: @p2gx/hpohra, publishConfig.access: public
  src/
    public-api.ts             # exports ONLY HpoHraComponent
    lib/
      hpohra.component.ts     # + .html/.scss, selector: hpohra
      hpohra.component.spec.ts
      hpo-mapper.service.ts   # internal, not exported
      hpo-mapper.service.spec.ts
      model.ts                # internal, not exported
    hpo-hra-relevant-dos.csv  # bundled as a public asset via ng-package.json assets

app/                           # application project "demo" (private)
  src/
    app/
      app.ts / .html / .css
    main.ts, index.html, styles.css

angular.json                  # two projects: hpohra (lib), demo (app)
package.json                  # root, private: true, workspace dev tooling only
tsconfig.json                 # path mapping: "@p2gx/hpohra" -> lib/src/public-api.ts
LICENSE                       # MIT, copyright P2GX
scripts/get_terms_for_hra.py  # unchanged, stays at root
.github/workflows/ci.yml
.github/workflows/publish.yml
```

Everything under current `src/` is removed/relocated per below; nothing stays at
repo root under `src/`.

## Library: `HpoHraComponent`

- Selector `hpohra`. Public input: `hpoId = input.required<string>()`. Nothing else
  public — no `title`, no dialog, no `open()`/`close()`, no `closed` output.
- Internally injects the (internal, unexported) `HpoMapService` and computes the
  matching record for the given id via `getSvgRecord` (fixing the previously-broken
  spec that called the nonexistent `getRecord`).
- Template: renders `<img [src]="record().fileUrl" alt="HRA illustration">` when a
  record is found, otherwise a plain "No HRA illustration found for {{ hpoId() }}"
  message. No debug JSON dump, no `alert()`.
- `HpoMapService` keeps its current CSV-parsing logic verbatim (svg/glb/hpo lookup
  maps), just relocated into the lib and fetching from the lib's own asset path.

### CSV asset handling (explicit limitation)

- `hpo-hra-relevant-dos.csv` lives in `lib/src/` and is declared as an `assets`
  entry in `ng-package.json`, so `npm publish` ships it at the package root
  (`node_modules/@p2gx/hpohra/hpo-hra-relevant-dos.csv`).
- The component still fetches it at runtime via `HttpClient` from a relative
  `assets/hpo-hra-relevant-dos.csv` path, same as today. **This means a consuming
  app must copy the shipped CSV into its own `assets` and provide `HttpClient`** —
  there's no automatic wiring yet. This is called out in the lib's README as a
  known "for now" limitation, not solved in this pass.

## Demo app

Keep the current `hra-example` UX largely as-is — title, the HPO term autocomplete
text input with its `<datalist>` suggestions, layout/styling classes — but:

- Remove everything specific to the 3D CDN widget: `HraWidgetComponent`, the CDK
  `Overlay`/`ComponentPortal` wiring, `show3dObject()` / `threeDobjectVisible` /
  `openHraViewer()` / `popupHypoplasiaThymus()`, and the "Show 3d object" button +
  "Dear HRA Team" placeholder block.
- Remove the "Show SVG" button and the preset shortcut buttons (Splenic
  Cyst / Hepatomegaly) — these existed to open the old dialog-based viewer
  on demand. The new lib component is inline/always-rendering, so as soon as
  `selectedHpoTermId()` resolves, render `<hpohra [hpoId]="hpoId" />` directly
  in the existing `.viewer-wrapper` div. No explicit "open" step needed.
- The demo app keeps its own copy of `HpoMapService`-equivalent lookup for the
  autocomplete (label → id), since that's demo-only convenience code, not part of
  the lib's public API. Simplest option: the demo app has its own small local
  service/constant built from the same CSV (copied into `app/public/`) purely to
  drive the autocomplete labels — it does not import anything from the lib besides
  `HpoHraComponent`.
- Result: type/pick an HPO term label → the matching `<hpohra>` renders inline
  showing its SVG (or the "not found" message).

## Removed entirely

- `hra-widget` component (CDN 3D illustration wrapper)
- `hra-example`'s dialog/overlay/preset-button logic (superseded by the simplified
  demo above; the autocomplete input UX itself is kept)
- `hra-viewer` component (replaced by `HpoHraComponent`)
- `@hra-api/ng-client` dependency + `provideApi(...)` call (only consumer was
  `hra-widget`)
- Storybook: `.storybook/`, `@storybook/*`, `@compodoc/compodoc`, `jsdom` devDeps,
  the `storybook`/`build-storybook` npm scripts and `angular.json` architect targets
- `documentation.json` (stray committed compodoc output) — deleted and gitignored
- Unused `nx`, `@nx/angular`, `@nx/workspace` devDependencies

## Root config changes

- `angular.json`: two projects — `hpohra` (library, root `lib`) and `demo`
  (application, root `app`).
- Root `package.json`: `"private": true`; scripts for `build:lib`, `build:demo`,
  `test:lib`; drops storybook/nx deps and scripts.
- `tsconfig.json`: path mapping `"@p2gx/hpohra": ["lib/src/public-api.ts"]` so the
  demo app (and its tests) resolve the lib from source locally, using the same
  import specifier real consumers will use post-publish.

## CI & npm release prep

- `.github/workflows/ci.yml` — on push and PR: `npm ci`, build lib, test lib,
  build demo.
- `.github/workflows/publish.yml` — on GitHub Release published (or manual
  `workflow_dispatch`): `npm ci`, build lib, `npm publish --access public` from the
  built lib package. Requires a `NPM_TOKEN` secret the user adds themselves; this
  workflow is not triggered as part of this task.
- `lib/package.json`: `name: "@p2gx/hpohra"`, `version: "0.1.0"`,
  `publishConfig.access: "public"`, `license: "MIT"`, peer deps as generated by
  `ng generate library` for the installed Angular 21.x.
- Root `LICENSE`: MIT, copyright holder `P2GX`.
- `README.md`: rewritten — what the package does, install/usage snippet
  (`<hpohra [hpoId]="...">`), the CSV-asset limitation, how to run the demo
  locally, how CI/release work.

## Testing

- `hpo-mapper.service.spec.ts`: CSV parsing + `getSvgRecord` (fixes the previously
  broken spec that referenced `getRecord`).
- `hpohra.component.spec.ts`: renders the image when a record is found; renders the
  fallback message when it isn't. Uses `HttpTestingController` to serve a small
  fixture CSV.
- Demo app: keep the Angular-CLI-default smoke test (renders without error).

## Open items / explicit "for now" acceptances

- CSV asset wiring into consumer apps is manual (documented, not automated).
- No automated npm publish — CI builds/tests only; release is a human trigger.

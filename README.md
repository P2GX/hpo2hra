# hpo2hra

A small Angular workspace with:

- `lib/` — the `@p2gx/hpohra` library: a single component, `<hpohra [hpoId]="...">`,
  that renders the Human Reference Atlas illustration for a given HPO term id.
- `app/` — a demo application exercising the library with an HPO term autocomplete.

## Using the library

```bash
npm install @p2gx/hpohra
```

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHpohra } from '@p2gx/hpohra';

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(), provideHpohra()],
};
```

```typescript
import { Hpohra } from '@p2gx/hpohra';

@Component({
  imports: [Hpohra],
  template: `<hpohra [hpoId]="'HP:0002097'" />`,
})
export class MyComponent {}
```

**`provideHpohra()` (required):** the illustration is rendered with HuBMAP's
[`hra-medical-illustration`](https://github.com/hubmapconsortium/hra-ui/tree/main/apps/medical-illustration)
web component, which is only distributed as a script bundle, not an npm package.
`provideHpohra()` loads it by injecting a `<link>`/`<script>` pointing at
`cdn.humanatlas.io` into `document.head` on startup — allowlist that host in your
CSP if you have one.

**CSV asset (required, manual step for now):** the component looks up its data from
`assets/hpo-hra-relevant-dos.csv` at runtime via `HttpClient`. Copy the file from
`node_modules/@p2gx/hpohra/hpo-hra-relevant-dos.csv` into your app's own
`public/assets/` (or `src/assets/`, depending on your Angular version) and make sure
`provideHttpClient()` is configured. See `app/` in this repo for a working example.

## Developing in this repo

The demo app resolves `@p2gx/hpohra` from the library's **build output**
(`dist/hpohra`), not its source — build the library at least once before serving or
building the demo, and rebuild it after any library change:

```bash
npm install
npm run build:lib
npm run start
```

Build and test the library:
```bash
npm run build:lib
npm run test:lib
```

Build and test the demo app:
```bash
npm run build:demo
npm run test:demo
```

## CI and releases

`.github/workflows/ci.yml` builds and tests both projects on every push and pull
request. `.github/workflows/publish.yml` builds the library and runs `npm publish`
when a GitHub Release is published (or via manual dispatch) — it requires an
`NPM_TOKEN` repository secret with publish rights for the `@p2gx` npm scope.

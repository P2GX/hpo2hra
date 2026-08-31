# @p2gx/hpohra

An Angular component that renders the Human Reference Atlas illustration for a
given HPO (Human Phenotype Ontology) term id.

## Install

```bash
npm install @p2gx/hpohra
```

## Usage

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

`hpoId` is the component's only input, required. When a matching illustration is
found it's rendered with HuBMAP's [`hra-medical-illustration`](https://github.com/hubmapconsortium/hra-ui/tree/main/apps/medical-illustration)
web component; otherwise a "No HRA illustration found" message is shown.

**`provideHpohra()` (required):** `hra-medical-illustration` is only distributed as
a web component bundle, not an npm package. `provideHpohra()` loads it by injecting
a `<link>` and `<script>` tag pointing at `cdn.humanatlas.io` into `document.head`
the first time your app starts — if you have a Content Security Policy, allowlist
that host for `script-src`/`style-src`.

## CSV asset

This package ships `hpo-hra-relevant-dos.csv` at its package root. The component
fetches it at runtime via `HttpClient` from a relative `assets/hpo-hra-relevant-dos.csv`
path, so your app needs to copy
`node_modules/@p2gx/hpohra/hpo-hra-relevant-dos.csv` into its own served assets
(e.g. `public/assets/`) and provide `HttpClient` (`provideHttpClient()`).

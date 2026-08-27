# hpohra lib/app refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn this repo into a two-project Angular workspace — a publishable library `@p2gx/hpohra` exposing one component whose only public input is an HPO id, and a demo app that exercises it — with working CI and everything an npm release needs except the actual `npm publish`.

**Architecture:** Angular CLI multi-project workspace (no Nx). `lib/` is an ng-packagr library project (`hpohra`) with a single component `Hpohra` (selector `hpohra`) backed by an internal, unexported `HpoMapService` that parses a bundled CSV. `app/` is a plain Angular application project (`demo`) that reuses the existing autocomplete UX to drive `<hpohra [hpoId]="...">`. All widget/dialog/CDN-illustration code and its dependencies (`@hra-api/ng-client`, `@angular/cdk`) are dropped, along with unused Storybook/Nx tooling.

**Tech Stack:** Angular 21.2.22 (standalone components, signals, `@angular/build:*` esbuild builders), ng-packagr, Vitest (via `@angular/build:unit-test`), npm workspaces-free multi-project `angular.json`, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-27-hpohra-lib-refactor-design.md`

## Global Constraints

- Angular packages stay pinned to `^21.1.0` (do not touch/re-attempt the Angular 22 bump) — spec non-goals.
- Package name is exactly `@p2gx/hpohra`, `publishConfig.access: "public"` — spec CSV/npm sections.
- No zero-config CSV asset serving — consumers (including the demo app itself) must place the CSV under their own `assets`/`public/assets` path — spec "CSV asset handling".
- No `npm publish` is executed and no `NPM_TOKEN` secret is created as part of this plan — spec non-goals.
- License is MIT, copyright holder `P2GX` — spec "npm release prep".

---

## Task 1: Scaffold the library and application projects

**Files:**
- Create: `lib/**` (via `ng generate library`)
- Create: `app/**` (via `ng generate application`)
- Modify: `angular.json`, `package.json`, `tsconfig.json` (auto-updated by the generators)

**Interfaces:**
- Produces: two new Angular CLI projects, `hpohra` (library, root `lib`) and `demo` (application, root `app`), registered in `angular.json`. Later tasks overwrite their default-generated source files.

- [ ] **Step 1: Generate the `hpohra` library**

Run:
```bash
npx ng generate library "@p2gx/hpohra" --project-root=lib --prefix=hpohra --skip-install --defaults
```
Expected output includes `CREATE lib/ng-package.json`, `CREATE lib/package.json`, `CREATE lib/src/public-api.ts`, `CREATE lib/src/lib/hpohra.ts`, `CREATE lib/src/lib/hpohra.spec.ts`, `UPDATE angular.json`, `UPDATE package.json`, `UPDATE tsconfig.json`.

**Important:** the CLI registers the project in `angular.json` under the key `@p2gx/hpohra` (the full scoped name you passed), not `hpohra`. Until Task 5 renames it, all `ng build`/`ng test` invocations against the library must use the quoted scoped name: `ng build "@p2gx/hpohra"`. Task 5's `angular.json` rewrite renames the project key to plain `hpohra` (the npm package name stays `@p2gx/hpohra` via `lib/package.json` regardless — CLI project names and published package names don't have to match).

- [ ] **Step 2: Generate the `demo` application**

Run:
```bash
npx ng generate application demo --project-root=app --routing=false --style=css --skip-install --defaults
```
Expected output includes `CREATE app/src/app/app.ts`, `CREATE app/src/main.ts`, `CREATE app/public/favicon.ico`, `UPDATE angular.json`, `UPDATE tsconfig.json`.

- [ ] **Step 3: Install the newly-added dependencies (ng-packagr, etc.)**

Run: `npm install`
Expected: completes without `ERESOLVE` errors (only `@hra-api/ng-client`'s Angular 21 peer requirement is in play, unchanged from before).

- [ ] **Step 4: Verify both projects build and test out of the box**

Run:
```bash
npx ng build "@p2gx/hpohra"
npx ng test "@p2gx/hpohra" --watch=false
npx ng build demo
npx ng test demo --watch=false
```
Expected: all four commands succeed (the generators' default stub component/tests pass). The pre-existing `hpo2hra` project and its known-broken spec are untouched and irrelevant here.

- [ ] **Step 5: Commit**

```bash
git add lib app angular.json package.json package-lock.json tsconfig.json
git commit -m "Scaffold hpohra library and demo application projects"
```

---

## Task 2: Library internals — model, HpoMapService, bundled CSV

**Files:**
- Create: `lib/src/lib/model.ts`
- Create: `lib/src/lib/hpo-mapper.ts`
- Create: `lib/src/lib/hpo-mapper.spec.ts`
- Create: `lib/src/hpo-hra-relevant-dos.csv` (copied from `src/assets/hpo-hra-relevant-dos.csv`)
- Modify: `lib/ng-package.json` (bundle the CSV as a public asset; simplify `dest`)

**Interfaces:**
- Produces: `HraRecord`/`HraDatabase` types from `./model`; `HpoMapService` (class, `providedIn: 'root'`) from `./hpo-mapper` with `readonly getSvgRecord: (hpoId: string) => Signal<HraRecord | null>`, `readonly getGlbRecord: (hpoId: string) => Signal<HraRecord | null>`, `readonly availableHpoMap: Signal<Record<string, string>>`. Neither file is re-exported from `public-api.ts` — internal to the library.
- Consumes: nothing from Task 1 beyond the scaffolded project.

- [ ] **Step 1: Copy the CSV data file into the library**

```bash
cp src/assets/hpo-hra-relevant-dos.csv lib/src/hpo-hra-relevant-dos.csv
```

- [ ] **Step 2: Create the internal model**

Create `lib/src/lib/model.ts`:
```typescript
export interface HraRecord {
  hpoIri: string;
  hpoLabel: string;
  term: string;
  termLabel: string;
  doType: string;
  digitalObject: string;
  fileUrl: string;
}

export type HraDatabase = Record<string, HraRecord>;
```

- [ ] **Step 3: Create the internal HpoMapService**

Create `lib/src/lib/hpo-mapper.ts`:
```typescript
import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { HraRecord } from './model';

@Injectable({
  providedIn: 'root',
})
export class HpoMapService {
  private http = inject(HttpClient);

  private databases = toSignal(
    this.http.get('assets/hpo-hra-relevant-dos.csv', { responseType: 'text' }).pipe(
      map((csvText) => this.parseCsv(csvText))
    ),
    {
      initialValue: {
        svg: {} as Record<string, HraRecord>,
        glb: {} as Record<string, HraRecord>,
        hpo: {} as Record<string, string>,
      },
    }
  );

  private svgDatabase = computed(() => this.databases().svg);
  private glbDatabase = computed(() => this.databases().glb);
  private _availableHpoLabels = computed(() => this.databases().hpo);

  readonly availableHpoMap = this._availableHpoLabels;

  private parseCsv(content: string): {
    svg: Record<string, HraRecord>;
    glb: Record<string, HraRecord>;
    hpo: Record<string, string>;
  } {
    const lines = content.split('\n');
    const svgLookup: Record<string, HraRecord> = {};
    const glbLookup: Record<string, HraRecord> = {};
    const hpoLabelToId: Record<string, string> = {};

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [hpo_iri, hpo_label, term, term_label, do_type, digital_object, file_url] = line.split(',');
      if (!hpo_iri || !file_url) continue;
      const id = hpo_iri.split('/').pop()?.replace('_', ':') || '';

      if (id) {
        hpoLabelToId[hpo_label] = id;
        const record: HraRecord = {
          hpoIri: hpo_iri,
          hpoLabel: hpo_label,
          term,
          termLabel: term_label,
          doType: do_type,
          digitalObject: digital_object,
          fileUrl: file_url,
        };
        const lc_file_url = file_url.trim().toLocaleLowerCase();
        if (lc_file_url.endsWith('svg')) {
          svgLookup[id] = record;
        } else if (lc_file_url.endsWith('glb')) {
          glbLookup[id] = record;
        } else {
          throw Error(`Unrecognized file suffix: '${lc_file_url}'`);
        }
      }
    }

    return { svg: svgLookup, glb: glbLookup, hpo: hpoLabelToId };
  }

  readonly getSvgRecord = (hpoId: string) => computed(() => this.svgDatabase()[hpoId] || null);
  readonly getGlbRecord = (hpoId: string) => computed(() => this.glbDatabase()[hpoId] || null);
}
```

Note: this fixes the previously-broken app-level spec, which called a nonexistent `getRecord` — the real method is `getSvgRecord`.

- [ ] **Step 4: Write the service spec**

Create `lib/src/lib/hpo-mapper.spec.ts`:
```typescript
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HpoMapService } from './hpo-mapper';

const CSV_FIXTURE = [
  'hpo_iri,hpo_label,term,term_label,do_type,digital_object,file_url',
  'http://purl.obolibrary.org/obo/HP_0002097,Emphysema,http://purl.obolibrary.org/obo/UBERON_0002048,lung,2d-ftu,https://purl.humanatlas.io/2d-ftu/lung,https://cdn.humanatlas.io/digital-objects/2d-ftu/lung/v1/assets/2d-ftu-lung.svg',
].join('\n');

describe('HpoMapService', () => {
  let service: HpoMapService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HpoMapService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('parses the CSV and resolves an SVG record by HPO id', () => {
    httpMock.expectOne('assets/hpo-hra-relevant-dos.csv').flush(CSV_FIXTURE);

    const record = service.getSvgRecord('HP:0002097')();

    expect(record?.hpoLabel).toBe('Emphysema');
    expect(record?.fileUrl).toBe(
      'https://cdn.humanatlas.io/digital-objects/2d-ftu/lung/v1/assets/2d-ftu-lung.svg'
    );
  });

  it('returns null for an unknown HPO id', () => {
    httpMock.expectOne('assets/hpo-hra-relevant-dos.csv').flush(CSV_FIXTURE);

    expect(service.getSvgRecord('HP:9999999')()).toBeNull();
  });

  it('exposes the label to id map for autocomplete-style lookups', () => {
    httpMock.expectOne('assets/hpo-hra-relevant-dos.csv').flush(CSV_FIXTURE);

    expect(service.availableHpoMap()).toEqual({ Emphysema: 'HP:0002097' });
  });
});
```

- [ ] **Step 5: Rewire ng-package.json**

The generator's default `hpohra.ts`/`hpohra.spec.ts` stub files are untouched here — Task 3 overwrites both.

Overwrite `lib/ng-package.json`:
```json
{
  "$schema": "../node_modules/ng-packagr/ng-package.schema.json",
  "dest": "../dist/hpohra",
  "lib": {
    "entryFile": "src/public-api.ts"
  },
  "assets": [{ "glob": "hpo-hra-relevant-dos.csv", "input": "src", "output": "." }]
}
```
(A bare string entry like `"src/hpo-hra-relevant-dos.csv"` copies to `dist/hpohra/src/hpo-hra-relevant-dos.csv`, preserving the source-relative path — the `{glob, input, output}` object form above is what actually lands the file at the package root, `dist/hpohra/hpo-hra-relevant-dos.csv`, confirmed by building and inspecting `dist/hpohra/`.)

- [ ] **Step 6: Run the service test**

Run: `npx ng test "@p2gx/hpohra" --watch=false`
Expected: PASS — the generator's stub `hpohra.ts` component is untouched and still compiles fine (it's overwritten in Task 3, not deleted here); the three new `hpo-mapper.spec.ts` assertions pass. If anything fails, stop and investigate before moving on.

- [ ] **Step 7: Commit**

```bash
git add lib/src/lib/model.ts lib/src/lib/hpo-mapper.ts lib/src/lib/hpo-mapper.spec.ts lib/src/hpo-hra-relevant-dos.csv lib/ng-package.json
git commit -m "Add internal HpoMapService, model, and bundled CSV to the hpohra lib"
```

---

## Task 3: `Hpohra` component (the library's public API)

**Files:**
- Modify: `lib/src/lib/hpohra.ts` (overwrite generator stub)
- Modify: `lib/src/lib/hpohra.spec.ts` (overwrite generator stub)
- Verify (no change expected): `lib/src/public-api.ts` already exports `./lib/hpohra`

**Interfaces:**
- Consumes: `HpoMapService` from `./hpo-mapper` (Task 2) — `getSvgRecord(hpoId: string): Signal<HraRecord | null>`.
- Produces: `Hpohra` component, selector `hpohra`, single public input `hpoId = input.required<string>()`. This is the ONLY export from `@p2gx/hpohra`.

- [ ] **Step 1: Overwrite the component**

Overwrite `lib/src/lib/hpohra.ts`:
```typescript
import { Component, computed, inject, input } from '@angular/core';
import { HpoMapService } from './hpo-mapper';

@Component({
  selector: 'hpohra',
  template: `
    @if (record(); as r) {
      <img [src]="r.fileUrl" [alt]="'HRA illustration for ' + hpoId()" />
    } @else {
      <p>No HRA illustration found for {{ hpoId() }}</p>
    }
  `,
})
export class Hpohra {
  hpoId = input.required<string>();

  private hpoMapService = inject(HpoMapService);

  protected record = computed(() => this.hpoMapService.getSvgRecord(this.hpoId())());
}
```

- [ ] **Step 2: Confirm the public API file needs no change**

Read `lib/src/public-api.ts` and confirm it contains exactly:
```typescript
/*
 * Public API Surface of hpohra
 */
export * from './lib/hpohra';
```
If it differs (e.g. references a different path), fix it to match.

- [ ] **Step 3: Overwrite the component spec**

Overwrite `lib/src/lib/hpohra.spec.ts`:
```typescript
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Hpohra } from './hpohra';

const CSV_FIXTURE = [
  'hpo_iri,hpo_label,term,term_label,do_type,digital_object,file_url',
  'http://purl.obolibrary.org/obo/HP_0002097,Emphysema,http://purl.obolibrary.org/obo/UBERON_0002048,lung,2d-ftu,https://purl.humanatlas.io/2d-ftu/lung,https://cdn.humanatlas.io/digital-objects/2d-ftu/lung/v1/assets/2d-ftu-lung.svg',
].join('\n');

describe('Hpohra', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Hpohra],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('renders the resolved image for a known hpoId', () => {
    const fixture = TestBed.createComponent(Hpohra);
    fixture.componentRef.setInput('hpoId', 'HP:0002097');
    fixture.detectChanges();
    httpMock.expectOne('assets/hpo-hra-relevant-dos.csv').flush(CSV_FIXTURE);
    fixture.detectChanges();

    const img: HTMLImageElement | null = fixture.nativeElement.querySelector('img');
    expect(img?.getAttribute('src')).toBe(
      'https://cdn.humanatlas.io/digital-objects/2d-ftu/lung/v1/assets/2d-ftu-lung.svg'
    );
  });

  it('renders a fallback message for an unknown hpoId', () => {
    const fixture = TestBed.createComponent(Hpohra);
    fixture.componentRef.setInput('hpoId', 'HP:0000000');
    fixture.detectChanges();
    httpMock.expectOne('assets/hpo-hra-relevant-dos.csv').flush(CSV_FIXTURE);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No HRA illustration found for HP:0000000');
  });
});
```

- [ ] **Step 4: Run the full lib test suite and build**

Run:
```bash
npx ng test "@p2gx/hpohra" --watch=false
npx ng build "@p2gx/hpohra"
```
Expected: both `hpo-mapper.spec.ts` and `hpohra.spec.ts` pass (5 tests total); the build succeeds and `dist/hpohra/hpo-hra-relevant-dos.csv` exists after the build.

Run: `ls dist/hpohra/hpo-hra-relevant-dos.csv` to confirm the asset was bundled.

- [ ] **Step 5: Commit**

```bash
git add lib/src/lib/hpohra.ts lib/src/lib/hpohra.spec.ts
git commit -m "Implement the Hpohra component as the library's sole public export"
```

---

## Task 4: Demo app

**Files:**
- Create: `app/src/app/hpo-terms.ts`
- Create: `app/src/app/hpo-terms.spec.ts`
- Modify: `app/src/app/app.ts`, `app/src/app/app.html`, `app/src/app/app.css`, `app/src/app/app.spec.ts`, `app/src/app/app.config.ts`
- Create: `app/public/assets/hpo-hra-relevant-dos.csv` (copied from `src/assets/hpo-hra-relevant-dos.csv`)

**Interfaces:**
- Consumes: `Hpohra` from `@p2gx/hpohra` (Task 3) — selector `hpohra`, input `hpoId`.
- Produces: nothing consumed by later tasks — this is the leaf application.

- [ ] **Step 1: Copy the CSV into the demo app's own assets**

```bash
mkdir -p app/public/assets
cp src/assets/hpo-hra-relevant-dos.csv app/public/assets/hpo-hra-relevant-dos.csv
```
This is the demo app acting as its own "consumer" of the library — it wires the CSV into its `public/assets/` so both its own autocomplete lookup and the internal `HpoMapService` inside `<hpohra>` (which fetches `assets/hpo-hra-relevant-dos.csv`) can find it at `/assets/hpo-hra-relevant-dos.csv`.

- [ ] **Step 2: Create the demo's own label lookup service**

Create `app/src/app/hpo-terms.ts`:
```typescript
import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HpoTerms {
  private http = inject(HttpClient);

  private labelToId = toSignal(
    this.http.get('assets/hpo-hra-relevant-dos.csv', { responseType: 'text' }).pipe(
      map((csvText) => this.parseLabels(csvText))
    ),
    { initialValue: {} as Record<string, string> }
  );

  readonly availableLabels = computed(() => Object.keys(this.labelToId()));

  idForLabel(label: string): string | null {
    return this.labelToId()[label] ?? null;
  }

  private parseLabels(content: string): Record<string, string> {
    const lines = content.split('\n');
    const labelToId: Record<string, string> = {};
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const [hpo_iri, hpo_label] = line.split(',');
      if (!hpo_iri) continue;
      const id = hpo_iri.split('/').pop()?.replace('_', ':') || '';
      if (id) labelToId[hpo_label] = id;
    }
    return labelToId;
  }
}
```

This is intentionally a separate, minimal reimplementation for the demo's autocomplete only (label → id) — it does not import anything from the library beyond `Hpohra` itself, keeping the demo a genuine external consumer of the published API.

- [ ] **Step 3: Write the service spec**

Create `app/src/app/hpo-terms.spec.ts`:
```typescript
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HpoTerms } from './hpo-terms';

const CSV_FIXTURE = [
  'hpo_iri,hpo_label,term,term_label,do_type,digital_object,file_url',
  'http://purl.obolibrary.org/obo/HP_0002097,Emphysema,http://purl.obolibrary.org/obo/UBERON_0002048,lung,2d-ftu,https://purl.humanatlas.io/2d-ftu/lung,https://cdn.humanatlas.io/digital-objects/2d-ftu/lung/v1/assets/2d-ftu-lung.svg',
].join('\n');

describe('HpoTerms', () => {
  let service: HpoTerms;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HpoTerms);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('resolves an id for a known label and lists available labels', () => {
    httpMock.expectOne('assets/hpo-hra-relevant-dos.csv').flush(CSV_FIXTURE);

    expect(service.idForLabel('Emphysema')).toBe('HP:0002097');
    expect(service.availableLabels()).toEqual(['Emphysema']);
  });

  it('returns null for an unknown label', () => {
    httpMock.expectOne('assets/hpo-hra-relevant-dos.csv').flush(CSV_FIXTURE);

    expect(service.idForLabel('Not A Real Term')).toBeNull();
  });
});
```

- [ ] **Step 4: Add HttpClient to the app config**

Overwrite `app/src/app/app.config.ts`:
```typescript
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideHttpClient()],
};
```

- [ ] **Step 5: Rewrite the root component**

Overwrite `app/src/app/app.ts`:
```typescript
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Hpohra } from '@p2gx/hpohra';
import { HpoTerms } from './hpo-terms';

@Component({
  selector: 'app-root',
  imports: [FormsModule, Hpohra],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private hpoTerms = inject(HpoTerms);

  title = signal('HRA / HPO Viewer Widget');
  selectedHpoTermLabel = signal('');

  availableHpoTermLabels = computed(() => this.hpoTerms.availableLabels());

  filteredTerms = computed(() => {
    const typed = this.selectedHpoTermLabel().trim().toLowerCase();
    if (!typed) return [];
    return this.availableHpoTermLabels()
      .filter((t) => t.toLowerCase().includes(typed))
      .slice(0, 20);
  });

  selectedHpoTermId = computed(() => this.hpoTerms.idForLabel(this.selectedHpoTermLabel()));
}
```

- [ ] **Step 6: Rewrite the template**

Overwrite `app/src/app/app.html`:
```html
<div class="widget-container">
  <h1 class="widget-title">{{ title() }}</h1>

  <div class="widget-body">
    <div class="input-group">
      <label for="hpo-term" class="section-label">HPO Term</label>
      <input
        id="hpo-term"
        type="text"
        class="form-control text-input-look"
        placeholder="Type HPO term or label (e.g., Emphysema)"
        [ngModel]="selectedHpoTermLabel()"
        (ngModelChange)="selectedHpoTermLabel.set($event)"
        list="hpo-suggestions"
        autocomplete="off"
        spellcheck="false"
      />
      <datalist id="hpo-suggestions">
        @for (term of filteredTerms(); track term) {
          <option [value]="term"></option>
        }
      </datalist>
    </div>

    @if (selectedHpoTermId(); as hpoId) {
      <div class="viewer-wrapper">
        <hpohra [hpoId]="hpoId" />
      </div>
    }
  </div>
</div>
```

- [ ] **Step 7: Port the widget styling (flattened from SCSS to plain CSS)**

Overwrite `app/src/app/app.css`:
```css
.widget-container {
  padding: 1.5rem 2rem;
  margin: 1.5rem auto;
  max-width: 1200px;
  box-sizing: border-box;
}

.widget-container .widget-title {
  width: 90%;
  margin: 0 auto 1.5rem auto;
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--text-color, #2c3e50);
  border-bottom: 2px solid var(--border-color, #e2e8f0);
  padding-bottom: 0.5rem;
}

.widget-container .widget-body {
  width: 90%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.widget-container .input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.widget-container .input-group .section-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--label-color, #4a5568);
  letter-spacing: 0.01em;
}

.widget-container .input-group .text-input-look {
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  color: var(--input-text, #2d3748);
  background-color: var(--input-bg, #ffffff);
  border: 1.5px solid var(--input-border, #cbd5e0);
  border-radius: 6px;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.widget-container .input-group .text-input-look::placeholder {
  color: #a0aec0;
}

.widget-container .input-group .text-input-look:hover:not(:focus) {
  border-color: #a0aec0;
}

.widget-container .input-group .text-input-look:focus {
  outline: none;
  border-color: var(--primary-color, #3182ce);
  box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.15);
}

.widget-container .viewer-wrapper {
  width: 100%;
}
```

- [ ] **Step 8: Rewrite the app smoke test**

Overwrite `app/src/app/app.spec.ts`:
```typescript
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('HRA / HPO Viewer Widget');
  });
});
```

- [ ] **Step 9: Build the library, then run the demo test suite and build**

**Important — real dev workflow, discovered while executing this plan:** the CLI generator's `updateTsConfig` step points the `@p2gx/hpohra` path mapping at the library's **build output** (`./dist/hpohra`), not at `lib/src/public-api.ts` source. So the demo project only resolves `@p2gx/hpohra` after the library has been built at least once; it does not compile against lib source directly. Rebuild the lib after every lib change before touching the demo.

Run:
```bash
npx ng build "@p2gx/hpohra"
npx ng test demo --watch=false
npx ng build demo
```
Expected: all tests pass; build succeeds; `dist/demo/browser/assets/hpo-hra-relevant-dos.csv` exists (confirms the `public/` copy step worked).

Run: `ls dist/demo/browser/assets/hpo-hra-relevant-dos.csv` to confirm.

- [ ] **Step 10: Commit**

```bash
git add app/src/app/hpo-terms.ts app/src/app/hpo-terms.spec.ts app/src/app/app.ts app/src/app/app.html app/src/app/app.css app/src/app/app.spec.ts app/src/app/app.config.ts app/public/assets/hpo-hra-relevant-dos.csv
git commit -m "Build the demo app's autocomplete UI around the hpohra component"
```

---

## Task 5: Remove the old single-project scaffold and unused dependencies

**Files:**
- Delete: `src/` (entire old app source tree), `public/`, `tsconfig.app.json`, `tsconfig.spec.json`, `.storybook/`, `documentation.json`
- Modify: `angular.json`, `package.json`, `tsconfig.json` (full rewrite to final two-project state), `.gitignore`

**Interfaces:**
- Consumes: nothing new — this is pure removal/cleanup now that Tasks 2–4 no longer need anything from the old `src/`.

- [ ] **Step 1: Delete the old scaffold**

```bash
git rm -r src public tsconfig.app.json tsconfig.spec.json .storybook documentation.json
```

- [ ] **Step 2: Rewrite angular.json to the final two-project state**

Overwrite `angular.json`:
```json
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "cli": {
    "packageManager": "npm",
    "analytics": false
  },
  "newProjectRoot": "projects",
  "projects": {
    "hpohra": {
      "projectType": "library",
      "root": "lib",
      "sourceRoot": "lib/src",
      "prefix": "hpohra",
      "architect": {
        "build": {
          "builder": "@angular/build:ng-packagr",
          "defaultConfiguration": "production",
          "configurations": {
            "production": {
              "tsConfig": "lib/tsconfig.lib.prod.json"
            },
            "development": {
              "tsConfig": "lib/tsconfig.lib.json"
            }
          }
        },
        "test": {
          "builder": "@angular/build:unit-test",
          "options": {
            "tsConfig": "lib/tsconfig.spec.json"
          }
        }
      }
    },
    "demo": {
      "projectType": "application",
      "root": "app",
      "sourceRoot": "app/src",
      "prefix": "app",
      "architect": {
        "build": {
          "builder": "@angular/build:application",
          "options": {
            "browser": "app/src/main.ts",
            "tsConfig": "app/tsconfig.app.json",
            "assets": [
              {
                "glob": "**/*",
                "input": "app/public"
              }
            ],
            "styles": ["app/src/styles.css"]
          },
          "configurations": {
            "production": {
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "500kB",
                  "maximumError": "1MB"
                },
                {
                  "type": "anyComponentStyle",
                  "maximumWarning": "4kB",
                  "maximumError": "8kB"
                }
              ],
              "outputHashing": "all"
            },
            "development": {
              "optimization": false,
              "extractLicenses": false,
              "sourceMap": true
            }
          },
          "defaultConfiguration": "production"
        },
        "serve": {
          "builder": "@angular/build:dev-server",
          "defaultConfiguration": "development",
          "configurations": {
            "production": {
              "buildTarget": "demo:build:production"
            },
            "development": {
              "buildTarget": "demo:build:development"
            }
          }
        },
        "test": {
          "builder": "@angular/build:unit-test"
        }
      }
    }
  }
}
```

- [ ] **Step 3: Rewrite root package.json**

Overwrite `package.json`:
```json
{
  "name": "hpo2hra",
  "version": "0.1.1",
  "private": true,
  "scripts": {
    "ng": "ng",
    "start": "ng serve demo",
    "build:lib": "ng build hpohra",
    "build:demo": "ng build demo",
    "test:lib": "ng test hpohra --watch=false",
    "test:demo": "ng test demo --watch=false"
  },
  "prettier": {
    "printWidth": 100,
    "singleQuote": true,
    "overrides": [
      {
        "files": "*.html",
        "options": {
          "parser": "angular"
        }
      }
    ]
  },
  "packageManager": "npm@11.8.0",
  "dependencies": {
    "@angular/common": "^21.1.0",
    "@angular/compiler": "^21.1.0",
    "@angular/core": "^21.1.0",
    "@angular/forms": "^21.1.0",
    "@angular/platform-browser": "^21.1.0",
    "bootstrap": "^5.3.8",
    "rxjs": "~7.8.0",
    "tslib": "^2.3.0"
  },
  "devDependencies": {
    "@angular-devkit/architect": "^0.2101.0",
    "@angular-devkit/build-angular": "^21.1.0",
    "@angular-devkit/core": "^21.1.0",
    "@angular-devkit/schematics": "^21.1.0",
    "@angular/build": "^21.1.4",
    "@angular/cli": "^21.1.4",
    "@angular/compiler-cli": "^21.1.0",
    "@angular/platform-browser-dynamic": "^21.1.0",
    "@schematics/angular": "^21.1.4",
    "ng-packagr": "^21.2.0",
    "typescript": "~5.9.2",
    "vitest": "^4.0.8"
  }
}
```
Note: dependency removals vs. the pre-refactor state — `@hra-api/ng-client` (only used by the deleted CDN widget), `@angular/cdk` (only used by the deleted overlay/portal code), `@angular/router` (routing is off, nothing uses it), `@compodoc/compodoc`, `@storybook/*`, `storybook`, `jsdom`, `nx`, `@nx/angular`, `@nx/workspace`.

- [ ] **Step 4: Rewrite root tsconfig.json**

Overwrite `tsconfig.json`:
```jsonc
/* To learn more about Typescript configuration file: https://www.typescriptlang.org/docs/handbook/tsconfig-json.html. */
/* To learn more about Angular compiler options: https://angular.dev/reference/configs/angular-compiler-options. */
{
  "compileOnSave": false,
  "compilerOptions": {
    "strict": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "experimentalDecorators": true,
    "importHelpers": true,
    "target": "ES2022",
    "module": "preserve",
    "paths": {
      "@p2gx/hpohra": ["./dist/hpohra"]
    }
  },
  "angularCompilerOptions": {
    "enableI18nLegacyMessageIdFormat": false,
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "strictTemplates": true
  },
  "files": [],
  "references": [
    { "path": "./lib/tsconfig.lib.json" },
    { "path": "./lib/tsconfig.spec.json" },
    { "path": "./app/tsconfig.app.json" },
    { "path": "./app/tsconfig.spec.json" }
  ]
}
```

- [ ] **Step 5: Clean up .gitignore**

Read `.gitignore` and remove the two Storybook-only lines (`*storybook.log` and `storybook-static`) — nothing generates them anymore.

- [ ] **Step 6: Full clean install and verification**

```bash
rm -rf node_modules
npm install
npm run build:lib
npm run test:lib
npm run build:demo
npm run test:demo
```
Expected: clean install with no `ERESOLVE` errors (unchanged Angular 21 / `@hra-api/ng-client` situation is gone entirely now, since that dependency was removed); all four commands succeed.

- [ ] **Step 7: Commit**

```bash
git add angular.json package.json package-lock.json tsconfig.json .gitignore
git commit -m "Remove old single-project scaffold, Storybook, Nx, and unused widget dependencies"
```

---

## Task 6: LICENSE and README

**Files:**
- Create: `LICENSE`
- Modify: `README.md`
- Modify: `lib/README.md`

**Interfaces:** none — documentation only.

- [ ] **Step 1: Add the MIT license**

Create `LICENSE`:
```
MIT License

Copyright (c) 2026 P2GX

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Rewrite the root README**

Overwrite `README.md`:
```markdown
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
import { Hpohra } from '@p2gx/hpohra';

@Component({
  imports: [Hpohra],
  template: `<hpohra [hpoId]="'HP:0002097'" />`,
})
export class MyComponent {}
```

**CSV asset (required, manual step for now):** the component looks up its data from
`assets/hpo-hra-relevant-dos.csv` at runtime via `HttpClient`. Copy the file from
`node_modules/@p2gx/hpohra/hpo-hra-relevant-dos.csv` into your app's own
`public/assets/` (or `src/assets/`, depending on your Angular version) and make sure
`provideHttpClient()` is configured. See `app/` in this repo for a working example.

## Developing in this repo

The demo app resolves `@p2gx/hpohra` from the library's **build output**
(`dist/hpohra`), not its source — build the library at least once before
serving or building the demo, and rebuild it after any library change:
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
```

- [ ] **Step 3: Rewrite the library's own README (shown on the npm page)**

Overwrite `lib/README.md`:
```markdown
# @p2gx/hpohra

An Angular component that renders the Human Reference Atlas illustration for a
given HPO (Human Phenotype Ontology) term id.

## Install

```bash
npm install @p2gx/hpohra
```

## Usage

```typescript
import { Hpohra } from '@p2gx/hpohra';

@Component({
  imports: [Hpohra],
  template: `<hpohra [hpoId]="'HP:0002097'" />`,
})
export class MyComponent {}
```

`hpoId` is the component's only input, required. When a matching illustration is
found it's rendered as an `<img>`; otherwise a "No HRA illustration found" message
is shown.

## CSV asset

This package ships `hpo-hra-relevant-dos.csv` at its package root. The component
fetches it at runtime via `HttpClient` from a relative `assets/hpo-hra-relevant-dos.csv`
path, so your app needs to copy
`node_modules/@p2gx/hpohra/hpo-hra-relevant-dos.csv` into its own served assets
(e.g. `public/assets/`) and provide `HttpClient` (`provideHttpClient()`).
```

- [ ] **Step 4: Commit**

```bash
git add LICENSE README.md lib/README.md
git commit -m "Add MIT license and rewrite README/lib README for the npm release"
```

---

## Task 7: GitHub Actions CI, publish workflow, and npm release fields

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/publish.yml`
- Modify: `lib/package.json` (final publish-ready fields)

**Interfaces:** none — this is the last task; it verifies the whole repo end-to-end.

- [ ] **Step 1: Finalize lib/package.json**

Overwrite `lib/package.json`:
```json
{
  "name": "@p2gx/hpohra",
  "version": "0.1.0",
  "description": "Angular component that renders a Human Reference Atlas illustration for a given HPO term id.",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/P2GX/hpo2hra.git"
  },
  "publishConfig": {
    "access": "public"
  },
  "peerDependencies": {
    "@angular/common": "^21.2.0",
    "@angular/core": "^21.2.0"
  },
  "dependencies": {
    "tslib": "^2.3.0"
  },
  "sideEffects": false
}
```
(Peer dependency versions come from whatever the generator auto-set based on the
installed Angular version — `^21.2.0` here, matching Angular 21.2.22.)

- [ ] **Step 2: Add the CI workflow**

Create `.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [master]
  pull_request:

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
          cache: npm
      - run: npm ci
      - run: npm run build:lib
      - run: npm run test:lib
      - run: npm run build:demo
      - run: npm run test:demo
```

- [ ] **Step 3: Add the publish workflow**

Create `.github/workflows/publish.yml`:
```yaml
name: Publish

on:
  release:
    types: [published]
  workflow_dispatch:

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
          cache: npm
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build:lib
      - run: npm publish
        working-directory: dist/hpohra
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```
This workflow will fail until an `NPM_TOKEN` secret (with publish rights to the
`@p2gx` scope) is added to the repository — that secret is out of scope for this
plan; do not add it or trigger a real publish.

- [ ] **Step 4: Full repo verification**

Run:
```bash
rm -rf node_modules dist
npm ci
npm run build:lib
npm run test:lib
npm run build:demo
npm run test:demo
npm pack --dry-run
```
Run the last command from inside `dist/hpohra` (after `npm run build:lib`) —
`cd dist/hpohra && npm pack --dry-run` — and confirm the file list it prints
includes `hpo-hra-relevant-dos.csv` alongside the compiled `.mjs`/`.d.ts` files,
and that the package name shown is `@p2gx/hpohra`.

Run `git status` and confirm the working tree is clean (everything committed) and
`git log --oneline` shows the task-by-task commit history from this plan.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml .github/workflows/publish.yml lib/package.json
git commit -m "Add GitHub Actions CI/publish workflows and finalize lib package.json for npm release"
```

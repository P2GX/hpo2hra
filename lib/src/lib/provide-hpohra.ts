import { EnvironmentProviders, makeEnvironmentProviders, provideAppInitializer } from '@angular/core';

const SCRIPT_URL = 'https://cdn.humanatlas.io/ui/medical-illustration/wc.js';
const STYLES_URL = 'https://cdn.humanatlas.io/ui/medical-illustration/styles.css';
const LOADER_ID = 'hpohra-medical-illustration-loader';

// Guarded by a DOM marker (not a module-level flag) so it stays correct even if
// this module ends up duplicated across bundles.
export function loadMedicalIllustrationElement(): void {
  if (document.getElementById(LOADER_ID)) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = STYLES_URL;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);

  const script = document.createElement('script');
  script.id = LOADER_ID;
  script.src = SCRIPT_URL;
  script.type = 'module';
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
}

export function provideHpohra(): EnvironmentProviders {
  return makeEnvironmentProviders([provideAppInitializer(() => loadMedicalIllustrationElement())]);
}

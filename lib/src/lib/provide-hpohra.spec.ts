import { loadMedicalIllustrationElement } from './provide-hpohra';

const SCRIPT_SELECTOR = 'script[src="https://cdn.humanatlas.io/ui/medical-illustration/wc.js"]';
const LINK_SELECTOR = 'link[href="https://cdn.humanatlas.io/ui/medical-illustration/styles.css"]';

describe('loadMedicalIllustrationElement', () => {
  afterEach(() => {
    document.querySelectorAll(`${SCRIPT_SELECTOR}, ${LINK_SELECTOR}`).forEach((el) => el.remove());
  });

  it('injects the stylesheet and script into <head>', () => {
    loadMedicalIllustrationElement();

    const script = document.head.querySelector(SCRIPT_SELECTOR);
    expect(script).not.toBeNull();
    expect(script?.getAttribute('type')).toBe('module');
    expect(document.head.querySelector(LINK_SELECTOR)).not.toBeNull();
  });

  it('is idempotent across repeated calls', () => {
    loadMedicalIllustrationElement();
    loadMedicalIllustrationElement();

    expect(document.head.querySelectorAll(SCRIPT_SELECTOR).length).toBe(1);
  });
});

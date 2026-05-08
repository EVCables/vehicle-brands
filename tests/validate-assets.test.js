import { describe, expect, it } from 'vitest';
import { validateSvgText } from '../tools/validate-assets.js';

describe('validateSvgText', () => {
  it('accepts a minimal safe SVG', () => {
    expect(() => validateSvgText('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" role="img"><title>Ok</title><desc>Safe</desc><path d="M0 0h10v10H0z"/></svg>')).not.toThrow();
  });

  it('rejects scripts', () => {
    expect(() => validateSvgText('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" role="img"><title>Bad</title><desc>Unsafe</desc><script>alert(1)</script></svg>')).toThrow(/forbidden/);
  });
});

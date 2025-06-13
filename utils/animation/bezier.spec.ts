import { bezier } from './bezier';

const identity = (x: number): number => x;

describe('BezierEasing', () => {
  it('should be a function', () => {
    expect(typeof bezier).toBe('function');
  });

  it('should create a function', () => {
    expect(typeof bezier(0, 0, 1, 1)).toBe('function');
  });

  it('should fail with wrong arguments', () => {
    expect(() => bezier(0.5, 0.5, -5, 0.5)).toThrow();
    expect(() => bezier(0.5, 0.5, 5, 0.5)).toThrow();
    expect(() => bezier(-2, 0.5, 0.5, 0.5)).toThrow();
    expect(() => bezier(2, 0.5, 0.5, 0.5)).toThrow();
  });

  describe('linear curves', () => {
    const testLinearEquality = (easing1: (x: number) => number, easing2: (x: number) => number, samples = 100): void => {
      for (let i = 0; i <= samples; i++) {
        const x = i / samples;
        expect(easing1(x)).toBeCloseTo(easing2(x), 6);
      }
    };

    it('should be linear', () => {
      testLinearEquality(bezier(0, 0, 1, 1), bezier(1, 1, 0, 0));
      testLinearEquality(bezier(0, 0, 1, 1), identity);
    });
  });

  describe('common properties', () => {
    it('should be the right value at extremes', () => {
      Array.from({ length: 100 }).forEach(() => {
        const a = Math.random();
        const b = 2 * Math.random() - 0.5;
        const c = Math.random();
        const d = 2 * Math.random() - 0.5;
        const easing = bezier(a, b, c, d);
        expect(easing(0)).toBe(0);
        expect(easing(1)).toBe(1);
      });
    });

    it('should approach the projected value of its x=y projected curve', () => {
      Array.from({ length: 100 }).forEach(() => {
        const a = Math.random();
        const b = Math.random();
        const c = Math.random();
        const d = Math.random();
        const easing = bezier(a, b, c, d);
        const projected = bezier(b, a, d, c);
        const composed = (x: number): number => projected(easing(x));

        for (let i = 0; i <= 100; i++) {
          const x = i / 100;
          expect(composed(x)).toBeCloseTo(x, 2); // Lower precision for this test
        }
      });
    });
  });

  describe('two same instances', () => {
    it('should be strictly equals', () => {
      Array.from({ length: 100 }).forEach(() => {
        const a = Math.random();
        const b = 2 * Math.random() - 0.5;
        const c = Math.random();
        const d = 2 * Math.random() - 0.5;
        const easing1 = bezier(a, b, c, d);
        const easing2 = bezier(a, b, c, d);

        for (let i = 0; i <= 100; i++) {
          const x = i / 100;
          expect(easing1(x)).toBe(easing2(x));
        }
      });
    });
  });

  describe('symmetric curves', () => {
    it('should have a central value y≈0.5 at x=0.5', () => {
      Array.from({ length: 100 }).forEach(() => {
        const a = Math.random();
        const b = 2 * Math.random() - 0.5;
        const c = 1 - a;
        const d = 1 - b;
        const easing = bezier(a, b, c, d);
        expect(easing(0.5)).toBeCloseTo(0.5, 2);
      });
    });

    it('should be symmetric', () => {
      Array.from({ length: 100 }).forEach(() => {
        const a = Math.random();
        const b = 2 * Math.random() - 0.5;
        const c = 1 - a;
        const d = 1 - b;
        const easing = bezier(a, b, c, d);
        const sym = (x: number): number => 1 - easing(1 - x);

        for (let i = 0; i <= 100; i++) {
          const x = i / 100;
          expect(easing(x)).toBeCloseTo(sym(x), 2);
        }
      });
    });
  });
});

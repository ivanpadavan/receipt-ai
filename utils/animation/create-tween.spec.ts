import { lastValueFrom } from 'rxjs';

import { tap, toArray } from 'rxjs/operators';

import { createTween } from './create-tween';

const linear = (t: number): number => t;
const easeOutSine = (t: number): number => Math.sin(t * (Math.PI / 2));

describe('RxJS Create Tween', () => {
  it('should complete', async () => {
    expect(await lastValueFrom(createTween(linear))).toEqual(1);
  });

  describe('samples', () => {
    let samples: number[];

    beforeAll(async () => {
      samples = await lastValueFrom(createTween(linear, 0, 1, 100).pipe(toArray()));
    });

    it('should exist', () => {
      expect(samples.length).toBeGreaterThan(0);
    });

    it('should be within the range', () => {
      expect(samples.every((x) => x >= 0 && x <= 100)).toBeTruthy();
    });

    it('should start with 0', () => {
      expect(samples[0]).toBe(0);
    });

    it('should end with 1', () => {
      expect(samples[samples.length - 1]).toBe(1);
    });

    it('should be strictly increasing', () => {
      const isIncreasing = samples.reduce(([cond, prevX], x) => [x > prevX && cond, x] as const, [true, -1] as const)[0];
      expect(isIncreasing).toBeTruthy();
    });
  });

  describe('tween observable', () => {
    let completed = false;
    const arr: number[] = [];

    beforeAll(async () => {
      await lastValueFrom(
        createTween(easeOutSine, 0, 1, 100).pipe(
          tap({
            next: () => arr.push(Date.now()),
            complete: () => {
              completed = true;
              arr.push(Date.now());
            },
          }),
        ),
      );
    });

    it('should complete', () => {
      expect(completed).toBeTruthy();
    });

    it('should complete after the last value', () => {
      expect(arr[arr.length - 1]).toBeGreaterThan(arr[arr.length - 2]);
    });
  });
});

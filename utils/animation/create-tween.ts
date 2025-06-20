import { Observable } from 'rxjs';

import { map } from 'rxjs/operators';

import { TweenFn } from './animation.types';

export function createTween(easingFunction: TweenFn, start = 0, finish = 1, duration = 1): Observable<number> {
  return new Observable<number>((observer) => {
    const startTime = performance.now();
    let id: number | undefined;
    const sample = (time: number) => {
      const t = time - startTime;
      if (t < duration) {
        observer.next(easingFunction(t / duration));
        id = requestAnimationFrame(sample);
      } else {
        observer.next(easingFunction(1));
        observer.complete();
      }
    }
    sample(startTime);
    id = requestAnimationFrame(sample);

    return () => {
      if (id) cancelAnimationFrame(id);
    };
  }).pipe(map((value) => start + value * (finish - start)));
}

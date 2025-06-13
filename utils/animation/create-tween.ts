import { Observable } from 'rxjs';

import { map } from 'rxjs/operators';

import { TweenFn } from './animation.types';

export function createTween(easingFunction: TweenFn, start = 0, finish = 1, duration = 1): Observable<number> {
  return new Observable<number>(function (observer) {
    let startTime: number;
    let id = requestAnimationFrame(function sample(time) {
      startTime = startTime || time;
      const t = time - startTime;
      if (t < duration) {
        observer.next(easingFunction(t / duration));
        id = requestAnimationFrame(sample);
      } else {
        observer.next(easingFunction(1));
        id = requestAnimationFrame(function () {
          return observer.complete();
        });
      }
    });
    return function (): void {
      if (id) {
        cancelAnimationFrame(id);
      }
    };
  }).pipe(map((value) => start + value * (finish - start)));
}

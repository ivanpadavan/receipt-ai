import { useEffect, useMemo, useRef } from "react";
import { BehaviorSubject, Observable } from "rxjs";
import { distinctUntilChanged } from "rxjs/operators";

export function useHookToObservable<T>(
  value: T,
  comparator?: (a: T, b: T) => boolean,
): Observable<T> {
  const subjectRef = useRef(new BehaviorSubject<T>(value));

  useEffect(() => {
    subjectRef.current.next(value);
  }, [value]);

  useEffect(() => {
    return () => {
      subjectRef.current.complete();
    };
  }, []);

  return useMemo(
    () => subjectRef.current.asObservable().pipe(distinctUntilChanged(comparator)),
    [comparator],
  );
}

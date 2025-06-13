import { useTeardown } from "@/hooks/useTeardown";
import { useCallback, useMemo, useReducer, useRef, useState } from "react";
import { Observable, Subscription } from "rxjs";

export function useObservableFactory<A extends any[], T, E>(
  sourceFactory: (...args: A) => Observable<T>,
  args: A = [] as unknown as A
): [T, { error: E | undefined, completed: boolean, subscription: Subscription | undefined }] {
  const subscriptionRef = useRef<Subscription | undefined>(undefined);
  const nextValueRef = useRef<T | undefined>(undefined);

  const deps = [sourceFactory, ...args];
  const source$ = useMemo(() => {
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = undefined;
    return sourceFactory(...args);
  }, deps);

  const [error, setError] = useState();
  const [completed, setCompleted] = useState<boolean>(false);
  const [f, forceUpdate] = useReducer(x => x + 1, 0);

  let firstEmission = true;

  const initSubscription = useCallback(() => {
    if (subscriptionRef.current) {return}
    subscriptionRef.current = source$.subscribe({
      next(value) {
        nextValueRef.current = value;
        if (firstEmission) {
          firstEmission = false;
        } else {
          forceUpdate();
        }
      },
      error: setError,
      complete: setCompleted.bind(null, true)
    })
  }, [source$, deps]);

  initSubscription();

  useTeardown(() => subscriptionRef.current?.unsubscribe());

  return [nextValueRef.current!, { error, completed, subscription: subscriptionRef.current }];
}

import { useTeardown } from "@/hooks/useTeardown";
import { useReducer, useRef, useState } from "react";
import { Observable, Subscription } from "rxjs";

/**
 * A hook that subscribes to an Observable and returns its latest value.
 * This is a simpler version of useObservableFactory that doesn't create a new Observable on each render.
 *
 * @param source$ The Observable to subscribe to
 * @returns A tuple containing the latest value from the Observable and metadata about the subscription
 */
export function useObservable<T, E = any>(
  source$: Observable<T>
): [T | undefined, { error: E | undefined, completed: boolean, subscription: Subscription | undefined }] {
  const subscriptionRef = useRef<Subscription | undefined>(undefined);
  const valueRef = useRef<T | undefined>(undefined);

  const [error, setError] = useState<E | undefined>(undefined);
  const [completed, setCompleted] = useState<boolean>(false);
  const [_, forceUpdate] = useReducer(x => x + 1, 0);

  // Initialize the subscription if it doesn't exist
  if (!subscriptionRef.current) {
    subscriptionRef.current = source$.subscribe({
      next(value) {
        const isFirstEmission = valueRef.current === undefined;
        valueRef.current = value;

        // Only force update if this is not the first emission
        // This prevents an extra render on initial subscription
        if (!isFirstEmission) {
          forceUpdate();
        }
      },
      error: setError,
      complete: () => setCompleted(true)
    });
  }

  // Clean up the subscription when the component unmounts
  useTeardown(() => subscriptionRef.current?.unsubscribe());

  return [valueRef.current, { error, completed, subscription: subscriptionRef.current }];
}

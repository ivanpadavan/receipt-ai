import { bezier } from "@/utils/animation/bezier";
import { useCallback, useState } from "react";
import { finalize, Observable, of } from "rxjs";
import { createTween } from '@/utils/animation/create-tween';
import { useObservableFactory } from './useObservableFactory';

type AnimationArgs = Parameters<typeof createTween>;

const enter: AnimationArgs = [bezier(.36,.66,.04,1), 0, 1, 400];
const leave: AnimationArgs = [bezier(.36,.66,.04,1), 1, 0, 450];

/**
 * Custom hook for modal animations
 * @param isOpen Whether the modal is open
 * @returns Animation state and visibility state
 */
export function useModalAnimation(isOpen: boolean) {
  // State to track whether the modal should be in the DOM
  const [isVisible, setIsVisible] = useState(false);

  // Create an observable factory that returns an animation tween
  const animationFactory = useCallback((isOpen: boolean, isVisible: boolean): Observable<number> => {
    // If opening, animate from 1 (bottom) to 0 (top)
    // If closing, animate from 0 (top) to 1 (bottom)

    if (isOpen && isVisible) return of(1);
    if (!isOpen && !isVisible) return of(0);

    return createTween(...(isOpen ? enter : leave)).pipe(
        finalize(() => {
          setIsVisible(isOpen);
        })
      )
  }, []);

  // Subscribe to the animation observable
  const [transitionState] = useObservableFactory(animationFactory, [isOpen, isVisible]);

  return {
    transitionState,
    isVisible: isVisible || isOpen
  };
}

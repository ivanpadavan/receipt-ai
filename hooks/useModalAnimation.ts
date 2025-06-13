import { useEffect, useState } from 'react';
import { defer, EMPTY, finalize, merge, Observable, of } from "rxjs";
import { createTween } from '@/utils/animation/create-tween';
import { modalTween } from '@/utils/animation/bezier';
import { useObservableFactory } from './useObservableFactory';

// Duration of the animation in milliseconds
const ANIMATION_DURATION = 300;

/**
 * Custom hook for modal animations
 * @param isOpen Whether the modal is open
 * @returns Animation state and visibility state
 */
export function useModalAnimation(isOpen: boolean) {
  // State to track whether the modal should be in the DOM
  const [isVisible, setIsVisible] = useState(false);

  // Create an observable factory that returns an animation tween
  const animationFactory = (open: boolean, visible: boolean): Observable<number> => {
    // If opening, animate from 1 (bottom) to 0 (top)
    // If closing, animate from 0 (top) to 1 (bottom)

    if (open && visible) return of(0);
    if (!open && !visible) return of(1);

    return open
      ? createTween(modalTween, 1, 0, ANIMATION_DURATION).pipe(
        finalize(() => setIsVisible(true))
      )
      : createTween(modalTween, 0, 1, ANIMATION_DURATION).pipe(
        finalize(() => setIsVisible(false)),
      )
  };

  // Subscribe to the animation observable
  const [translateY] = useObservableFactory(animationFactory, isOpen, isVisible);

  return {
    translateY,
    isVisible: isVisible || isOpen
  };
}

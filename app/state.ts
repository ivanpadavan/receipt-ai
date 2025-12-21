import { apiClient } from "@/app/api-client";
import { actions, createAction, dispatch, ofType, props } from "@ngneat/effects";
import { createStore, emitOnce, withProps } from "@ngneat/elf";
import { catchError, EMPTY, finalize, from, merge, switchMap } from "rxjs";

type PictureState = {
  status: 'idle';
  appendPicture: (imageBase64: string) => void;
} | {
  status: 'picture-in';
  imageBase64: string;
  clear: () => void;
  proceed: () => void;
} | {
  status: 'loading';
  imageBase64: string;
}

interface ErrorState { errorMessage: string, setError: (errorMessage: string) => void }

export interface PageState { picture: PictureState, error: ErrorState, navigateTo: null | string }

const parseReceipt = createAction('parseReceipt', props<{ imageBase64: string }>())

export const pageState$ = () => {
  const proceed = (imageBase64: string) => {
    dispatch(parseReceipt({ imageBase64 }));
    updatePicture({ status: 'loading', imageBase64 });
  }

  const appendPicture = (imageBase64: string) => updatePicture({
    status: 'picture-in',
    imageBase64,
    clear: () => updatePicture(initialPictureState),
    proceed: () => proceed(imageBase64),
  });

  const initialPictureState: PictureState = {
    status: 'idle',
    appendPicture,
  }

  const setError = (errorMessage = '') => store.update((state) => ({ ...state, error: { ...initialErrorState, errorMessage } }));

  const initialErrorState = { errorMessage: '', setError };

  const updatePicture = (picture: PictureState) => store.update((state) => ({ ...state, picture, error: initialErrorState }));


  const store = createStore(
    { name: 'upload-page' },
    withProps<PageState>({
      picture: initialPictureState,
      error: initialErrorState,
      navigateTo: null,
    })
  );

  const parseReceipt$ = actions.pipe(
    ofType(parseReceipt),
    switchMap(({ imageBase64 }) => {
      return from(apiClient.createReceipt(imageBase64)).pipe(
        switchMap((data) => {
          store.update((state) => ({ ...state, navigateTo: `/receipt/${data.id}` }));
          return EMPTY;
        }),
        catchError(err => {
          emitOnce(() => {
            appendPicture(imageBase64);
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
          });
          return EMPTY;
        })
      )
    }),
  )

  return merge(
    store.pipe(finalize(() => store.destroy())),
    parseReceipt$
  );
}

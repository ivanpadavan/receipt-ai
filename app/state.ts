import { apiClient } from "@/app/apiClient";
import { actions, createAction, dispatch, ofType, props } from "@ngneat/effects";
import { createStore, emitOnce, withProps } from "@ngneat/elf";
import { catchError, EMPTY, finalize, from, merge, switchMap } from "rxjs";

type CameraState = {
  status: 'idle';
  start: () => void;
} | {
  status: 'pending';
  initialized: () => void;
} | {
  status: 'ready';
  close: () => void;
  appendPicture: (imageBase64: string) => void;
}

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

type ErrorState = { errorMessage: string, setError: (errorMessage: string) => void };

export type PageState = { camera: CameraState, picture: PictureState, error: ErrorState, navigateTo: null | string };

const parseReceipt = createAction('parseReceipt', props<{ imageBase64: string }>())

export const pageState$ = () => {
  const updateCamera = (camera: CameraState) => store.update((state) => ({ ...state, camera, error: initialErrorState }));

  const initialCamera = () => updateCamera(initialCameraState);

  const start = () => updateCamera({
    status: "pending",
    initialized: ready
  });

  const ready = () => updateCamera({
    status: 'ready',
    close: initialCamera,
    appendPicture: (imageBase64: string) => emitOnce(() => {
      initialCamera();
      proceed(imageBase64);
    }),
  });

  const proceed = (imageBase64: string) => {
    dispatch(parseReceipt({ imageBase64 }));
    updatePicture({ status: 'loading', imageBase64 });
  }

  const initialCameraState: CameraState = {
    status: 'idle',
    start,
  };

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
      camera: initialCameraState,
      picture: initialPictureState,
      error: initialErrorState,
      navigateTo: null,
    })
  );

  const parseReceipt$ = actions.pipe(
    ofType(parseReceipt),
    switchMap(({ imageBase64 }) => {
      return from(apiClient.processReceipt(imageBase64)).pipe(
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

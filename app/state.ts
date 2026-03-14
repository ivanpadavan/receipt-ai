import { apiClient } from "@/app/api-client";
import { t } from "@/app/i18n/translations";
import {
  actions,
  createAction,
  dispatch,
  ofType,
  props,
} from "@ngneat/effects";
import { createStore, emitOnce, withProps } from "@ngneat/elf";
import { catchError, EMPTY, finalize, from, merge, switchMap } from "rxjs";

export interface UploadedReceiptImage {
  originalImageBase64: string;
  croppedImageBase64: string;
  crop: { x: number; y: number };
  zoom: number;
  aspect: number;
}

type PictureState =
  | {
      status: "idle";
      appendPicture: (image: UploadedReceiptImage) => void;
    }
  | {
      status: "picture-in";
      images: UploadedReceiptImage[];
      appendPicture: (image: UploadedReceiptImage) => void;
      removePicture: (index: number) => void;
      updatePicture: (index: number, image: UploadedReceiptImage) => void;
      clear: () => void;
      proceed: () => void;
    }
  | {
      status: "loading";
      images: UploadedReceiptImage[];
    };

interface ErrorState {
  errorMessage: string;
  setError: (errorMessage: string) => void;
}

export interface PageState {
  picture: PictureState;
  error: ErrorState;
  navigateTo: null | string;
}

const parseReceipt = createAction(
  "parseReceipt",
  props<{ images: UploadedReceiptImage[] }>(),
);

export const pageState$ = () => {
  const proceed = (images: UploadedReceiptImage[]) => {
    dispatch(parseReceipt({ images }));
    updatePicture({ status: "loading", images });
  };

  const createPictureInState = (images: UploadedReceiptImage[]): PictureState => ({
      status: "picture-in",
      images,
      appendPicture: (image) => updatePicture(createPictureInState([...images, image])),
      removePicture: (index) => {
        const nextImages = images.filter((_, imageIndex) => imageIndex !== index);
        if (nextImages.length === 0) {
          updatePicture(initialPictureState);
          return;
        }
        updatePicture(createPictureInState(nextImages));
      },
      updatePicture: (index, image) =>
        updatePicture(createPictureInState(
          images.map((currentImage, imageIndex) =>
            imageIndex === index ? image : currentImage,
          ),
        )),
      clear: () => updatePicture(initialPictureState),
      proceed: () => proceed(images),
    });

  const appendPicture = (image: UploadedReceiptImage) =>
    updatePicture(createPictureInState([image]));

  const initialPictureState: PictureState = {
    status: "idle",
    appendPicture,
  };

  const setError = (errorMessage = "") =>
    store.update((state) => ({
      ...state,
      error: { ...initialErrorState, errorMessage },
    }));

  const initialErrorState = { errorMessage: "", setError };

  const updatePicture = (picture: PictureState) =>
    store.update((state) => ({ ...state, picture, error: initialErrorState }));

  const store = createStore(
    { name: "upload-page" },
    withProps<PageState>({
      picture: initialPictureState,
      error: initialErrorState,
      navigateTo: null,
    }),
  );

  const parseReceipt$ = actions.pipe(
    ofType(parseReceipt),
    switchMap(({ images }) => {
      return from(apiClient.createReceipt(images.map((image) => image.croppedImageBase64))).pipe(
        switchMap((data) => {
          store.update((state) => ({
            ...state,
            navigateTo: `/receipt/${data.id}`,
          }));
          return EMPTY;
        }),
        catchError((err) => {
          emitOnce(() => {
            updatePicture(createPictureInState(images));
            setError(
              err instanceof Error
                ? err.message
                : t("genericTryAgain"),
            );
          });
          return EMPTY;
        }),
      );
    }),
  );

  return merge(store.pipe(finalize(() => store.destroy())), parseReceipt$);
};

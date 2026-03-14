import { apiClient } from "@/app/api-client";
import { describe, vi, beforeEach, test, expect } from "vitest";

vi.mock("@/app/apiClient", () => {
  const apiClientMock = {
    createReceipt: vi.fn(),
  } satisfies Pick<typeof apiClient, "createReceipt">;
  return { apiClient: apiClientMock };
});

import { pageState$ } from "../state";
import { firstValueFrom } from "rxjs";
import { take, toArray } from "rxjs/operators";

const testImage = {
  originalImageBase64: "data:image/jpeg;base64,original-1",
  croppedImageBase64: "data:image/jpeg;base64,cropped-1",
  crop: { x: 10, y: 15 },
  zoom: 1.25,
  aspect: 1.4,
};

const secondTestImage = {
  originalImageBase64: "data:image/jpeg;base64,original-2",
  croppedImageBase64: "data:image/jpeg;base64,cropped-2",
  crop: { x: -4, y: 6 },
  zoom: 1.8,
  aspect: 0.9,
};

describe("pageState$", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should initialize with correct default state", async () => {
    // Arrange
    const state$ = pageState$();

    // Act
    const state = await firstValueFrom(state$);

    // Assert
    expect(state).toEqual({
      picture: {
        status: "idle",
        appendPicture: expect.any(Function),
      },
      error: {
        errorMessage: "",
        setError: expect.any(Function),
      },
      navigateTo: null,
    });
  });

  test("should update picture state when appendPicture is called", async () => {
    // Arrange
    const state$ = pageState$();
    const initialState = await firstValueFrom(state$);

    // Act
    "appendPicture" in initialState.picture &&
    initialState.picture.appendPicture(testImage);
    const updatedState = await firstValueFrom(state$);

    // Assert
    expect(updatedState.picture.status).toBe("picture-in");
    "images" in updatedState.picture &&
    expect(updatedState.picture.images).toEqual([testImage]);
    expect(updatedState.picture).toHaveProperty("appendPicture");
    expect(updatedState.picture).toHaveProperty("removePicture");
    expect(updatedState.picture).toHaveProperty("updatePicture");
    expect(updatedState.picture).toHaveProperty("clear");
    expect(updatedState.picture).toHaveProperty("proceed");
  });

  test("should append multiple pictures and process them as an array", async () => {
    // Arrange
    const testReceiptId = "test-receipt-id";
    vi.spyOn(apiClient, "createReceipt").mockResolvedValue({
      id: testReceiptId,
    });

    const state$ = pageState$();
    const states = state$.pipe(take(7), toArray()).toPromise();

    const initialState = await firstValueFrom(state$);

    // Act
    "appendPicture" in initialState.picture &&
    initialState.picture.appendPicture(testImage);
    let pictureInState = await firstValueFrom(state$);
    "appendPicture" in pictureInState.picture &&
    pictureInState.picture.appendPicture(secondTestImage);
    pictureInState = await firstValueFrom(state$);
    "proceed" in pictureInState.picture &&
    pictureInState.picture.proceed();

    // Wait for all state updates to complete
    const allStates = await states;
    if (!allStates?.length) throw new Error('not valid');
    const finalState = allStates[allStates.length - 1];
    // Assert
    expect(apiClient.createReceipt).toHaveBeenCalledWith([
      testImage.croppedImageBase64,
      secondTestImage.croppedImageBase64,
    ]);
    expect(finalState.navigateTo).toBe(`/receipt/${testReceiptId}`);
  });

  test("should handle errors when processing receipt fails", async () => {
    // Arrange
    const errorMessage = "Failed to process receipt";
    vi.spyOn(apiClient, "createReceipt").mockRejectedValue(
      new Error(errorMessage),
    );

    const state$ = pageState$();
    const states = state$.pipe(take(5), toArray()).toPromise();

    const initialState = await firstValueFrom(state$);

    // Act
    "appendPicture" in initialState.picture &&
    initialState.picture.appendPicture(testImage);
    const pictureInState = await firstValueFrom(state$);
    "proceed" in pictureInState.picture &&
    pictureInState.picture.proceed();

    // Wait for all state updates to complete
    const allStates = await states;
    if (!allStates?.length) throw new Error("not valid");
    const finalState = allStates[allStates.length - 1];

    // Assert
    expect(apiClient.createReceipt).toHaveBeenCalledWith([
      testImage.croppedImageBase64,
    ]);
    expect(finalState.error.errorMessage).toBe(errorMessage);
    expect(finalState.picture.status).toBe("picture-in");
  });

  test("should update one picture by index", async () => {
    const state$ = pageState$();
    const initialState = await firstValueFrom(state$);

    "appendPicture" in initialState.picture &&
    initialState.picture.appendPicture(testImage);
    let pictureInState = await firstValueFrom(state$);
    "appendPicture" in pictureInState.picture &&
    pictureInState.picture.appendPicture(secondTestImage);
    pictureInState = await firstValueFrom(state$);

    const replacementImage = {
      ...testImage,
      croppedImageBase64: "data:image/jpeg;base64,re-cropped-1",
      zoom: 2.1,
    };

    "updatePicture" in pictureInState.picture &&
    pictureInState.picture.updatePicture(0, replacementImage);

    const updatedState = await firstValueFrom(state$);

    expect(updatedState.picture.status).toBe("picture-in");
    "images" in updatedState.picture &&
    expect(updatedState.picture.images).toEqual([
      replacementImage,
      secondTestImage,
    ]);
  });

  test("should remove one picture by index and return to idle when last picture is removed", async () => {
    const state$ = pageState$();
    const initialState = await firstValueFrom(state$);

    "appendPicture" in initialState.picture &&
    initialState.picture.appendPicture(testImage);
    let pictureInState = await firstValueFrom(state$);
    "appendPicture" in pictureInState.picture &&
    pictureInState.picture.appendPicture(secondTestImage);
    pictureInState = await firstValueFrom(state$);

    "removePicture" in pictureInState.picture &&
    pictureInState.picture.removePicture(0);
    pictureInState = await firstValueFrom(state$);

    expect(pictureInState.picture.status).toBe("picture-in");
    "images" in pictureInState.picture &&
    expect(pictureInState.picture.images).toEqual([secondTestImage]);

    "removePicture" in pictureInState.picture &&
    pictureInState.picture.removePicture(0);
    const idleState = await firstValueFrom(state$);

    expect(idleState.picture.status).toBe("idle");
  });

  test("should clear picture state when clear is called", async () => {
    // Arrange
    const state$ = pageState$();
    const initialState = await firstValueFrom(state$);

    // Act
    "appendPicture" in initialState.picture &&
    initialState.picture.appendPicture(testImage);
    const pictureInState = await firstValueFrom(state$);
    "clear" in pictureInState.picture &&
    pictureInState.picture.clear();
    const clearedState = await firstValueFrom(state$);

    // Assert
    expect(clearedState.picture.status).toBe("idle");
    expect(clearedState.picture).toHaveProperty("appendPicture");
  });

  test("should set error message when setError is called", async () => {
    // Arrange
    const state$ = pageState$();
    const initialState = await firstValueFrom(state$);
    const errorMessage = "Test error message";

    // Act
    initialState.error.setError(errorMessage);
    const errorState = await firstValueFrom(state$);

    // Assert
    expect(errorState.error.errorMessage).toBe(errorMessage);
  });
});

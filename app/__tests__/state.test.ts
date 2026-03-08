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
    const testImage = "data:image/jpeg;base64,test123";

    // Act
    "appendPicture" in initialState.picture &&
    initialState.picture.appendPicture(testImage);
    const updatedState = await firstValueFrom(state$);

    // Assert
    expect(updatedState.picture.status).toBe("picture-in");
    "imageBase64" in updatedState.picture &&
    expect(updatedState.picture.imageBase64).toBe(testImage);
    expect(updatedState.picture).toHaveProperty("clear");
    expect(updatedState.picture).toHaveProperty("proceed");
  });

  test("should process receipt and update navigateTo when proceed is called", async () => {
    // Arrange
    const testImage = "data:image/jpeg;base64,test123";
    const testReceiptId = "test-receipt-id";
    vi.spyOn(apiClient, "createReceipt").mockResolvedValue({
      id: testReceiptId,
    });

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
    if (!allStates?.length) throw new Error('not valid');
    const finalState = allStates[allStates.length - 1];
    // Assert
    expect(apiClient.createReceipt).toHaveBeenCalledWith(testImage);
    expect(finalState.navigateTo).toBe(`/receipt/${testReceiptId}`);
  });

  test("should handle errors when processing receipt fails", async () => {
    // Arrange
    const testImage = "data:image/jpeg;base64,test123";
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
    expect(apiClient.createReceipt).toHaveBeenCalledWith(testImage);
    expect(finalState.error.errorMessage).toBe(errorMessage);
    expect(finalState.picture.status).toBe("picture-in");
  });

  test("should clear picture state when clear is called", async () => {
    // Arrange
    const state$ = pageState$();
    const initialState = await firstValueFrom(state$);
    const testImage = "data:image/jpeg;base64,test123";

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

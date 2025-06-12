import type { apiClient } from "@/app/apiClient";

const mockApiClient = {
  processReceipt: jest.fn(),
} satisfies Pick<typeof apiClient, 'processReceipt'>;

jest.mock('@/app/apiClient', () => ({ apiClient: mockApiClient }));

import { pageState$ } from '../state';
import { firstValueFrom } from 'rxjs';
import { take, toArray } from 'rxjs/operators';



describe('pageState$', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with correct default state', async () => {
    // Arrange
    const state$ = pageState$();

    // Act
    const state = await firstValueFrom(state$);

    // Assert
    expect(state).toEqual({
      camera: {
        status: 'idle',
        start: expect.any(Function),
      },
      picture: {
        status: 'idle',
        appendPicture: expect.any(Function),
      },
      error: {
        errorMessage: '',
        setError: expect.any(Function),
      },
      navigateTo: null,
    });
  });

  test('should update camera state to pending when start is called', async () => {
    // Arrange
    const state$ = pageState$();
    const initialState = await firstValueFrom(state$);

    // Act
    initialState.camera.start();
    const updatedState = await firstValueFrom(state$);

    // Assert
    expect(updatedState.camera.status).toBe('pending');
    expect(updatedState.camera).toHaveProperty('initialized');
  });

  test('should update camera state to ready when initialized is called', async () => {
    // Arrange
    const state$ = pageState$();
    const initialState = await firstValueFrom(state$);

    // Act
    initialState.camera.start();
    const pendingState = await firstValueFrom(state$);
    pendingState.camera.initialized();
    const readyState = await firstValueFrom(state$);

    // Assert
    expect(readyState.camera.status).toBe('ready');
    expect(readyState.camera).toHaveProperty('close');
    expect(readyState.camera).toHaveProperty('appendPicture');
  });

  test('should update picture state when appendPicture is called', async () => {
    // Arrange
    const state$ = pageState$();
    const initialState = await firstValueFrom(state$);
    const testImage = 'data:image/jpeg;base64,test123';

    // Act
    initialState.picture.appendPicture(testImage);
    const updatedState = await firstValueFrom(state$);

    // Assert
    expect(updatedState.picture.status).toBe('picture-in');
    expect(updatedState.picture.imageBase64).toBe(testImage);
    expect(updatedState.picture).toHaveProperty('clear');
    expect(updatedState.picture).toHaveProperty('proceed');
  });

  test('should process receipt and update navigateTo when proceed is called', async () => {
    // Arrange
    const testImage = 'data:image/jpeg;base64,test123';
    const testReceiptId = 'test-receipt-id';
    mockApiClient.processReceipt.mockResolvedValue({ id: testReceiptId });

    const state$ = pageState$();
    const states = state$.pipe(take(5), toArray()).toPromise();

    const initialState = await firstValueFrom(state$);

    // Act
    initialState.picture.appendPicture(testImage);
    const pictureInState = await firstValueFrom(state$);
    pictureInState.picture.proceed();

    // Wait for all state updates to complete
    const allStates = await states;
    const finalState = allStates[allStates.length - 1];
    // Assert
    expect(mockApiClient.processReceipt).toHaveBeenCalledWith(testImage);
    expect(finalState.navigateTo).toBe(`/receipt/${testReceiptId}`);
  });

  test('should handle errors when processing receipt fails', async () => {
    // Arrange
    const testImage = 'data:image/jpeg;base64,test123';
    const errorMessage = 'Failed to process receipt';
    mockApiClient.processReceipt.mockRejectedValue(new Error(errorMessage));

    const state$ = pageState$();
    const states = state$.pipe(take(5), toArray()).toPromise();

    const initialState = await firstValueFrom(state$);

    // Act
    initialState.picture.appendPicture(testImage);
    const pictureInState = await firstValueFrom(state$);
    pictureInState.picture.proceed();

    // Wait for all state updates to complete
    const allStates = await states;
    const finalState = allStates[allStates.length - 1];

    // Assert
    expect(mockApiClient.processReceipt).toHaveBeenCalledWith(testImage);
    expect(finalState.error.errorMessage).toBe(errorMessage);
    expect(finalState.picture.status).toBe('picture-in');
  });

  test('should clear picture state when clear is called', async () => {
    // Arrange
    const state$ = pageState$();
    const initialState = await firstValueFrom(state$);
    const testImage = 'data:image/jpeg;base64,test123';

    // Act
    initialState.picture.appendPicture(testImage);
    const pictureInState = await firstValueFrom(state$);
    pictureInState.picture.clear();
    const clearedState = await firstValueFrom(state$);

    // Assert
    expect(clearedState.picture.status).toBe('idle');
    expect(clearedState.picture).toHaveProperty('appendPicture');
  });

  test('should reset camera state when close is called', async () => {
    // Arrange
    const state$ = pageState$();
    const initialState = await firstValueFrom(state$);

    // Act
    initialState.camera.start();
    const pendingState = await firstValueFrom(state$);
    pendingState.camera.initialized();
    const readyState = await firstValueFrom(state$);
    readyState.camera.close();
    const closedState = await firstValueFrom(state$);

    // Assert
    expect(closedState.camera.status).toBe('idle');
    expect(closedState.camera).toHaveProperty('start');
  });

  test('should set error message when setError is called', async () => {
    // Arrange
    const state$ = pageState$();
    const initialState = await firstValueFrom(state$);
    const errorMessage = 'Test error message';

    // Act
    initialState.error.setError(errorMessage);
    const errorState = await firstValueFrom(state$);

    // Assert
    expect(errorState.error.errorMessage).toBe(errorMessage);
  });
});

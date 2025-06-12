jest.mock(
  `./utils/imageProcessing.ts`,
  () => ({ processImage: (image) => Promise.resolve(image + ',processed')})
);

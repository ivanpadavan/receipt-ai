import { useEffect } from "react";

export const useTeardown = (cb: () => void) => {
  useEffect(() => cb, []);
};

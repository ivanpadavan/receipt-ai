import "@/app/globals.css";

if (typeof globalThis.process === "undefined") {
  Object.defineProperty(globalThis, "process", {
    value: { env: {} },
    configurable: true,
    writable: true,
  });
}

if (typeof globalThis.global === "undefined") {
  Object.defineProperty(globalThis, "global", {
    value: globalThis,
    configurable: true,
    writable: true,
  });
}

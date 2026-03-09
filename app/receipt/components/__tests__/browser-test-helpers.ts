import { waitFor } from "@testing-library/react";
import { expect } from "vitest";
import type { RenderResult as BrowserRenderResult } from "vitest-browser-react";

export const VIEWPORT_WIDTH = 390;
export const VIEWPORT_HEIGHT = 844;

export function requireElement<T>(value: T | null | undefined, message: string): T {
  if (value == null) {
    throw new Error(message);
  }

  return value;
}

export function isPointerInteractive(element: HTMLElement) {
  return getComputedStyle(element).pointerEvents !== "none";
}

export async function waitForDocumentInteractivity() {
  await waitFor(() => {
    expect(isPointerInteractive(document.body)).toBe(true);
  });
}

function queryBrowserDisplayValue(getActiveBrowserScreen: () => BrowserRenderResult, value: string) {
  const root = getActiveBrowserScreen().baseElement;
  return Array.from(
    root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "input, textarea, select",
    ),
  ).find((element) => element.value === value) ?? null;
}

export function createBrowserScreen(getActiveBrowserScreen: () => BrowserRenderResult) {
  return {
    getByText(text: string | RegExp) {
      return getActiveBrowserScreen().getByText(text).element() as HTMLElement;
    },
    queryByText(text: string | RegExp) {
      return getActiveBrowserScreen().getByText(text).query() as HTMLElement | null;
    },
    getAllByText(text: string | RegExp) {
      return getActiveBrowserScreen()
        .getByText(text)
        .all()
        .map((locator) => locator.element() as HTMLElement);
    },
    async findAllByText(text: string | RegExp) {
      const locator = getActiveBrowserScreen().getByText(text);
      await expect.poll(() => locator.length).toBeGreaterThan(0);
      return locator.all().map((item) => item.element() as HTMLElement);
    },
    getByRole(role: string, options?: Record<string, unknown>) {
      return getActiveBrowserScreen().getByRole(role, options).element() as HTMLElement;
    },
    queryByRole(role: string, options?: Record<string, unknown>) {
      return getActiveBrowserScreen().getByRole(role, options).query() as HTMLElement | null;
    },
    async findByRole(role: string, options?: Record<string, unknown>) {
      const locator = getActiveBrowserScreen().getByRole(role, options);
      await expect.element(locator).toBeInTheDocument();
      return locator.element() as HTMLElement;
    },
    getAllByRole(role: string, options?: Record<string, unknown>) {
      return getActiveBrowserScreen()
        .getByRole(role, options)
        .all()
        .map((locator) => locator.element() as HTMLElement);
    },
    async findAllByRole(role: string, options?: Record<string, unknown>) {
      const locator = getActiveBrowserScreen().getByRole(role, options);
      await expect.poll(() => locator.length).toBeGreaterThan(0);
      return locator.all().map((item) => item.element() as HTMLElement);
    },
    getByDisplayValue(value: string) {
      const element = queryBrowserDisplayValue(getActiveBrowserScreen, value);
      if (!element) throw new Error(`Unable to find display value "${value}"`);
      return element;
    },
    async findByDisplayValue(value: string) {
      await expect.poll(() => queryBrowserDisplayValue(getActiveBrowserScreen, value)).not.toBeNull();
      return requireElement(
        queryBrowserDisplayValue(getActiveBrowserScreen, value),
        `Unable to find display value "${value}"`,
      );
    },
  };
}

import { describe, expect, it, vi, afterEach } from "vitest";
import { firstValueFrom, skip, take, toArray } from "rxjs";
import { z } from "zod";
import { createSseResourceObservable } from "@/app/receipt/components/useSseResource";

class MockEventSource {
  static instances: MockEventSource[] = [];

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;

  constructor(public readonly url: string) {
    MockEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }
}

afterEach(() => {
  MockEventSource.instances = [];
});

describe("createSseResourceObservable", () => {
  it("starts with initial data and emits parsed SSE updates", async () => {
    const schema = z.object({
      value: z.number(),
    });

    const updatesPromise = firstValueFrom(
      createSseResourceObservable({
        initialData: { value: 1 },
        url: "/api/test",
        schema,
        createEventSource: (url) => new MockEventSource(url) as never,
      }).pipe(skip(1), take(1), toArray()),
    );

    const source = MockEventSource.instances[0];
    expect(source?.url).toBe("/api/test");

    source.onmessage?.({
      data: JSON.stringify({ value: 2 }),
    } as MessageEvent<string>);

    await expect(updatesPromise).resolves.toEqual([{ value: 2 }]);
  });

  it("ignores keepalive messages and invalid payloads", async () => {
    const schema = z.object({
      value: z.number(),
    });
    const nextSpy = vi.fn();

    const subscription = createSseResourceObservable({
      initialData: { value: 1 },
      url: "/api/test",
      schema,
      createEventSource: (url) => new MockEventSource(url) as never,
    }).subscribe(nextSpy);

    const source = MockEventSource.instances[0];

    source.onmessage?.({
      data: "connection established",
    } as MessageEvent<string>);
    source.onmessage?.({
      data: JSON.stringify({ value: "bad" }),
    } as MessageEvent<string>);

    expect(nextSpy).toHaveBeenCalledTimes(1);
    expect(nextSpy).toHaveBeenNthCalledWith(1, { value: 1 });

    subscription.unsubscribe();
  });
});

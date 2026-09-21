import { describe, it, expect, vi } from "vitest";
import { broadcaster, type RealtimeEvent } from "./events";

describe("RealtimeBroadcaster", () => {
  it("broadcasts events to subscribers", () => {
    const handler = vi.fn();
    const unsubscribe = broadcaster.subscribe(handler);

    broadcaster.broadcast("call:logged", { leadId: "123", outcome: "SPOKE" });

    expect(handler).toHaveBeenCalledTimes(1);
    const event: RealtimeEvent = handler.mock.calls[0][0];
    expect(event.type).toBe("call:logged");
    expect(event.payload.leadId).toBe("123");
    expect(event.payload.outcome).toBe("SPOKE");
    expect(event.timestamp).toBeDefined();

    unsubscribe();

    broadcaster.broadcast("ping", {});
    expect(handler).toHaveBeenCalledTimes(1); // Not called after unsubscribe
  });
});

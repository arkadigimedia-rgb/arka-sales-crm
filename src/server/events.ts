import { EventEmitter } from "node:events";

export type RealtimeEventType =
  | "lead:updated"
  | "call:logged"
  | "followup:completed"
  | "leads:imported"
  | "ping";

export interface RealtimeEvent {
  type: RealtimeEventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

type EventCallback = (event: RealtimeEvent) => void;

class RealtimeBroadcaster {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(200);
  }

  public broadcast(type: RealtimeEventType, payload: Record<string, unknown> = {}) {
    const event: RealtimeEvent = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
    this.emitter.emit("sales_event", event);
  }

  public subscribe(callback: EventCallback): () => void {
    this.emitter.on("sales_event", callback);
    return () => {
      this.emitter.off("sales_event", callback);
    };
  }
}

// Global singleton across server invocations
const globalForEvents = globalThis as unknown as {
  realtimeBroadcaster?: RealtimeBroadcaster;
};

export const broadcaster =
  globalForEvents.realtimeBroadcaster ?? (globalForEvents.realtimeBroadcaster = new RealtimeBroadcaster());

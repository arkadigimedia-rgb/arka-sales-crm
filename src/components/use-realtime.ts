"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

export interface RealtimeEvent {
  type: "lead:updated" | "call:logged" | "followup:completed" | "leads:imported" | "ping" | "connected";
  payload?: Record<string, unknown>;
  timestamp: string;
}

interface UseRealtimeOptions {
  onEvent?: (event: RealtimeEvent) => void;
  autoRefresh?: boolean;
}

export function useRealtime(options: UseRealtimeOptions = {}) {
  const { onEvent, autoRefresh = true } = options;
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const router = useRouter();
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      try {
        eventSource = new EventSource("/api/realtime");

        eventSource.onopen = () => {
          setConnected(true);
        };

        eventSource.onmessage = (e) => {
          try {
            const data: RealtimeEvent = JSON.parse(e.data);
            setLastEvent(data);

            if (onEventRef.current) {
              onEventRef.current(data);
            }

            // Automatically refresh Server Components when data changes
            if (autoRefresh && data.type !== "connected" && data.type !== "ping") {
              router.refresh();
            }
          } catch {
            // Non-JSON message, e.g. ping
          }
        };

        eventSource.onerror = () => {
          setConnected(false);
          eventSource?.close();
          // Auto reconnect after 5 seconds
          reconnectTimeout = setTimeout(connect, 5000);
        };
      } catch {
        setConnected(false);
        reconnectTimeout = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      eventSource?.close();
    };
  }, [autoRefresh, router]);

  return { connected, lastEvent };
}

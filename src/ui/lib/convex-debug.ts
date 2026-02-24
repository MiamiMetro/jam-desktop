import { create } from "zustand";
import { getFunctionName } from "convex/server";
import type { ConvexReactClient } from "convex/react";

export interface TrackedSubscription {
  id: number;
  functionName: string;
  args: Record<string, unknown> | "skip";
  startTime: number;
}

interface ConvexDebugState {
  subscriptions: Map<number, TrackedSubscription>;
  isOpen: boolean;
  toggle: () => void;
}

export const useConvexDebugStore = create<ConvexDebugState>((set) => ({
  subscriptions: new Map(),
  isOpen: false,
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));

let nextId = 0;

/**
 * Monkey-patches the ConvexReactClient to track active query subscriptions.
 * Only call this in development.
 */
export function instrumentConvexClient(client: ConvexReactClient) {
  const store = useConvexDebugStore;
  const original = client.watchQuery.bind(client) as unknown as (
    query: unknown,
    ...argsAndOptions: unknown[]
  ) => {
    onUpdate: (callback: () => void) => () => void;
  };
  (client as unknown as { watchQuery: typeof original }).watchQuery = (
    query: unknown,
    ...argsAndOptions: unknown[]
  ) => {
    const watch = original(query, ...argsAndOptions);
    const fnName = extractName(query);
    const args = argsAndOptions[0];

    const originalOnUpdate = watch.onUpdate.bind(watch);
    watch.onUpdate = (callback: () => void) => {
      const subId = ++nextId;
      const entry: TrackedSubscription = {
        id: subId,
        functionName: fnName,
        args: args === "skip" ? "skip" : (args as Record<string, unknown>) ?? {},
        startTime: Date.now(),
      };

      store.setState((s) => {
        const next = new Map(s.subscriptions);
        next.set(subId, entry);
        return { subscriptions: next };
      });

      const unsubscribe = originalOnUpdate(callback);
      return () => {
        store.setState((s) => {
          const next = new Map(s.subscriptions);
          next.delete(subId);
          return { subscriptions: next };
        });
        return unsubscribe();
      };
    };

    return watch;
  };
}

function extractName(query: unknown): string {
  try {
    // getFunctionName works on FunctionReference objects
    return getFunctionName(query as never);
  } catch {
    return String(query);
  }
}

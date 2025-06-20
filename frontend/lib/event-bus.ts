export type EventMap = {
  contentCreated: unknown; // replace unknown in specific handlers with proper type
};

export type EventKey = keyof EventMap;
export type Handler<T = unknown> = (payload: T) => void;

class EventBus {
  private listeners: Map<EventKey, Set<Handler>> = new Map();

  on<K extends EventKey>(key: K, handler: Handler<EventMap[K]>): void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(handler as Handler);
  }

  off<K extends EventKey>(key: K, handler: Handler<EventMap[K]>): void {
    const handlers = this.listeners.get(key);
    if (handlers) {
      handlers.delete(handler as Handler);
    }
  }

  emit<K extends EventKey>(key: K, payload: EventMap[K]): void {
    const handlers = this.listeners.get(key);
    if (handlers) {
      handlers.forEach((handler) => handler(payload));
    }
  }
}

export const eventBus = new EventBus();

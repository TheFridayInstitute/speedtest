import { ref, onUnmounted, type Ref } from "vue";

export interface UseSSEReturn {
    isConnected: Ref<boolean>;
    lastEvent: Ref<MessageEvent | null>;
    connect: (url: string) => void;
    onMessage: (type: string, callback: (data: any) => void) => void;
    close: () => void;
}

/**
 * Composable for Server-Sent Events with auto-reconnect.
 */
export function useSSE(): UseSSEReturn {
    const isConnected = ref(false);
    const lastEvent = ref<MessageEvent | null>(null);

    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;
    let currentUrl = "";
    let destroyed = false;

    const listeners = new Map<string, Set<(data: any) => void>>();

    function connect(url: string) {
        currentUrl = url;
        destroyed = false;
        reconnectAttempts = 0;
        createConnection();
    }

    function createConnection() {
        if (destroyed || !currentUrl) return;

        cleanup();

        eventSource = new EventSource(currentUrl);

        eventSource.onopen = () => {
            isConnected.value = true;
            reconnectAttempts = 0;
        };

        eventSource.onerror = () => {
            isConnected.value = false;
            eventSource?.close();
            eventSource = null;

            if (!destroyed) {
                // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
                const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000);
                reconnectAttempts++;
                reconnectTimer = setTimeout(createConnection, delay);
            }
        };

        eventSource.onmessage = (event) => {
            lastEvent.value = event;
            dispatch("message", event.data);
        };

        // Register named event listeners
        for (const type of listeners.keys()) {
            if (type !== "message") {
                eventSource.addEventListener(type, (event) => {
                    lastEvent.value = event as MessageEvent;
                    try {
                        const data = JSON.parse((event as MessageEvent).data);
                        dispatch(type, data);
                    } catch {
                        dispatch(type, (event as MessageEvent).data);
                    }
                });
            }
        }
    }

    function onMessage(type: string, callback: (data: any) => void) {
        if (!listeners.has(type)) {
            listeners.set(type, new Set());
        }
        listeners.get(type)!.add(callback);

        // If already connected, add listener to existing EventSource
        if (eventSource && type !== "message") {
            eventSource.addEventListener(type, (event) => {
                try {
                    const data = JSON.parse((event as MessageEvent).data);
                    callback(data);
                } catch {
                    callback((event as MessageEvent).data);
                }
            });
        }
    }

    function dispatch(type: string, data: any) {
        const cbs = listeners.get(type);
        if (cbs) {
            for (const cb of cbs) {
                try {
                    cb(typeof data === "string" ? JSON.parse(data) : data);
                } catch {
                    cb(data);
                }
            }
        }
    }

    function cleanup() {
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
    }

    function close() {
        destroyed = true;
        isConnected.value = false;
        cleanup();
        listeners.clear();
    }

    onUnmounted(close);

    return {
        isConnected,
        lastEvent,
        connect,
        onMessage,
        close,
    };
}

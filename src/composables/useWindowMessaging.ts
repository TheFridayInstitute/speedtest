import { shallowRef, onMounted, onUnmounted } from "vue";
import type { ShallowRef } from "vue";
import type { WindowMessage } from "@src/types/speedtest";

/** The expected key value for authenticating postMessage events. */
const WINDOW_KEY = "password";

/**
 * Callback type for handling validated incoming window messages.
 * Receives the parsed data payload from the message event.
 */
export type OnMessageCallback = (data: {
    message: string;
    key: string;
    [key: string]: unknown;
}) => void;

/**
 * Composable that manages iframe/window postMessage communication.
 *
 * Sets up a global message listener on mount and tears it down on unmount.
 * Incoming messages are validated against the shared WINDOW_KEY before being
 * forwarded to the provided onMessage callback.
 *
 * @param onMessage - Callback invoked when a validated message is received.
 */
export function useWindowMessaging(onMessage?: OnMessageCallback) {
    /** The most recent validated MessageEvent, used as the reply target for send(). */
    const lastEvent: ShallowRef<MessageEvent | null> = shallowRef(null);

    /**
     * Internal handler for incoming window messages.
     * Validates the key, stores the event for reply targeting,
     * and invokes the onMessage callback if provided.
     */
    function receiveMessage(event: MessageEvent): void {
        const data = event.data;

        if (data?.key !== WINDOW_KEY) {
            console.warn("Window message rejected: invalid key.");
            return;
        }

        lastEvent.value = event;
        console.log(`Received window message: ${data.message}`);

        if (onMessage) {
            onMessage(data);
        }
    }

    /**
     * Send a message back to the source window of the last received event.
     * Rejects if no event has been received yet (i.e., no reply target exists).
     *
     * @param message - The WindowMessage payload to post back to the source.
     */
    async function send(message: WindowMessage): Promise<void> {
        const event = lastEvent.value;

        if (event == null || event.source == null) {
            throw new Error(
                "Cannot send message: no source window available. " +
                    "A message must be received first to establish a reply target.",
            );
        }

        console.log(`Posting window message: ${message.message}`);
        (event.source as Window).postMessage(message, event.origin);
    }

    onMounted(() => {
        window.addEventListener("message", receiveMessage);
    });

    onUnmounted(() => {
        window.removeEventListener("message", receiveMessage);
    });

    return {
        /** The most recent validated MessageEvent from the parent window. */
        lastEvent,
        /** Send a WindowMessage back to the source of the last received event. */
        send,
    };
}

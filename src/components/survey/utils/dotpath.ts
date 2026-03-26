/**
 * Resolve a dot-notation path on an object.
 * e.g., getByPath({ a: { b: 1 } }, "a.b") → 1
 */
export function getByPath(obj: unknown, path: string): unknown {
    if (obj == null || !path) return undefined;
    const keys = path.split(".");
    let current: any = obj;
    for (const key of keys) {
        if (current == null) return undefined;
        current = current[key];
    }
    return current;
}

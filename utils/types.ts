import { isValidDateObj } from "./date";

export function isArray(v: unknown): v is unknown[] | ArrayBufferView {
    return Array.isArray(v) || (ArrayBuffer.isView(v) && !(v instanceof DataView));
}

export function isArrayOfType(
    arr: unknown,
    type: "string" | "number" | "boolean" | "bigint" | "object" | "date" | ((v: unknown) => boolean),
    options: { mode?: "every" | "some" } = {}
): boolean {
    if (!isArray(arr)) return false;
    const list = Array.from(arr as any);
    const mode = options.mode ?? "every";

    const check = (v: unknown) => {
        if (type === "date") {
            return isValidDateObj(v);
        }
        if (type === "object") {
            return isObj(v);
        }
        return typeof v === type;
    };

    if (typeof type === "function") {
        return mode === "every" ? list.every(type) : list.some(type);
    }
    return mode === "every" ? list.every(check) : list.some(check);
}

export function isNonEmptyArray<T = unknown>(arr: unknown): arr is T[] | ArrayBufferView {
    return isArray(arr) && (arr as any).length > 0;
}

export function isNonEmptyArrayObjs<T extends object>(arr: unknown): arr is T[] {
    return isNonEmptyArray(arr) && Array.from(arr as any).every(isObj);
}

export function isNonEmptyObj(v: unknown): v is Record<string, unknown> {
    return isObj(v) && Object.keys(v).length > 0;
}

export function isObj(v: unknown): v is Record<string, unknown> {
    return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function isPlainObj(v: unknown): v is Record<string, unknown> {
    if (!isObj(v)) return false;
    const proto = Object.getPrototypeOf(v);
    return proto === null || proto === Object.prototype;
}

export function isScalar(v: unknown): v is string | number | boolean | bigint | Date | Uint8Array {
    return (
        typeof v === "string" ||
        typeof v === "number" ||
        typeof v === "boolean" ||
        typeof v === "bigint" ||
        isValidDateObj(v) ||
        v instanceof Uint8Array
    );
}

export function isValidBinary(v: unknown): v is Uint8Array | string | unknown[] | ArrayBufferView {
    if (v == null) return false;
    if (v instanceof Uint8Array) return true;
    if (typeof v === "string") return true;
    if (isArray(v)) {
        try {
            new Uint8Array(v as any);
            return true;
        } catch {
            return false;
        }
    }
    return false;
}

export function toValidBinary(v: unknown): Uint8Array | null {
    if (!isValidBinary(v)) return null;
    if (v instanceof Uint8Array) return v;
    if (typeof v === "string") {
        return new TextEncoder().encode(v);
    }
    return new Uint8Array(v as any);
}



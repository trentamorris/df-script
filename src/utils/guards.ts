import { isValidDateObj } from "./date";
import { isValidInt } from "./number";

export function isTypedArray(v: unknown): v is ArrayBufferView {
    return ArrayBuffer.isView(v) && !(v instanceof DataView);
}

export function isArrayOrTypedArray(v: unknown): v is ArrayLike<any> & Iterable<any> {
    return Array.isArray(v) || isTypedArray(v);
}

export function isNonEmptyArray<T = unknown>(arr: unknown): arr is ArrayLike<T> {
    return isArrayOrTypedArray(arr) && arr.length > 0;
}

export function isNonEmptyArrayObjs<T extends object>(arr: unknown): arr is T[] {
    if (!isNonEmptyArray(arr)) return false;
    const len = (arr as any).length;
    for (let i = 0; i < len; i++) {
        if (!isObj((arr as any)[i])) return false;
    }
    return true;
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

export function isValidBinary(v: unknown): v is Uint8Array | string | ArrayLike<any> {
    if (v == null) return false;
    if (v instanceof Uint8Array) return true;
    if (typeof v === "string") return true;
    if (Array.isArray(v)) {
        const len = v.length;
        for (let i = 0; i < len; i++) {
            if (!isValidInt(v[i], { min: -128, max: 255 })) {
                return false;
            }
        }
        return true;
    }
    if (isTypedArray(v)) {
        return true;
    }
    return false;
}

export function toValidBinary(v: unknown): Uint8Array | null {
    if (!isValidBinary(v)) return null;
    if (v instanceof Uint8Array) return v;
    if (typeof v === "string") {
        return new TextEncoder().encode(v);
    }
    if (ArrayBuffer.isView(v)) {
        return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
    }
    return new Uint8Array(v as any);
}

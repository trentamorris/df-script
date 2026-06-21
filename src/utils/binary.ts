import { isTypedArray } from "./array";
import type { AnyTypedArray } from "../types";

export function isValidBinary(v: unknown): v is string | any[] | AnyTypedArray {
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return true;
    if (isTypedArray(v)) return true;
    return Array.isArray(v);
}

export function toValidBinary(v: unknown): Uint8Array | null {
    if (!isValidBinary(v)) return null;
    if (Object.prototype.toString.call(v) === "[object Uint8Array]") {
        return v as Uint8Array;
    }
    if (typeof v === "string") {
        return new TextEncoder().encode(v);
    }
    if (isTypedArray(v)) {
        return new Uint8Array(v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength));
    }
    return new Uint8Array(v as any);
}

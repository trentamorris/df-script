/** @internalfile */
import {
    isObj,
    isDetachedBuffer,
    isArrayBuffer,
    isSharedArrayBuffer,
    isDataView,
    isUint8Array,
    isUint8ClampedArray,
} from "./object";
import { isValidInt } from "./number";
import { isArrayOfType } from "./array";
import type { AnyTypedArray } from "../types";
import type { BinaryValidationOptions, IntOptions } from "./types";
import { TEXT_ENCODER } from "../constants";

export function isBinaryObj(
    v: unknown
): v is Uint8Array | Uint8ClampedArray | ArrayBuffer | SharedArrayBuffer | DataView {
    if (!isObj(v) || isDetachedBuffer(v)) return false;
    if (ArrayBuffer.isView(v)) {
        return isUint8Array(v) || isUint8ClampedArray(v) || isDataView(v);
    }
    return isArrayBuffer(v) || isSharedArrayBuffer(v);
}

const UINT8_INT_OPTS: IntOptions = { range: "UInt8" };
const _isUInt8 = (n: unknown): n is number => isValidInt(n, UINT8_INT_OPTS);

export function isValidBinary(
    v: unknown,
    options?: BinaryValidationOptions
): v is Uint8Array | Uint8ClampedArray | ArrayBuffer | SharedArrayBuffer | DataView | string | number[] | AnyTypedArray {
    if (v == null) return false;
    try {
        if (isBinaryObj(v)) return true;
        if (options?.strict) return false;
        if (typeof v === "string") return true;
        if (ArrayBuffer.isView(v)) return !isDetachedBuffer(v);
        if (Array.isArray(v)) return isArrayOfType(v, _isUInt8);
    } catch {
        return false;
    }
    return false;
}

export function toValidBinary(v: unknown, options?: BinaryValidationOptions): Uint8Array | null {
    if (v == null) return null;
    try {
        if (isUint8Array(v)) return v;
        if (isDetachedBuffer(v)) return null;

        if (ArrayBuffer.isView(v)) {
            return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
        }
        if (isArrayBuffer(v) || isSharedArrayBuffer(v)) {
            return new Uint8Array(v);
        }
        if (options?.strict) return null;
        if (typeof v === "string") {
            return TEXT_ENCODER.encode(v);
        }
        if (Array.isArray(v) && isArrayOfType(v, _isUInt8)) {
            return Uint8Array.from(v);
        }
    } catch {
        return null;
    }
    return null;
}


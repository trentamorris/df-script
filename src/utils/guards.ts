import type { ValidScalarTypes } from "../types";
import { isValidDateObj } from "./date";

/** Array Guards **/
export type AnyTypedArray = ArrayBufferView & ArrayLike<number | bigint> & Iterable<number | bigint>;
const typedArrayTagGetter = (() => {
    try {
        const sample = new Uint8Array(0);
        const proto = Object.getPrototypeOf(sample);
        const superProto = Object.getPrototypeOf(proto);
        const getter = Object.getOwnPropertyDescriptor(superProto, Symbol.toStringTag)?.get;
        if (getter && getter.call(sample) === "Uint8Array") return getter;
        return undefined;
    } catch {
        return undefined;
    }
})();
export function isTypedArray(v: unknown): v is AnyTypedArray {
    if (!ArrayBuffer.isView(v)) return false;
    if (typedArrayTagGetter) return typedArrayTagGetter.call(v) !== undefined;
    const tag = Object.prototype.toString.call(v);
    return tag !== "[object DataView]" && tag.endsWith("Array]");
}
export function isArrayOrTypedArray(v: unknown): v is any[] | AnyTypedArray {
    return Array.isArray(v) || isTypedArray(v);
}

/** Object Guards **/
const dateValueOf = Object.getOwnPropertyDescriptor(Date.prototype, "valueOf")?.value;
const regExpSource = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(/./), "source")?.get;
export function isObj(v: unknown): v is Record<PropertyKey, unknown> {
    if (v === null || typeof v !== "object" || Array.isArray(v)) {
        return false;
    }
    const tag = Object.prototype.toString.call(v);
    if (tag === "[object Date]") {
        if (!dateValueOf) return false;
        try {
            dateValueOf.call(v);
            return false;
        } catch {
            return true;
        }
    }
    if (tag === "[object RegExp]") {
        if (!regExpSource) return false;
        try {
            regExpSource.call(v);
            return false;
        } catch {
            return true;
        }
    }
    return true;
}
export function isPlainObj(v: unknown): v is Record<PropertyKey, unknown> {
    if (!isObj(v)) return false;

    const proto = Object.getPrototypeOf(v);
    if (proto === null) return true;

    const ctor = Object.prototype.hasOwnProperty.call(proto, "constructor") && proto.constructor;
    if (typeof ctor !== "function") return false;
    if (ctor.prototype !== proto) return false;
    if (!(ctor instanceof ctor)) return false;

    return Object.getPrototypeOf(proto) === null;
}

/** Class Guards **/
export function isClass(v: unknown): v is new (...args: any[]) => any {
    if (typeof v !== "function") return false;

    let fnStr = "";
    try { fnStr = Function.prototype.toString.call(v) } catch { return false }

    if (/^class[\s{]/.test(fnStr)) return true;
    if (v === Symbol || v === BigInt) return false;

    const desc = Object.getOwnPropertyDescriptor(v, "prototype");
    if (desc && !desc.writable) return fnStr.includes("[native code]");

    return false;
}

/** Scalar & Conversion Guards **/
export function isScalar<V>(v: V): v is Extract<V, Exclude<ValidScalarTypes, null | undefined>> {
    if (v === null || v === undefined) return false;

    switch (typeof v) {
        case "string":
        case "boolean":
        case "bigint":
            return true;
        case "number":
            return !Number.isNaN(v);
        case "object": {
            const tag = Object.prototype.toString.call(v);
            switch (tag) {
                case "[object String]":
                case "[object Boolean]":
                    return true;
                case "[object Number]":
                    return !Number.isNaN(Number(v));
                case "[object Date]":
                    return isValidDateObj(v);
                case "[object Uint8Array]":
                    return ArrayBuffer.isView(v);
                default:
                    return false;
            }
        }
        default:
            return false;
    }
}

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



/** @internalfile */
import { DANGEROUS_OBJ_PROPERTIES } from "../constants";
const _TAG_DATE = "[object Date]";
const _TAG_REGEXP = "[object RegExp]";
const _TAG_SET = "[object Set]";
const _TAG_MAP = "[object Map]";
const _TAG_ERROR = "[object Error]";
const _TAG_URL_PARAMS = "[object URLSearchParams]";
const _TAG_STRING = "[object String]";
const _TAG_NUMBER = "[object Number]";
const _TAG_BOOLEAN = "[object Boolean]";
const _TAG_BIGINT = "[object BigInt]";
const _TAG_SYMBOL = "[object Symbol]";
const _TAG_UINT8ARRAY = "[object Uint8Array]";
const _TAG_UINT8CLAMPEDARRAY = "[object Uint8ClampedArray]";
const _TAG_ARRAYBUFFER = "[object ArrayBuffer]";
const _TAG_SHAREDARRAYBUFFER = "[object SharedArrayBuffer]";
const _TAG_DATAVIEW = "[object DataView]";
const _TAG_OBJECT = "[object Object]";

const _dateProto = typeof Date === "function" ? Date.prototype : undefined;
const _regExpProto = typeof RegExp === "function" ? RegExp.prototype : undefined;
const _setProto = typeof Set === "function" ? Set.prototype : undefined;
const _mapProto = typeof Map === "function" ? Map.prototype : undefined;
const _urlParamsProto = typeof URLSearchParams === "function" ? URLSearchParams.prototype : undefined;

const _stringProto = typeof String === "function" ? String.prototype : undefined;
const _numberProto = typeof Number === "function" ? Number.prototype : undefined;
const _booleanProto = typeof Boolean === "function" ? Boolean.prototype : undefined;
const _bigIntProto = typeof BigInt === "function" ? BigInt.prototype : undefined;
const _symbolProto = typeof Symbol === "function" ? Symbol.prototype : undefined;

const _regExpSource = _regExpProto ? Object.getOwnPropertyDescriptor(_regExpProto, "source")?.get : undefined;
const _setSize = _setProto ? Object.getOwnPropertyDescriptor(_setProto, "size")?.get : undefined;
const _mapSize = _mapProto ? Object.getOwnPropertyDescriptor(_mapProto, "size")?.get : undefined;

const _arrayBufferProto = typeof ArrayBuffer === "function" ? ArrayBuffer.prototype : undefined;
const _sharedArrayBufferProto = typeof SharedArrayBuffer === "function" ? SharedArrayBuffer.prototype : undefined;
const _dataViewProto = typeof DataView === "function" ? DataView.prototype : undefined;

export const typedArrayTagGetter = typeof Uint8Array === "function"
    ? Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), Symbol.toStringTag)?.get
    : undefined;
const _arrayBufferByteLength = _arrayBufferProto
    ? Object.getOwnPropertyDescriptor(_arrayBufferProto, "byteLength")?.get
    : undefined;
const _arrayBufferSlice = _arrayBufferProto?.slice;
const _sharedArrayBufferByteLength = _sharedArrayBufferProto
    ? Object.getOwnPropertyDescriptor(_sharedArrayBufferProto, "byteLength")?.get
    : undefined;

const _dataViewByteLength = _dataViewProto
    ? Object.getOwnPropertyDescriptor(_dataViewProto, "byteLength")?.get
    : undefined;

const _dateValueOf = _dateProto?.valueOf;
const _urlSearchParamsHas = _urlParamsProto?.has;
const _stringValueOf = _stringProto?.valueOf;
const _numberValueOf = _numberProto?.valueOf;
const _booleanValueOf = _booleanProto?.valueOf;
const _bigIntValueOf = _bigIntProto?.valueOf;
const _symbolValueOf = _symbolProto?.valueOf;
const _objectCtorString = Function.prototype.toString.call(Object);

export function isObj(v: unknown): v is Record<PropertyKey, unknown> {
    return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function isSafeObjPropertyKey(key: unknown): key is string {
    return typeof key === "string" && !DANGEROUS_OBJ_PROPERTIES.includes(key as any);
}

export function isPlainObj(v: unknown): v is Record<PropertyKey, unknown> {
    if (!isObj(v)) return false;

    try {
        // Exclude [object Arguments] and exotic objects whose prototype chain specifies a tag
        if (
            !Object.prototype.hasOwnProperty.call(v, Symbol.toStringTag) &&
            Object.prototype.toString.call(v) !== _TAG_OBJECT
        ) {
            return false;
        }

        const proto = Object.getPrototypeOf(v);
        if (proto === null) return true;
        if (Object.getPrototypeOf(proto) !== null) return false;

        // Cross-realm safe: verify proto is a true Object.prototype
        if (!Object.prototype.hasOwnProperty.call(proto, "isPrototypeOf")) return false;

        const desc = Object.getOwnPropertyDescriptor(proto, "toString");
        if (!desc || typeof desc.value !== "function") return false;

        const ctor = Object.prototype.hasOwnProperty.call(proto, "constructor") && proto.constructor;
        if (typeof ctor !== "function") return false;

        return Function.prototype.toString.call(ctor) === _objectCtorString;
    } catch {
        return false;
    }
}

const _dummyProxyTarget = function () { };
const _dummyProxy = new Proxy(_dummyProxyTarget, { construct() { return this; } });
const _dummyArrayBuffer = typeof ArrayBuffer === "function" ? new ArrayBuffer(0) : undefined;
const _dummyConstructProbes: readonly any[][] = [
    [],
    [_dummyProxyTarget],
    [_dummyArrayBuffer],
    [{}]
];

export function isClass(v: unknown): v is new (...args: any[]) => any {
    if (typeof v !== "function") return false;

    try {
        const fnStr = Function.prototype.toString.call(v);

        // 1. ES6 class syntax (strips leading comments/whitespace, handles dotted & parameterized decorators)
        const s = fnStr.replace(/^(?:\s+|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*)+/, "");
        if (/^(?:@[\w$.]+(?:\([^)]*\))?\s+)*class\b/.test(s)) return true;

        // 2. Native constructible classes (Map, Set, Date, Promise, TypedArrays, DataView, WeakRef, etc.)
        // Non-constructible native builtins (Symbol, BigInt) throw on Reflect.construct and safely return false
        const desc = Object.getOwnPropertyDescriptor(v, "prototype");
        if (desc && !desc.writable && fnStr.includes("[native code]")) {
            const len = _dummyConstructProbes.length;
            for (let i = 0; i < len; i++) {
                try {
                    Reflect.construct(v as Function, _dummyConstructProbes[i], _dummyProxy);
                    return true;
                } catch { }
            }
        }
    } catch {
        return false;
    }

    return false;
}

function _checkNativeSlot(
    v: unknown,
    tag: string,
    getterOrMethod: Function | undefined,
    expectedReturn?: any
): boolean {
    if (!isObj(v)) return false;

    if (getterOrMethod) {
        try {
            const res = getterOrMethod.call(v);
            return expectedReturn !== undefined ? res === expectedReturn : true;
        } catch {
            return false;
        }
    }

    try {
        if (Object.prototype.hasOwnProperty.call(v, Symbol.toStringTag)) return false;
        return Object.prototype.toString.call(v) === tag;
    } catch {
        return false;
    }
}

export function isValidDateObj(v: unknown): v is Date {
    if (!isObj(v)) return false;
    if (_dateValueOf) {
        try { return !Number.isNaN(_dateValueOf.call(v)); } catch { return false; }
    }
    try {
        if (Object.prototype.hasOwnProperty.call(v, Symbol.toStringTag)) return false;
        return Object.prototype.toString.call(v) === _TAG_DATE && !Number.isNaN((v as any).getTime());
    } catch {
        return false;
    }
}

export function isRegExp(v: unknown): v is RegExp {
    return _checkNativeSlot(v, _TAG_REGEXP, _regExpSource);
}

export function isSet(v: unknown): v is Set<unknown> {
    return _checkNativeSlot(v, _TAG_SET, _setSize);
}

export function isMap(v: unknown): v is Map<unknown, unknown> {
    return _checkNativeSlot(v, _TAG_MAP, _mapSize);
}

export function isURLSearchParams(v: unknown): v is URLSearchParams {
    if (!isObj(v)) return false;
    if (_urlSearchParamsHas) {
        try {
            _urlSearchParamsHas.call(v, "key");
            return true;
        } catch {
            return false;
        }
    }
    return _checkNativeSlot(v, _TAG_URL_PARAMS, undefined);
}

export function isError(v: unknown): v is Error {
    if (!isObj(v)) return false;

    try {
        if (v instanceof Error) return true;

        let p: any = v;
        while (p !== null) {
            if (!Object.prototype.hasOwnProperty.call(p, Symbol.toStringTag)) {
                if (Object.prototype.toString.call(p) === _TAG_ERROR) return true;
            }
            p = Object.getPrototypeOf(p);
        }
    } catch {
        return false;
    }

    return false;
}

export function isStringObj(v: unknown): v is String {
    return _checkNativeSlot(v, _TAG_STRING, _stringValueOf);
}

export function isNumberObj(v: unknown): v is Number {
    return _checkNativeSlot(v, _TAG_NUMBER, _numberValueOf);
}

export function isBooleanObj(v: unknown): v is Boolean {
    return _checkNativeSlot(v, _TAG_BOOLEAN, _booleanValueOf);
}

export function isBigIntObj(v: unknown): v is Object {
    return _checkNativeSlot(v, _TAG_BIGINT, _bigIntValueOf);
}

export function isSymbolObj(v: unknown): v is Object {
    return _checkNativeSlot(v, _TAG_SYMBOL, _symbolValueOf);
}

export function isDetachedBuffer(v: unknown): boolean {
    if (!isObj(v)) return false;

    try {
        const buf = ArrayBuffer.isView(v) ? v.buffer : v;

        if (isSharedArrayBuffer(buf)) return false;
        if (!isArrayBuffer(buf)) return false;

        if ("detached" in buf && (buf as any).detached !== undefined) {
            return (buf as any).detached === true;
        }

        _arrayBufferSlice?.call(buf, 0, 0);
        return false;
    } catch {
        return true;
    }
}

export function isArrayBuffer(v: unknown): v is ArrayBuffer {
    return _checkNativeSlot(v, _TAG_ARRAYBUFFER, _arrayBufferByteLength);
}

export function isSharedArrayBuffer(v: unknown): v is SharedArrayBuffer {
    return _checkNativeSlot(v, _TAG_SHAREDARRAYBUFFER, _sharedArrayBufferByteLength);
}

export function isDataView(v: unknown): v is DataView {
    return _checkNativeSlot(v, _TAG_DATAVIEW, _dataViewByteLength);
}

export function isUint8Array(v: unknown): v is Uint8Array {
    return _checkNativeSlot(v, _TAG_UINT8ARRAY, typedArrayTagGetter, "Uint8Array");
}

export function isUint8ClampedArray(v: unknown): v is Uint8ClampedArray {
    return _checkNativeSlot(v, _TAG_UINT8CLAMPEDARRAY, typedArrayTagGetter, "Uint8ClampedArray");
}

const _PRIMITIVE_VALUE_OFS = [_numberValueOf, _stringValueOf, _booleanValueOf, _bigIntValueOf, _symbolValueOf];

export function unboxPrimitiveObj(v: unknown): unknown {
    if (!isObj(v)) return v;

    const len = _PRIMITIVE_VALUE_OFS.length;
    for (let i = 0; i < len; i++) {
        const fn = _PRIMITIVE_VALUE_OFS[i];
        if (fn) {
            try { return fn.call(v); } catch { }
        }
    }

    return v;
}
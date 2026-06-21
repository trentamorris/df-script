export const TAG_DATE = "[object Date]";
export const TAG_REGEXP = "[object RegExp]";
export const TAG_SET = "[object Set]";
export const TAG_MAP = "[object Map]";
export const TAG_ERROR = "[object Error]";
export const TAG_URL_PARAMS = "[object URLSearchParams]";
export const TAG_STRING = "[object String]";
export const TAG_NUMBER = "[object Number]";
export const TAG_BOOLEAN = "[object Boolean]";
export const TAG_BIGINT = "[object BigInt]";
export const TAG_SYMBOL = "[object Symbol]";

const dateProto = typeof Date === "function" ? Date.prototype : undefined;
const regExpProto = Object.getPrototypeOf(/./);
const setProto = typeof Set === "function" ? Set.prototype : undefined;
const mapProto = typeof Map === "function" ? Map.prototype : undefined;
const urlParamsProto = typeof URLSearchParams === "function" ? URLSearchParams.prototype : undefined;

const stringProto = Object.getPrototypeOf("");
const numberProto = Object.getPrototypeOf(0);
const booleanProto = Object.getPrototypeOf(true);
const bigIntProto = typeof BigInt === "function" ? BigInt.prototype : undefined;
const symbolProto = typeof Symbol === "function" ? Symbol.prototype : undefined;

const regExpSource = Object.getOwnPropertyDescriptor(regExpProto, "source")?.get;
const setSize = setProto ? Object.getOwnPropertyDescriptor(setProto, "size")?.get : undefined;
const mapSize = mapProto ? Object.getOwnPropertyDescriptor(mapProto, "size")?.get : undefined;

const dateValueOf = dateProto?.valueOf;
const urlSearchParamsHas = urlParamsProto?.has;
const stringValueOf = stringProto.valueOf;
const numberValueOf = numberProto.valueOf;
const booleanValueOf = booleanProto.valueOf;
const bigIntValueOf = bigIntProto?.valueOf;
const symbolValueOf = symbolProto?.valueOf;
const objectCtorString = Function.prototype.toString.call(Object);

export function isObj(v: unknown): v is Record<PropertyKey, unknown> {
    return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function isPlainObj(v: unknown): v is Record<PropertyKey, unknown> {
    if (!isObj(v)) return false;

    const proto = Object.getPrototypeOf(v);
    if (proto === null) return true;

    const ctor = Object.prototype.hasOwnProperty.call(proto, "constructor") && proto.constructor;
    if (typeof ctor !== "function") return false;

    return Function.prototype.toString.call(ctor) === objectCtorString;
}

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

function _checkNativeSlot(
    v: unknown,
    tag: string,
    getterOrMethod: Function | undefined,
    arg?: any
): boolean {
    if (!isObj(v)) return false;
    if (!(Symbol.toStringTag in v)) {
        return Object.prototype.toString.call(v) === tag;
    }
    if (!getterOrMethod) return false;
    try {
        getterOrMethod.call(v, arg);
        return true;
    } catch {
        return false;
    }
}

export function isValidDateObj(v: unknown): v is Date {
    if (!_checkNativeSlot(v, TAG_DATE, dateValueOf)) return false;
    return dateValueOf ? !Number.isNaN(dateValueOf.call(v)) : false;
}

export function isRegExp(v: unknown): v is RegExp {
    return _checkNativeSlot(v, TAG_REGEXP, regExpSource);
}

export function isSet(v: unknown): v is Set<unknown> {
    return _checkNativeSlot(v, TAG_SET, setSize);
}

export function isMap(v: unknown): v is Map<unknown, unknown> {
    return _checkNativeSlot(v, TAG_MAP, mapSize);
}

export function isURLSearchParams(v: unknown): v is URLSearchParams {
    return _checkNativeSlot(v, TAG_URL_PARAMS, urlSearchParamsHas, "key");
}

export function isError(v: unknown): v is Error {
    if (!isObj(v)) return false;
    if (!(Symbol.toStringTag in v)) {
        return Object.prototype.toString.call(v) === TAG_ERROR;
    }
    return v instanceof Error;
}

export function isStringObj(v: unknown): v is String {
    return _checkNativeSlot(v, TAG_STRING, stringValueOf);
}

export function isNumberObj(v: unknown): v is Number {
    return _checkNativeSlot(v, TAG_NUMBER, numberValueOf);
}

export function isBooleanObj(v: unknown): v is Boolean {
    return _checkNativeSlot(v, TAG_BOOLEAN, booleanValueOf);
}

export function isBigIntObj(v: unknown): v is Object {
    return _checkNativeSlot(v, TAG_BIGINT, bigIntValueOf);
}

export function isSymbolObj(v: unknown): v is Object {
    return _checkNativeSlot(v, TAG_SYMBOL, symbolValueOf);
}

export function unboxPrimitiveObj(v: unknown): unknown {
    if (!isObj(v)) return v;

    const tag = Object.prototype.toString.call(v);

    switch (tag) {
        case TAG_NUMBER:
            if (isNumberObj(v)) {
                try { return numberValueOf.call(v); } catch {}
            }
            break;
        case TAG_STRING:
            if (isStringObj(v)) {
                try { return stringValueOf.call(v); } catch {}
            }
            break;
        case TAG_BOOLEAN:
            if (isBooleanObj(v)) {
                try { return booleanValueOf.call(v); } catch {}
            }
            break;
        case TAG_BIGINT:
            if (isBigIntObj(v) && bigIntValueOf) {
                try { return bigIntValueOf.call(v); } catch {}
            }
            break;
        case TAG_SYMBOL:
            if (isSymbolObj(v) && symbolValueOf) {
                try { return symbolValueOf.call(v); } catch {}
            }
            break;
    }

    if (Symbol.toStringTag in v) {
        if (isNumberObj(v)) { try { return numberValueOf.call(v); } catch {} }
        else if (isStringObj(v)) { try { return stringValueOf.call(v); } catch {} }
        else if (isBooleanObj(v)) { try { return booleanValueOf.call(v); } catch {} }
        else if (isBigIntObj(v) && bigIntValueOf) { try { return bigIntValueOf.call(v); } catch {} }
        else if (isSymbolObj(v) && symbolValueOf) { try { return symbolValueOf.call(v); } catch {} }
    }

    if (typeof v.valueOf === "function" && v.valueOf !== Object.prototype.valueOf) {
        try {
            const primitive = v.valueOf();
            if (typeof primitive !== "object" || primitive === null) {
                return primitive;
            }
        } catch {}
    }

    return v;
}
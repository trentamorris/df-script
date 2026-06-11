export abstract class DataType<T = any> {
    abstract readonly name: string;
    abstract coerce(val: unknown): T;
    abstract equals(other: DataType): boolean;
    abstract allocate(size: number): ArrayLike<T>;

    matches(selector: any): boolean {
        if (selector == null) return false;
        if (selector instanceof DataType) {
            if (this.equals(selector)) return true;
            if (this.name.startsWith("Decimal") && selector.name.startsWith("Decimal")) {
                if ((selector as any).precision === undefined && (selector as any).scale === undefined) {
                    return true;
                }
            }
            return false;
        }
        if (typeof selector === "function") {
            if (selector.prototype instanceof DataType) {
                return this instanceof selector;
            }
            try {
                const dummy = selector();
                if (dummy instanceof DataType) {
                    return this.constructor === dummy.constructor;
                }
            } catch {
                // Ignore errors
            }
        }
        return false;
    }

    get isNumeric(): boolean { return false; }
    get isInteger(): boolean { return false; }
    get isFloat(): boolean { return false; }
    get isSigned(): boolean { return false; }
    get isUnsigned(): boolean { return false; }
    get isTemporal(): boolean { return false; }
    get isNested(): boolean { return false; }
    get isBoolean(): boolean { return false; }
    get isString(): boolean { return false; }
    get isUtf8(): boolean { return false; }
    get isObject(): boolean { return false; }
    get isNull(): boolean { return false; }
    get isBinary(): boolean { return false; }
}

export abstract class NumericDataType<T = number | null> extends DataType<T> {
    override get isNumeric(): boolean { return true; }
}

export abstract class IntegerDataType<T = number | null> extends NumericDataType<T> {
    override get isInteger(): boolean { return true; }
}

export abstract class SignedIntegerType<T = number | null> extends IntegerDataType<T> {
    override get isSigned(): boolean { return true; }
}

export abstract class UnsignedIntegerType<T = number | null> extends IntegerDataType<T> {
    override get isUnsigned(): boolean { return true; }
}

export abstract class FloatDataType<T = number | null> extends NumericDataType<T> {
    override get isFloat(): boolean { return true; }
}

export abstract class TemporalDataType<T = any> extends DataType<T> {
    override get isTemporal(): boolean { return true; }
}

export abstract class NestedDataType<T = any> extends DataType<T> {
    override get isNested(): boolean { return true; }
}

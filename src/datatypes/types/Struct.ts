import { NestedDataType, DataType } from "../DataType";
import { isObj } from "../../utils";

export class StructType<TFields extends Record<string, any> = any> extends NestedDataType<TFields | null> {
    readonly name = "Struct";
    
    constructor(public readonly fields: { [K in keyof TFields]: DataType<TFields[K]> }) {
        super();
    }
    
    coerce(val: any): TFields | null {
        if (!isObj(val)) return null;
        const res: any = {};
        for (const [k, type] of Object.entries(this.fields)) {
            res[k] = type.coerce(val[k]);
        }
        return res;
    }
    
    equals(other: DataType): boolean {
        if (!(other instanceof StructType)) return false;
        const keysThis = Object.keys(this.fields);
        const keysOther = Object.keys(other.fields);
        if (keysThis.length !== keysOther.length) return false;
        for (const k of keysThis) {
            if (!other.fields[k] || !this.fields[k].equals(other.fields[k])) return false;
        }
        return true;
    }

    allocate(size: number): (TFields | null)[] { return new Array(size).fill(null); }
}

export const Struct = <TFields extends Record<string, any>>(fields: { [K in keyof TFields]: DataType<TFields[K]> }) => new StructType<TFields>(fields);

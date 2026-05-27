import { NestedDataType, DataType } from "../DataType";
import { isObj } from "../../utils";

export class StructType extends NestedDataType {
    readonly name = "Struct";
    
    constructor(public readonly fields: Record<string, DataType>) {
        super();
    }
    
    coerce(val: any): Record<string, any> | null {
        if (!isObj(val)) return null;
        const res: Record<string, any> = {};
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
}

export const Struct = (fields: Record<string, DataType>) => new StructType(fields);

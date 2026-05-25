import { DataType } from "./DataType";

export class Int32Type extends DataType {
    readonly name = "Int32";
    
    coerce(val: any): number | null {
        if (val == null) return null;
        const num = Number(val);
        return isNaN(num) ? null : Math.trunc(num);
    }
    
    equals(other: DataType): boolean {
        return other.name === "Int32";
    }
}

export const Int32 = new Int32Type();

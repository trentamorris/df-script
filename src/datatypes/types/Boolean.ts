import { DataType } from "../DataType";

export class BooleanType extends DataType {
    readonly name = "Boolean";

    override get isBoolean(): boolean { return true; }
    
    coerce(val: any): boolean | null {
        if (val == null) return null;
        return !!val;
    }
    
    equals(other: DataType): boolean {
        return other.name === "Boolean";
    }
    allocate(size: number): (boolean | null)[] { return new Array(size).fill(null); }

}

export const Boolean = new BooleanType();

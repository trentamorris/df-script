import { DataType } from "./DataType";

export class BooleanType extends DataType {
    readonly name = "Boolean";
    
    coerce(val: any): boolean | null {
        if (val == null) return null;
        return !!val;
    }
    
    equals(other: DataType): boolean {
        return other.name === "Boolean";
    }
}

export const Boolean = new BooleanType();

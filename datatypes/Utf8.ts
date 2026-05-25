import { DataType } from "./DataType";

export class Utf8Type extends DataType {
    readonly name = "Utf8";
    
    coerce(val: any): string | null {
        if (val == null) return null;
        return String(val);
    }
    
    equals(other: DataType): boolean {
        return other.name === "Utf8";
    }
}

export const Utf8 = new Utf8Type();

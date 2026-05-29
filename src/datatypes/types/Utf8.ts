import { DataType } from "../DataType";

export class Utf8Type extends DataType {
    readonly name = "Utf8";

    override get isString(): boolean { return true; }
    override get isUtf8(): boolean { return true; }
    
    coerce(val: any): string | null {
        if (val == null) return null;
        return String(val);
    }
    
    equals(other: DataType): boolean {
        return other.name === "Utf8";
    }
    allocate(size: number): (string | null)[] { return new Array(size).fill(null); }

}

export const Utf8 = new Utf8Type();

import { DataType } from "./DataType";

export class Float64Type extends DataType {
    readonly name = "Float64";
    
    coerce(val: any): number | null {
        if (val == null) return null;
        const num = Number(val);
        return isNaN(num) ? null : num;
    }
    
    equals(other: DataType): boolean {
        return other.name === "Float64";
    }
}

export const Float64 = new Float64Type();

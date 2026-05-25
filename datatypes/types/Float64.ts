import { FloatDataType, DataType } from "../DataType";
import { toValidFloat } from "../../utils";

export class Float64Type extends FloatDataType {
    readonly name = "Float64";
    
    coerce(val: any): number | null {
        return toValidFloat(val);
    }
    
    equals(other: DataType): boolean {
        return other.name === "Float64";
    }
}

export const Float64 = new Float64Type();

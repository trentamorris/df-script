import { FloatDataType, DataType } from "../DataType";
import { toValidFloat } from "../../utils";

export class Float32Type extends FloatDataType {
    readonly name = "Float32";

    coerce(val: any): number | null {
        return toValidFloat(val, "Float32");
    }

    equals(other: DataType): boolean {
        return other.name === "Float32";
    }
}

export const Float32 = new Float32Type();

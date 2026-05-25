import { TemporalDataType, DataType } from "../DataType";
import { toValidFloat } from "../../utils";

export class DurationType extends TemporalDataType {
    readonly name = "Duration";

    coerce(val: any): number | null {
        return toValidFloat(val);
    }

    equals(other: DataType): boolean {
        return other.name === "Duration";
    }
}

export const Duration = new DurationType();

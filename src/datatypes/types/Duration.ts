import { TemporalDataType, DataType } from "../DataType";
import { toValidNumber } from "../../utils";

export class DurationType extends TemporalDataType {
    readonly name = "Duration";

    coerce(val: any): number | null {
        return toValidNumber(val);
    }

    equals(other: DataType): boolean {
        return other.name === "Duration";
    }
    allocate(size: number): (number | null)[] { return new Array(size).fill(null); }

}

export const Duration = new DurationType();

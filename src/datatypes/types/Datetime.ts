import { TemporalDataType, DataType } from "../DataType";
import { toValidDate } from "../../utils";

export class DatetimeType extends TemporalDataType {
    readonly name = "Datetime";
    
    coerce(val: any): Date | null {
        return toValidDate(val);
    }
    
    equals(other: DataType): boolean {
        return other.name === "Datetime";
    }
    allocate(size: number): (Date | null)[] { return new Array(size).fill(null); }

}

export const Datetime = new DatetimeType();

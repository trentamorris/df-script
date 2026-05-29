import { TemporalDataType, DataType } from "../DataType";
import { toValidDate } from "../../utils";

export class DateType extends TemporalDataType {
    readonly name = "Date";

    coerce(val: any): Date | null {
        const d = toValidDate(val);
        if (!d) return null;
        d.setUTCHours(0, 0, 0, 0);
        return d;
    }

    equals(other: DataType): boolean {
        return other.name === "Date";
    }
    allocate(size: number): (Date | null)[] { return new Array(size).fill(null); }

}

export const Date = new DateType();

import { TemporalDataType, DataType } from "../DataType";
import { toValidDate, TIME_PREFIX_REGEX, ZONE_OFFSET_REGEX, isValidDateObj } from "../../utils";

export class TimeType extends TemporalDataType {
    readonly name = "Time";

    coerce(val: any): string | null {
        if (val == null) return null;
        if (typeof val === "string") {
            const trimmed = val.trim();
            if (TIME_PREFIX_REGEX.test(trimmed)) {
                const d = new Date(`1970-01-01T${trimmed}${ZONE_OFFSET_REGEX.test(trimmed) ? "" : "Z"}`);
                if (isValidDateObj(d)) {
                    return d.toISOString().split("T")[1].slice(0, 12);
                }
            }
        }

        const d = toValidDate(val);
        return d ? d.toISOString().split("T")[1].slice(0, 12) : null;
    }

    equals(other: DataType): boolean {
        return other.name === "Time";
    }
    allocate(size: number): (string | null)[] { return new Array(size).fill(null); }

}

export const Time = new TimeType();

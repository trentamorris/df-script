import { DataType } from "./DataType";

export class DatetimeType extends DataType {
    readonly name = "Datetime";
    
    coerce(val: any): Date | null {
        if (val == null) return null;
        if (val instanceof Date) return val;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    }
    
    equals(other: DataType): boolean {
        return other.name === "Datetime";
    }
}

export const Datetime = new DatetimeType();

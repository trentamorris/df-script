import { NumericDataType, DataType } from "../DataType";
import { toValidFloat } from "../../utils";

export class DecimalType extends NumericDataType {
    readonly name: string;

    constructor(public readonly precision?: number, public readonly scale?: number) {
        super();
        this.name = precision !== undefined && scale !== undefined
            ? `Decimal(${precision}, ${scale})`
            : "Decimal";
    }

    coerce(val: any): number | null {
        const num = toValidFloat(val);
        if (num === null) return null;
        if (this.scale !== undefined) {
            const multiplier = Math.pow(10, this.scale);
            return Math.round(num * multiplier) / multiplier;
        }
        return num;
    }

    equals(other: DataType): boolean {
        return other instanceof DecimalType &&
            this.precision === other.precision &&
            this.scale === other.scale;
    }
}

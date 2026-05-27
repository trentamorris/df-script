import { NumericDataType, DataType } from "../DataType";
import { toValidDecimal } from "../../utils";

export class DecimalType extends NumericDataType {
    readonly name: string;

    constructor(public readonly precision?: number, public readonly scale?: number) {
        super();
        this.name = precision !== undefined && scale !== undefined
            ? `Decimal(${precision}, ${scale})`
            : "Decimal";
    }

    coerce(val: any): number | null {
        return toValidDecimal(val, { precision: this.precision, scale: this.scale });
    }

    equals(other: DataType): boolean {
        return other instanceof DecimalType &&
            this.precision === other.precision &&
            this.scale === other.scale;
    }
}

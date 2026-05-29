import { UnsignedIntegerType, DataType } from "../DataType";
import { toValidInt } from "../../utils";

export class UInt16Type extends UnsignedIntegerType {
    readonly name = "UInt16";

    coerce(val: any): number | null {
        return toValidInt(val, "UInt16");
    }

    equals(other: DataType): boolean {
        return other.name === "UInt16";
    }
    allocate(size: number): Uint16Array { return new Uint16Array(size); }

}

export const UInt16 = new UInt16Type();

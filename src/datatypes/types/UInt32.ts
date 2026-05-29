import { UnsignedIntegerType, DataType } from "../DataType";
import { toValidInt } from "../../utils";

export class UInt32Type extends UnsignedIntegerType {
    readonly name = "UInt32";

    coerce(val: any): number | null {
        return toValidInt(val, "UInt32");
    }

    equals(other: DataType): boolean {
        return other.name === "UInt32";
    }
    allocate(size: number): Uint32Array { return new Uint32Array(size); }

}

export const UInt32 = new UInt32Type();

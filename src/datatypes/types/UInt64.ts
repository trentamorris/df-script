import { UnsignedIntegerType, DataType } from "../DataType";
import { toValidBigInt } from "../../utils";

export class UInt64Type extends UnsignedIntegerType<bigint | null> {
    readonly name = "UInt64";

    coerce(val: any): bigint | null {
        return toValidBigInt(val);
    }

    equals(other: DataType): boolean {
        return other.name === "UInt64";
    }
    allocate(size: number): BigUint64Array { return new BigUint64Array(size); }

}

export const UInt64 = new UInt64Type();

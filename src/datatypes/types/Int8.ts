import { SignedIntegerType, DataType } from "../DataType";
import { toValidInt } from "../../utils";

export class Int8Type extends SignedIntegerType {
    readonly name = "Int8";

    coerce(val: any): number | null {
        return toValidInt(val, "Int8");
    }

    equals(other: DataType): boolean {
        return other.name === "Int8";
    }
    allocate(size: number): Int8Array { return new Int8Array(size); }

}

export const Int8 = new Int8Type();

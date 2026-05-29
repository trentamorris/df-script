import { SignedIntegerType, DataType } from "../DataType";
import { toValidInt } from "../../utils";

export class Int16Type extends SignedIntegerType {
    readonly name = "Int16";

    coerce(val: any): number | null {
        return toValidInt(val, "Int16");
    }

    equals(other: DataType): boolean {
        return other.name === "Int16";
    }
    allocate(size: number): Int16Array { return new Int16Array(size); }

}

export const Int16 = new Int16Type();

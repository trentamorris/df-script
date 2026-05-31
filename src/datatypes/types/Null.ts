import { DataType } from "../DataType";

export class NullType extends DataType {
    readonly name = "Null";

    override get isNull(): boolean { return true; }

    coerce(_val: any): null {
        return null;
    }

    equals(other: DataType): boolean {
        return other.name === "Null";
    }
    allocate(size: number): null[] { return new Array(size).fill(null); }

}

export const Null = new NullType();

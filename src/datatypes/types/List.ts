import { NestedDataType, DataType } from "../DataType";
import { isArrayOrTypedArray } from "../../utils";

export class ListType<TInner = any> extends NestedDataType<TInner[] | null> {
    readonly name = "List";
    
    constructor(public readonly innerType: DataType<TInner>) {
        super();
    }
    
    coerce(val: any): TInner[] | null {
        if (val == null) return null;
        const arr = isArrayOrTypedArray(val) ? Array.from(val as any) : [val];
        const len = arr.length;
        const res = new Array(len);
        for (let i = 0; i < len; i++) {
            res[i] = this.innerType.coerce(arr[i]);
        }
        return res;
    }
    
    equals(other: DataType): boolean {
        return other instanceof ListType && this.innerType.equals(other.innerType);
    }
    allocate(size: number): (TInner[] | null)[] { return new Array(size).fill(null); }

}

export const List = <TInner>(inner: DataType<TInner>) => new ListType<TInner>(inner);

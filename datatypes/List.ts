import { DataType } from "./DataType";

export class ListType extends DataType {
    readonly name = "List";
    
    constructor(public readonly innerType: DataType) {
        super();
    }
    
    coerce(val: any): any[] | null {
        if (val == null) return null;
        const arr = Array.isArray(val) ? val : [val];
        return arr.map(item => this.innerType.coerce(item));
    }
    
    equals(other: DataType): boolean {
        return other instanceof ListType && this.innerType.equals(other.innerType);
    }
}

export const List = (inner: DataType) => new ListType(inner);

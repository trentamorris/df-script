export abstract class DataType {
    abstract readonly name: string;
    abstract coerce(val: any): any;
    abstract equals(other: DataType): boolean;
}

export class DFScriptError extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export class DataFrameError extends DFScriptError {}

export class ColumnNotFoundError extends DataFrameError {
    constructor(columnName: string, message?: string) {
        super(message || `Column "${columnName}" does not exist in the DataFrame.`);
    }
}

export class SchemaError extends DFScriptError {}

export class ComputeError extends DFScriptError {}

export class ShapeError extends DFScriptError {}

export * from "./utils";



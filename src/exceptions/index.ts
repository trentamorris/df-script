
/**
 * Base exception class for all df-script errors.
 */
export class DFScriptError extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

/**
 * General error thrown during DataFrame instantiation or execution.
 */
export class DataFrameError extends DFScriptError { }

/**
 * Error thrown when a specified column name does not exist in the DataFrame schema.
 */
export class ColumnNotFoundError extends DataFrameError {
    constructor(columnName: string, message?: string) {
        super(message || `Column "${columnName}" does not exist in the DataFrame.`);
    }
}

/**
 * Error thrown when schema definitions, coercions, or data types are invalid.
 */
export class SchemaError extends DFScriptError { }

/**
 * Error thrown during expression evaluation or element-wise calculations.
 */
export class ComputeError extends DFScriptError { }

/**
 * Error thrown when shape dimensions or column heights mismatch.
 */
export class ShapeError extends DFScriptError { }

export * from "./utils";

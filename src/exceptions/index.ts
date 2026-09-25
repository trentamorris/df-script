/**
 * @namespace Exception
 * @category Exception
 * @syntax throw new {symbol}("message")
 */

/**
 * Base exception class for all df-script errors.
 */
export class DFScriptError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "DFScriptError";
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

/**
 * General error thrown during DataFrame instantiation or execution.
 */
export class DataFrameError extends DFScriptError {
    constructor(message: string) {
        super(message);
        this.name = "DataFrameError";
    }
}

/**
 * Error thrown when a specified column name does not exist in the DataFrame schema.
 */
export class ColumnNotFoundError extends DataFrameError {
    constructor(columnName: string, message?: string) {
        super(message || `Column "${columnName}" does not exist in the DataFrame.`);
        this.name = "ColumnNotFoundError";
    }
}

/**
 * Error thrown when schema definitions, coercions, or data types are invalid.
 */
export class SchemaError extends DFScriptError {
    constructor(message: string) {
        super(message);
        this.name = "SchemaError";
    }
}

/**
 * Error thrown during expression evaluation or element-wise calculations.
 */
export class ComputeError extends DFScriptError {
    constructor(message: string) {
        super(message);
        this.name = "ComputeError";
    }
}

/**
 * Error thrown when shape dimensions or column heights mismatch.
 */
export class ShapeError extends DFScriptError {
    constructor(message: string) {
        super(message);
        this.name = "ShapeError";
    }
}

/**
 * Error thrown when a parameter or argument provided to a function is invalid.
 */
export class InvalidArgumentError extends DFScriptError {
    constructor(message: string) {
        super(message);
        this.name = "InvalidArgumentError";
    }
}

/**
 * Error thrown during file I/O or streaming operations.
 */
export class IOStreamError extends DFScriptError {
    constructor(message: string) {
        super(message);
        this.name = "IOStreamError";
    }
}

export * from "./utils";

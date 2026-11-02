/** @typefile */
import type { IExpr, ValidScalarTypes } from "../types";

export type ExprConstructor = new (...args: any[]) => IExpr;

export interface RandomOptions {
    min?: number;
    max?: number;
    integer?: boolean;
}

/**
 * Operand for arithmetic expressions.
 * Accepts a literal number, bigint, another column expression, or null.
 */
export type NumericArg = number | bigint | IExpr | null;

/**
 * Operand for bivariate or series-level operations (corr, cov, dot, etc.).
 * Accepts a numeric column expression, numeric literal, or numeric array.
 */
export type NumericSeriesArg = NumericArg | number[];

/**
 * Operand for boolean logical operations (and, or, xor).
 * Accepts a boolean literal, another column expression, or null.
 */
export type BooleanArg = boolean | boolean[] | IExpr | null | undefined;

/**
 * Operand for equality and comparison expressions (eq, ne, eqMissing, neMissing).
 * Accepts another column expression, valid primitive scalar, or an array of scalar values.
 */
export type ComparisonArg = IExpr | ValidScalarTypes | ValidScalarTypes[] | null | undefined;



export interface IsNDistinctOptions {
    /**
     * If true (default), returns null when index is out of bounds.
     * If false, throws an error if index is out of bounds.
     * @default true
     */
    nullOnOob?: boolean;
}

export interface RankOptions {
    /**
     * When true, ranks are consecutive integers without gaps between tied values (1, 2, 2, 3).
     * When false (default), ranks have gaps for tied values (1, 2, 2, 4).
     * @default false
     */
    dense?: boolean;
}

export interface IsCloseOptions {
    absTol?: number;
    relTol?: number;
    nansEqual?: boolean;
}


export interface CountOptions {
    /**
     * Whether to include `null`, `undefined`, or `NaN` values in the count.
     * When `false`, counts only non-null, valid elements.
     * @default false
     */
    includeNulls?: boolean;
}

/**
 * Inclusivity mode for interval boundaries.
 */
export type ClosedBoundary = "both" | "left" | "right" | "none";

export interface BetweenOptions {
    /**
     * Controls boundary inclusivity:
     * - `"both"`: `lower <= x <= upper` (default)
     * - `"left"`: `lower <= x < upper`
     * - `"right"`: `lower < x <= upper`
     * - `"none"`: `lower < x < upper`
     * @default "both"
     */
    closed?: ClosedBoundary;
}

export type ProxyPropertyResolver<T extends object> = (prop: string, target: T) => any;
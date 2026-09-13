/** @typefile */
import type { IExpr } from "../types";

export type ExprConstructor = new (...args: any[]) => IExpr;

export interface RandomOptions {
    min?: number;
    max?: number;
    integer?: boolean;
}

export type NumericArg = number | bigint | IExpr | null;

export interface IsCloseOptions {
    absTol?: number;
    relTol?: number;
    nansEqual?: boolean;
}

export type ProxyPropertyResolver<T extends object> = (prop: string, target: T) => any;
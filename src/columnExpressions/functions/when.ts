import { ColumnExpr } from "../ColumnExpr";
import type { IExpr, ValidScalarTypes } from "../../types";
import { isArrayOrTypedArray } from "../../utils";

type WhenArg = IExpr | ValidScalarTypes;

export class WhenThenChain {
    private _predicates: WhenArg[];
    private _values: WhenArg[];

    constructor(predicates: WhenArg[], values: WhenArg[]) {
        this._predicates = predicates;
        this._values = values;
    }

    then(value: WhenArg): WhenThen {
        return new WhenThen(this._predicates, this._values.concat(value));
    }
}

export class When {
    private _predicates: WhenArg[];

    constructor(predicate: WhenArg) {
        this._predicates = [predicate];
    }

    then(value: WhenArg): WhenThen {
        return new WhenThen(this._predicates, [value]);
    }
}

export class WhenThen extends ColumnExpr<any> {
    private _predicates: WhenArg[];
    private _values: WhenArg[];
    private _otherwiseValue: WhenArg;

    constructor(predicates: WhenArg[] | string, values?: WhenArg[], otherwiseValue: WhenArg = null) {
        super(typeof predicates === "string" ? predicates : "*when*");
        this._predicates = Array.isArray(predicates) ? predicates : [];
        this._values = values || [];
        this._otherwiseValue = otherwiseValue;

        this._ops.push((_, columns) => {
            const height = _.length;

            const evaluateArg = (arg: any): any => {
                if (ColumnExpr.isColExpr(arg)) {
                    return arg.evaluate(columns, height);
                }
                if (typeof arg === "string" && (arg in columns)) {
                    return columns[arg];
                }
                return arg;
            };

            const numConditions = this._predicates.length;
            const evaluatedPreds = new Array(numConditions);
            const evaluatedVals = new Array(numConditions);
            for (let j = 0; j < numConditions; j++) {
                evaluatedPreds[j] = evaluateArg(this._predicates[j]);
                evaluatedVals[j] = evaluateArg(this._values[j]);
            }
            const evaluatedOtherwise = evaluateArg(this._otherwiseValue);

            const result = new Array(height);

            for (let i = 0; i < height; i++) {
                let matched = false;
                for (let j = 0; j < numConditions; j++) {
                    const predVal = isArrayOrTypedArray(evaluatedPreds[j]) ? evaluatedPreds[j][i] : evaluatedPreds[j];
                    if (predVal === true) {
                        result[i] = isArrayOrTypedArray(evaluatedVals[j]) ? evaluatedVals[j][i] : evaluatedVals[j];
                        matched = true;
                        break;
                    }
                }
                if (!matched) {
                    result[i] = isArrayOrTypedArray(evaluatedOtherwise) ? evaluatedOtherwise[i] : evaluatedOtherwise;
                }
            }
            return result;
        });
    }

    when(predicate: WhenArg): WhenThenChain {
        return new WhenThenChain(this._predicates.concat(predicate), this._values);
    }

    otherwise(value: WhenArg): ColumnExpr<any> {
        return new WhenThen(this._predicates, this._values, value);
    }
}

/**
 * Provides conditional branch evaluations inside column expressions.
 */
export function when(predicate: WhenArg): When {
    return new When(predicate);
}

import { ColumnExpr } from "../ColumnExpr";
import type { IExpr, Scalar } from "../../types";
import { isArrayOrTypedArray } from "../../utils";

type WhenArg = IExpr | Scalar;

export class WhenThenChain {
    private predicates: WhenArg[];
    private values: WhenArg[];

    constructor(predicates: WhenArg[], values: WhenArg[]) {
        this.predicates = predicates;
        this.values = values;
    }

    then(value: WhenArg): WhenThen {
        return new WhenThen(this.predicates, this.values.concat(value));
    }
}

export class When {
    private predicates: WhenArg[];

    constructor(predicate: WhenArg) {
        this.predicates = [predicate];
    }

    then(value: WhenArg): WhenThen {
        return new WhenThen(this.predicates, [value]);
    }
}

export class WhenThen extends ColumnExpr<any> {
    private predicates: WhenArg[];
    private values: WhenArg[];
    private otherwiseValue: WhenArg;

    constructor(predicates: WhenArg[] | string, values?: WhenArg[], otherwiseValue: WhenArg = null) {
        super(typeof predicates === "string" ? predicates : "*when*");
        this.predicates = Array.isArray(predicates) ? predicates : [];
        this.values = values || [];
        this.otherwiseValue = otherwiseValue;

        this.ops.push((_, columns) => {
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

            const numConditions = this.predicates.length;
            const evaluatedPreds = new Array(numConditions);
            const evaluatedVals = new Array(numConditions);
            for (let j = 0; j < numConditions; j++) {
                evaluatedPreds[j] = evaluateArg(this.predicates[j]);
                evaluatedVals[j] = evaluateArg(this.values[j]);
            }
            const evaluatedOtherwise = evaluateArg(this.otherwiseValue);

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
        return new WhenThenChain(this.predicates.concat(predicate), this.values);
    }

    otherwise(value: WhenArg): ColumnExpr<any> {
        return new WhenThen(this.predicates, this.values, value);
    }
}

export function when(predicate: WhenArg): When {
    return new When(predicate);
}

import { ColumnExpr } from "../ColumnExpr";
import { lit } from "./lit";
import type { IExpr, Scalar } from "../../types";

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

            const resolveArg = (arg: any): IExpr => {
                if (typeof arg === "string") {
                    if (arg in columns) {
                        return new ColumnExpr(arg);
                    }
                    return lit(arg);
                }
                if (arg && typeof arg === "object" && "evaluate" in arg) {
                    return arg as IExpr;
                }
                return lit(arg);
            };

            const resolvedPreds = this.predicates.map(resolveArg);
            const resolvedVals = this.values.map(resolveArg);
            const resolvedOtherwise = resolveArg(this.otherwiseValue);

            const evaluatedPreds = resolvedPreds.map(p => p.evaluate(columns, height));
            const evaluatedVals = resolvedVals.map(v => v.evaluate(columns, height));
            const evaluatedOtherwise = resolvedOtherwise.evaluate(columns, height);

            const result = new Array(height);
            const numConditions = evaluatedPreds.length;

            for (let i = 0; i < height; i++) {
                let matched = false;
                for (let j = 0; j < numConditions; j++) {
                    if (evaluatedPreds[j][i] === true) {
                        result[i] = evaluatedVals[j][i];
                        matched = true;
                        break;
                    }
                }
                if (!matched) {
                    result[i] = evaluatedOtherwise[i];
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

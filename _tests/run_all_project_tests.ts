export {};
declare const process: any;
declare const require: any;

console.log("=========================================");
console.log("RUNNING ALL DFSCRIPT PROJECT TESTS...");
console.log("=========================================");

const _failedSuites: string[] = [];
let _currentSuiteName = "";
const _realExit = process.exit;
(process as any).exit = (code?: number) => {
    if (code && code !== 0) {
        _failedSuites.push(`${_currentSuiteName} (exited with code ${code})`);
    }
};

const _runSuite = (name: string, fn: () => void) => {
    _currentSuiteName = name;
    try {
        fn();
    } catch (err: any) {
        console.error(`❌ Suite failed: ${name}`, err);
        _failedSuites.push(`${name}: ${err?.message || err}`);
    }
};

// 1. ColumnExpressions
_runSuite("ArrayExpr", () => { require("./columnExpressions/mixins/ArrayExpr/run_all"); });
_runSuite("StandardExpr", () => { require("./columnExpressions/mixins/StandardExpr/run_all"); });
_runSuite("StringExpr", () => { require("./columnExpressions/mixins/StringExpr/run_all"); });
_runSuite("StructExpr", () => { require("./columnExpressions/mixins/StructExpr/run_all"); });
_runSuite("TemporalExpr", () => { require("./columnExpressions/mixins/TemporalExpr/run_all"); });
_runSuite("all.test", () => { require("./columnExpressions/functions/all.test"); });
_runSuite("coalesce.test", () => { require("./columnExpressions/functions/coalesce.test"); });
_runSuite("duration.test", () => { require("./columnExpressions/functions/duration.test"); });
_runSuite("element.test", () => { require("./columnExpressions/functions/element.test"); });
_runSuite("exclude.test", () => { require("./columnExpressions/functions/exclude.test"); });
_runSuite("horizontal.test", () => { require("./columnExpressions/functions/horizontal.test"); });
_runSuite("implode.test", () => { require("./columnExpressions/functions/implode.test"); });
_runSuite("lit.test", () => { require("./columnExpressions/functions/lit.test"); });
_runSuite("seqRange.test", () => { require("./columnExpressions/functions/seqRange.test"); });
_runSuite("struct.test", () => { require("./columnExpressions/functions/struct.test"); });
_runSuite("when.test", () => { require("./columnExpressions/functions/when.test"); });
_runSuite("typeSelector.test", () => { require("./columnExpressions/typeSelector.test"); });
_runSuite("typeInference.test", () => { require("./columnExpressions/typeInference.test"); });

// 2. DataFrames
_runSuite("dataframe", () => { require("./dataframe/run_all"); });

// 3. Functions
_runSuite("concat.test", () => { require("./functions/concat.test"); });
_runSuite("readCsv.test", () => { require("./functions/readCsv.test"); });
_runSuite("readJson.test", () => { require("./functions/readJson.test"); });

// 4. DataTypes
_runSuite("dataTypes.test", () => { require("./datatypes/dataTypes.test"); });

// 5. Utils
_runSuite("utils/array", () => { require("./utils/array/run_all"); });
_runSuite("utils/binary", () => { require("./utils/binary/run_all"); });
_runSuite("utils/csv", () => { require("./utils/csv/run_all"); });
_runSuite("utils/date", () => { require("./utils/date/run_all"); });
_runSuite("utils/duration", () => { require("./utils/duration/run_all"); });
_runSuite("utils/json", () => { require("./utils/json/run_all"); });
_runSuite("utils/number", () => { require("./utils/number/run_all"); });
_runSuite("utils/object", () => { require("./utils/object/run_all"); });
_runSuite("utils/string", () => { require("./utils/string/run_all"); });

console.log("=========================================");
if (_failedSuites.length > 0) {
    console.error(`❌ TEST SUITE FAILED: ${_failedSuites.length} failure(s) encountered:`);
    for (const f of _failedSuites) {
        console.error(`  - ${f}`);
    }
    _realExit(1);
} else {
    console.log("🎉 ALL TESTS IN THE PROJECT PASSED SUCCESSFULLY!");
    _realExit(0);
}

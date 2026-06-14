import { computeMedian, computeQuantile } from "../../src/utils/number";

const arr = [1, 2, NaN, 100, -Infinity, Infinity];
console.log('Median:', computeMedian(arr));
console.log('Quantile(0.5):', computeQuantile(arr, 0.5));

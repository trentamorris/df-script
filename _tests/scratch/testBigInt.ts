import { toValidBigInt } from "../../src/utils/number";

console.log('1.23e+4 =>', toValidBigInt("1.23e+4", { truncate: false }));
console.log('123e+4 =>', toValidBigInt("123e+4", { truncate: false }));
console.log('1.234e+2 =>', toValidBigInt("1.234e+2", { truncate: false }));
console.log('123 =>', toValidBigInt("123", { truncate: false }));
console.log('123.45 =>', toValidBigInt("123.45", { truncate: false }));
console.log('123.45 with truncate =>', toValidBigInt("123.45", { truncate: true }));

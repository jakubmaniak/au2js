import { essentials } from './essentials';
import { functions } from './functions';
import { macros } from './macros';


export type AuString = string | number | boolean;
export type AuNumber = number | boolean | string;// | null

export type AuConvertableNumber<T extends number> = T | `${T}`
    | (T extends 0 ? false | null : never)
    | (T extends 1 ? true : never);


const au3 = Object.assign(macros, functions, essentials);

export default au3;
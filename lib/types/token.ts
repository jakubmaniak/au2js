import { TokenType } from './token-type.ts';


// TODO: toString / TokenFormatter
export interface Token<V = any> {
    type: TokenType;
    value?: V;
    source?: {
        line: number,
        column: number,
        precedingBlankLines: number;
    }
}
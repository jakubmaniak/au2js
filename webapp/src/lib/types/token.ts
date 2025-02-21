import { TokenType } from './token-type';


// TODO: add position and (toString / TokenFormatter)
export interface Token<V = any> {
    type: TokenType;
    value?: V;
}
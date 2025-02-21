import { AstNode } from './ast-node';


//TODO: change to AstNode
export interface VarDeclaration {
    name: string;
    subscripts?: (AstNode | undefined)[];
    value?: AstNode;
}
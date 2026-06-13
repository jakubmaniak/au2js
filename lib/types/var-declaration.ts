import { type AstNode } from './ast-node.ts';


//TODO: change to AstNode
export interface VarDeclaration {
    name: string;
    subscripts?: (AstNode | undefined)[];
    value?: AstNode;
}
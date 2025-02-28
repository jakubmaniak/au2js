import { NodeType } from './node-type';
import { VarDeclaration } from './var-declaration';


export type AstNode<T extends NodeType = AstNodeMap['type']> = AstNodeBase<T> & AstNodeMap;

type AstNodeBase<T extends NodeType> = {
    type: T,
    source?: {
        precedingBlankLines: number;
    }
};

export type AstNodeMap =
    {
        type: NodeType.Program,
        children: AstNode[]
    }
    | {
        type: NodeType.ExpressionStatement,
        expression: AstNode
    }
    | {
        type: NodeType.Identifier,
        name: string
    }
    | {
        type: NodeType.PrimitiveValue,
        kind: 'string' | 'number' | 'bool' | 'null' | 'default',
        value: string
    }
    | {
        type: NodeType.VarReference,
        name: string
    }
    | {
        type: NodeType.VarDeclaration,
        scope: 'global' | 'local' | 'dim',
        isStatic: boolean,
        isConst: boolean,
        declarations: VarDeclaration[]
    }
    | {
        type: NodeType.VarAssignment,
        target: AstNode,
        kind: '=' | '+=' | '-=' | '*=' | '/=' | '&=',
        subscripts?: AstNode[],
        value: AstNode
    }
    | {
        type: NodeType.ArrayInitializer,
        array: AstNode[]
    }
    | {
        type: NodeType.UnaryExpression,
        operator: string,
        argument: AstNode
    }
    | {
        type: NodeType.BinaryExpression,
        operator: string,
        left: AstNode,
        right: AstNode
    }
    | {
        type: NodeType.Group,
        expression: AstNode
    }
    | {
        type: NodeType.SubscriptExpression,
        target: AstNode,
        subscripts: AstNode[]
    }
    | {
        type: NodeType.MemberExpression,
        target: AstNode,
        property: string
    }
    | {
        type: NodeType.MacroCall,
        name: string;
    }
    | {
        type: NodeType.FunctionCall,
        target: AstNode,
        arguments: AstNode[]
    }
    | {
        type: NodeType.Exit,
        exitCode?: AstNode
    }
    | {
        type: NodeType.BlockStatement,
        body: AstNode[]
    }
    | {
        type: NodeType.FunctionDeclaration,
        name: string,
        parameters: AstNode<NodeType.Parameter>[],
        body: AstNode<NodeType.BlockStatement>
    }
    | {
        type: NodeType.Parameter,
        name: string,
        isByRef: boolean,
        isConst: boolean,
        defaultValue?: AstNode
    }
    | {
        type: NodeType.Return,
        value?: AstNode
    }
    | {
        type: NodeType.WhileStatement,
        test: AstNode,
        body: AstNode<NodeType.BlockStatement>
    }
    | {
        type: NodeType.DoUntilStatement,
        test: AstNode,
        body: AstNode<NodeType.BlockStatement>
    }
    | {
        type: NodeType.ForToStatement,
        variable: string,
        start: AstNode,
        stop: AstNode,
        step?: AstNode,
        body: AstNode<NodeType.BlockStatement>
    }
    | {
        type: NodeType.ForInStatement,
        variable: string,
        array: AstNode,
        body: AstNode<NodeType.BlockStatement>
    }
    | {
        type: NodeType.ExitLoop,
        levels?: AstNode
    }
    | {
        type: NodeType.ContinueLoop,
        levels?: AstNode
    }
    | {
        type: NodeType.IfStatement,
        oneline: boolean,
        test: AstNode,
        body: AstNode,
        elseBody?: AstNode<NodeType.BlockStatement | NodeType.IfStatement>
    }
    | {
        type: NodeType.SwitchStatement,
        target: AstNode,
        cases: AstNode<NodeType.SwitchCase>[]
    }
    | {
        type: NodeType.SwitchCase,
        value: AstNode,
        toValue?: AstNode,
        body: AstNode<NodeType.BlockStatement>
    }
    | {
        type: NodeType.JsDirective,
        code: string
    };


// type ExpressionNode = TypedAstNode<
//     NodeType.PrimitiveValue
//     | NodeType.Identifier
//     | NodeType.VarReference
//     | NodeType.MacroCall
//     | NodeType.UnaryExpression
//     | NodeType.BinaryExpression
//     | NodeType.SubscriptExpression
//     | NodeType.FunctionCall
// >;
// type ExpressionStatementNode = TypedAstNode<NodeType.ExpressionStatement>;
// type BlockStatementNode = TypedAstNode<NodeType.BlockStatement>;
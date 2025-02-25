import { AstNode } from './types/ast-node';
import { NodeType } from './types/node-type';
import { Token } from './types/token';
import { TokenType } from './types/token-type';


type Stack = (Token | AstNode)[];


export class ExpressionParser {
    private pos = 0;
    private token!: Token;
    private stack: Stack = [];
    private leftHand = false;

    constructor(private tokens: Token[]) { }

    parse(position: number, { leftHand = false } = { }) {
        this.pos = position;
        this.token = this.tokens[position];
        this.stack = [];
        this.leftHand = leftHand;

        this.expression();

        return {
            position: this.pos,
            stack: this.stack
        };
    }

    private expression() {
        this.logicalComparison();
    }

    private logicalComparison() {
        this.comparison();

        // And & Or have equal precedence in AutoIt
        while (this.match(TokenType.Keyword, 'And') || this.match(TokenType.Keyword, 'Or')) {
            const op = this.eat(TokenType.Keyword)!;
            this.comparison();

            const right = this.popNode();
            const left = this.popNode();

            this.push({
                type: NodeType.BinaryExpression,
                operator: op.value,
                left,
                right
            });
        }
    }

    private comparison() {
        this.concatenation();

        while (
            (this.match(TokenType.Operator, '=') && !this.leftHand)
            || this.match(TokenType.Operator, '==')
            || this.match(TokenType.Operator, '<>')
            || this.match(TokenType.Operator, '<')
            || this.match(TokenType.Operator, '>')
            || this.match(TokenType.Operator, '<=')
            || this.match(TokenType.Operator, '>=')
        ) {
            const op = this.eat(TokenType.Operator)!;
            this.concatenation();

            const right = this.popNode();
            const left = this.popNode();

            this.push({
                type: NodeType.BinaryExpression,
                operator: op.value,
                left,
                right
            });
        }
    }

    private concatenation() {
        this.sum();

        while (this.eat(TokenType.Operator, '&')) {
            this.sum();

            const right = this.popNode();
            const left = this.popNode();

            this.push({
                type: NodeType.BinaryExpression,
                operator: '&',
                left,
                right
            });
        }
    }

    private sum() {
        this.product();

        while (this.match(TokenType.Operator, '+') || this.match(TokenType.Operator, '-')) {
            const op = this.eat(TokenType.Operator)!;
            this.product();

            const right = this.popNode();
            const left = this.popNode();

            this.push({
                type: NodeType.BinaryExpression,
                operator: op.value,
                left,
                right
            });
        }
    }

    private product() {
        this.exponentation();

        while (this.match(TokenType.Operator, '*') || this.match(TokenType.Operator, '/')) {
            const op = this.eat(TokenType.Operator)!;
            this.exponentation();

            const right = this.popNode();
            const left = this.popNode();

            this.push({
                type: NodeType.BinaryExpression,
                operator: op.value,
                left,
                right
            });
        }
    }

    private exponentation() {
        this.prefixOperator();

        while (this.eat(TokenType.Operator, '^')) {
            this.prefixOperator();

            const right = this.popNode();
            const left = this.popNode();

            this.push({
                type: NodeType.BinaryExpression,
                operator: '^',
                left,
                right
            });
        }
    }

    private prefixOperator() {
        if (
            this.match(TokenType.Keyword, 'Not')
            || this.match(TokenType.Operator, '+')
            || this.match(TokenType.Operator, '-')
        ) {
            const op = this.eat()!;
            this.prefixOperator();

            this.push({
                type: NodeType.UnaryExpression,
                operator: op.value,
                argument: this.popNode()
            });
        }
        else {
            this.callOrSubscript();
        }
    }

    private callOrSubscript() {
        this.value();

        while (this.matchMany(TokenType.LParen, TokenType.LSquare, TokenType.Dot)) {
            if (this.eat(TokenType.LParen)) {
                const args = this.arguments();

                this.push({
                    type: NodeType.FunctionCall,
                    arguments: args,
                    target: this.popNode(),
                })
            }
            else if (this.eat(TokenType.LSquare)) {
                this.expression();
                this.eat(TokenType.RSquare)
                    || this.syntaxError('Expected RSquare');

                this.push({
                    type: NodeType.SubscriptExpression,
                    subscripts: [this.popNode()], //TODO
                    target: this.popNode()
                });
            }
            else if (this.eat(TokenType.Dot)) {
                const property = this.eat(TokenType.Identifier)
                    || this.syntaxError('Expected identifier');

                this.push({
                    type: NodeType.MemberExpression,
                    target: this.popNode(),
                    property: property.value
                });
            }
        }
    }

    private arguments() {
        const args: AstNode[] = [];

        while (!this.match(TokenType.RParen)) {
            this.expression();
            args.push(this.popNode());

            if (!this.eat(TokenType.Comma)) break;
        }

        this.eat(TokenType.RParen)
            || this.syntaxError('Expected RParen');

        return args;
    }

    private value() {
        if (this.match(TokenType.Number)) {
            this.push({
                type: NodeType.PrimitiveValue,
                kind: 'number',
                value: this.eat()!.value
            });
        }
        else if (this.match(TokenType.String)) {
            this.push({
                type: NodeType.PrimitiveValue,
                kind: 'string',
                value: this.eat()!.value
            });
        }
        else if (this.match(TokenType.Keyword, 'True') || this.match(TokenType.Keyword, 'False')) {
            this.push({
                type: NodeType.PrimitiveValue,
                kind: 'bool',
                value: this.eat()!.value.toLowerCase()
            });
        }
        else if (this.eat(TokenType.Keyword, 'Null')) {
            this.push({
                type: NodeType.PrimitiveValue,
                kind: 'null',
                value: 'null'
            });
        }
        else if (this.eat(TokenType.Keyword, 'Default')) {
            this.push({
                type: NodeType.PrimitiveValue,
                kind: 'default',
                value: 'default'
            });
        }
        else if (this.match(TokenType.Identifier)) {
            this.push({
                type: NodeType.Identifier,
                name: this.eat()!.value
            });
        }
        else if (this.match(TokenType.Variable)) {
            this.push({
                type: NodeType.VarReference,
                name: this.eat()!.value
            });
        }
        else if (this.match(TokenType.Macro)) {
            this.push({
                type: NodeType.MacroCall,
                name: this.eat()!.value
            });
        }
        else if (this.eat(TokenType.LParen)) {
            this.expression();
            this.eat(TokenType.RParen)
                || this.syntaxError('Expected RParen');

            this.push({
                type: NodeType.Group,
                expression: this.popNode()
            });
        }
    }

    private syntaxError(msg: string): never {
        throw new SyntaxError(msg);
    }

    private push(node: AstNode) {
        this.stack.push(node);
    }

    private pop() {
        return this.stack.pop();
    }

    private popNode() {
        return this.stack.pop() as AstNode;
    }

    private eat(type?: TokenType, value?: any) {
        if (this.pos + 1 >= this.tokens.length) {
            return null;
        }

        if ((type !== undefined && this.token.type != type)
            || (value !== undefined && this.token.value != value)) {
            return null;
        }

        const token = this.token;
        this.token = this.tokens[++this.pos];

        return token;
    }

    private match(type: TokenType, value?: any) {
        if (this.pos + 1 >= this.tokens.length) {
            return null;
        }

        if (this.token.type != type || (value !== undefined && this.token.value != value)) {
            return null;
        }

        return this.token;
    }

    private matchMany(...types: TokenType[]) {
        if (this.pos + 1 >= this.tokens.length) {
            return null;
        }

        if (!types.includes(this.token.type)) {
            return null;
        }

        return this.token;
    }
}
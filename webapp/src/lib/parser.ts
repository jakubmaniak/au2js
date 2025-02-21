import { AstNode, TypedNode } from './types/ast-node';
import { BlockType } from './types/block-type';
import { NodeType } from './types/node-type';
import { Token } from './types/token';
import { TokenType } from './types/token-type';
import { VarDeclaration } from './types/var-declaration';


export class Parser {
    private tree: TypedNode<NodeType.Program> = { type: NodeType.Program, children: [] };
    private i = -1;
    private tok!: Token;

    get eos() {
        return this.i >= this.tokens.length - 1;
    }

    private constructor(private tokens: Token[]) { }

    static getAst(tokens: Token[]) {
        return new Parser(tokens).run();
    }

    private run() {
        this.advance(1);

        while (!this.eos && !this.peek(TokenType.EOF)) {
            this.eatWhile(TokenType.EOL);

            const statement = this.eatStatement(BlockType.Program);

            if (statement) this.append(statement);
            else if (this.match(TokenType.EOF)) break;
            else this.parsing('statement').expected.not();
            // else break;
        }

        return this.tree;
    }

    private expected(type: keyof typeof TokenType | {}, value?: any): never {
        throw new SyntaxError(`Expected ${type} ${value === undefined ? '' : `("${value}")`} but found ${this.tok.type} ${this.tok.value === undefined ? '' : `("${this.tok.value}")`}`);
    }

    private expectedParsing(target: string, type: keyof typeof TokenType | {}, value?: any, peek = false): never {
        const token = this.tokens[this.i + (peek ? 1 : 0)];
        const message = `Expected ${type}${value === undefined ? '' : ` ("${value}")`} but found ${token.type}${token.value === undefined ? '' : ` ("${token.value}")`} while parsing ${target}`;
        throw new SyntaxError(message);
    }

    private expectedManyParsing(target: string, expected: ([keyof typeof TokenType | {}, any] | (keyof typeof TokenType | {}))[], peek = false): never {
        const token = this.tokens[this.i + (peek ? 1 : 0)];
        const exp = expected
            .map((element) => (element instanceof Array) ? element : [element, undefined])
            .map(([type, value]) =>
                type + (value === undefined ? '' : ` ("${value}")`)
            )
            .join(expected.length == 2 ? ' or ' : ', ');

        const message = `Expected ${exp} but found ${token.type}${token.value === undefined ? '' : ` ("${token.value}")`} while parsing ${target}`;
        throw new SyntaxError(message);
    }

    private unexpectedParsing(target: string, peek = false): never {
        const token = this.tokens[this.i + (peek ? 1 : 0)];
        const message = `Unexpected ${token.type}${token.value === undefined ? '' : ` ("${token.value}")`} while parsing ${target}`;
        throw new SyntaxError(message);
    }

    private parsing(target: string) {
        const expected = (type: (keyof typeof TokenType) | {}, value?: any) => this.expectedParsing(target, type, value);
        const expectedPeeking = (type: (keyof typeof TokenType) | {}, value?: any) => this.expectedParsing(target, type, value, true);

        const extended = Object.assign(expected, {
            many: (...expectedToks: ([keyof typeof TokenType | {}, any] | (keyof typeof TokenType | {}))[]) => this.expectedManyParsing(target, expectedToks),
            not: () => this.unexpectedParsing(target)
        });

        return {
            expected: extended,
            expectedPeeking
        };
    }

    private advance(steps: number) {
        this.i += steps;
        this.tok = this.tokens[this.i];
    }

    private match(type: TokenType, value?: string | string[]) {
        if (this.tok.type != type) {
            return false;
        }

        if (value === undefined) {
            return true;
        }
        else if (value instanceof Array) {
            return value.includes(this.tok.value);
        }
        else {
            return this.tok.value === value;
        }
    }

    private eat(type: TokenType, value?: string) {
        if (this.eos) {
            return null;
        }

        const token = this.tokens[this.i];
        if (token.type == type && (value === undefined || token.value === value)) {
            this.advance(1);
            return token;
        }

        return null;
    }

    private eatWhile(type: TokenType, value?: string) {
        while (this.eat(type, value));
    }

    private peek(type?: TokenType, value?: string) {
        if (this.i + 1 >= this.tokens.length) {
            return null;
        }

        const token = this.tokens[this.i + 1];

        if ((type === undefined || token.type === type) && (value === undefined || token.value === value)) {
            return token;
        }

        return null;
    }

    private eatStatement(blockType: BlockType, { oneline = false } = { }): AstNode | null {
        // VarDeclaration
        if (this.match(TokenType.Keyword, ['Local', 'Global', 'Dim', 'Static', 'Const'])) {
            const node = this.eatVarDeclaration();
            if (node) return node;
        }
        // VarAssignment or [var]FunctionCall
        else if (this.match(TokenType.Variable)) {
            const node = this.eatMaybeVarAssignment();
            if (node) return node;
        }
        // FunctionDeclaration
        else if (!oneline && this.match(TokenType.Keyword, 'Func')) {
            if (blockType != BlockType.Program) {
                throw new Error('Cannot declare a function inside another function');
            }

            this.advance(1);

            const expected = this.parsing('function declaration').expected;

            const name = this.eat(TokenType.Identifier)
                || expected('Identifier');

            this.eat(TokenType.Bracket, '(')
                || expected('Bracket', '(');
            const params = this.eatParameters();
            this.eat(TokenType.EOL)
                || expected('EOL');

            const body = this.eatBlock(BlockType.Func);

            this.eat(TokenType.Keyword, 'EndFunc');
            this.eat(TokenType.EOL)
                || expected(TokenType.EOL);

            const node: TypedNode<NodeType.FunctionDeclaration> = {
                type: NodeType.FunctionDeclaration,
                name: name.value,
                parameters: params,
                body
            };

            return node;
        }
        // Return
        else if (this.eat(TokenType.Keyword, 'Return')) {
            const value = this.eatExpression() ?? undefined;

            return {
                type: NodeType.Return,
                value
            } as AstNode;
        }
        // Exit
        else if (this.eat(TokenType.Keyword, 'Exit')) {
            const code = this.eatExpression() ?? undefined;

            return {
                type: NodeType.Exit,
                code
            } as AstNode;
        }
        // WhileStatement
        else if (!oneline && this.eat(TokenType.Keyword, 'While')) {
            const expected = this.parsing('while statement').expected;

            const test = this.eatExpression()
                || expected('condition');

            this.eat(TokenType.EOL)
                || expected(TokenType.EOL);

            const body = this.eatBlock(BlockType.While);

            this.eat(TokenType.Keyword);

            const node: AstNode = {
                type: NodeType.WhileStatement,
                test,
                body
            };

            return node;
        }
        // DoUntilStatement
        else if (!oneline && this.eat(TokenType.Keyword, 'Do')) {
            const expected = this.parsing('do..until statement').expected;

            this.eat(TokenType.EOL)
                || expected(TokenType.EOL);

            const body = this.eatBlock(BlockType.Do);

            this.eat(TokenType.Keyword);

            const test = this.eatExpression()
                || expected('condition');

            this.match(TokenType.EOL)
                || expected(TokenType.EOL);

            const node: AstNode = {
                type: NodeType.DoUntilStatement,
                test,
                body
            };

            return node;
        }
        // ForToStatement / ForInStatement
        else if (!oneline && this.eat(TokenType.Keyword, 'For')) {
            const expected = this.parsing('for loop statement').expected;

            const variable = this.eat(TokenType.Variable)
                || expected('variable');

            let node: AstNode;

            if (this.eat(TokenType.Keyword, 'In')) {
                const array = this.eatExpression()
                    || expected('For..In target');

                node = {
                    type: NodeType.ForInStatement,
                    variable: variable.value as string,
                    array,
                    body: { type: NodeType.BlockStatement, body: [] }
                };
            }
            else if (this.eat(TokenType.Operator, '=')) {
                const start = this.eatExpression()
                    || expected('For..To start value');

                this.eat(TokenType.Keyword, 'To')
                    || expected(TokenType.Keyword, 'To');

                const stop = this.eatExpression()
                    || expected('For..To stop value');

                let step: AstNode | undefined = undefined;
                if (this.eat(TokenType.Keyword, 'Step')) {
                    step = this.eatExpression()
                        || expected('For..To step value');
                }

                node = {
                    type: NodeType.ForToStatement,
                    variable: variable.value as string,
                    start,
                    stop,
                    step,
                    body: { type: NodeType.BlockStatement, body: [] }
                };
            }
            else {
                expected.not();
                return null;
            }

            this.eat(TokenType.EOL)
                || expected(TokenType.EOL);

            node.body = this.eatBlock(BlockType.For);

            this.eat(TokenType.Keyword);

            return node;
        }
        // IfStatement
        else if (!oneline && this.eat(TokenType.Keyword, 'If')) {
            const expected = this.parsing('if statement').expected;

            const test = this.eatExpression()
                || expected('condition');

            this.eat(TokenType.Keyword, 'Then')
                || expected(TokenType.Keyword, 'Then');


            let oneline = false;
            let body: AstNode;

            if (this.eat(TokenType.EOL)) {
                body = this.eatBlock(BlockType.If);
            }
            else {
                oneline = true;
                body = this.eatStatement(BlockType.If, { oneline: true })
                    || expected.not();

                return {
                    type: NodeType.IfStatement,
                    test,
                    body,
                    elseBody: undefined
                } as AstNode;
            }


            const node: AstNode = {
                type: NodeType.IfStatement,
                oneline,
                test,
                body,
                elseBody: undefined
            };

            let current = node;

            while (true) {
                const keyword = this.eat(TokenType.Keyword)!;

                if (keyword.value == 'EndIf') {
                    this.match(TokenType.EOL)
                        || expected(TokenType.EOL)
                    break;
                }
                else if (keyword.value == 'Else') {
                    this.eat(TokenType.EOL)
                        || expected.not();

                    current.elseBody = this.eatBlock(BlockType.Else);

                    this.eat(TokenType.Keyword, 'EndIf');
                    this.eat(TokenType.EOL)
                        || expected(TokenType.EOL);

                    break;
                }
                else if (keyword.value == 'ElseIf') {
                    const elseCondition = this.eatExpression()
                        || expected('condition');

                    this.eat(TokenType.Keyword, 'Then')
                        || expected(TokenType.Keyword, 'Then');

                    this.eat(TokenType.EOL)
                        || expected(TokenType.EOL);

                    current.elseBody = {
                        type: NodeType.IfStatement,
                        oneline: false,
                        test: elseCondition,
                        body: this.eatBlock(BlockType.ElseIf),
                        elseBody: undefined
                    };

                    current = current.elseBody;
                }

            }

            return node;
        }
        // SwitchStatement
        else if (!oneline && this.eat(TokenType.Keyword, 'Switch')) {
            const expected = this.parsing('switch statement').expected;

            const target = this.eatExpression()
                || expected.not();

            this.eat(TokenType.EOL)
                || expected(TokenType.EOL);

            this.eatWhile(TokenType.EOL);


            let cases: AstNode[] = [];

            while (this.eat(TokenType.Keyword, 'Case')) {
                const value = this.eatExpression()
                    || expected.not();

                this.eat(TokenType.EOL)
                    || expected(TokenType.EOL);

                const body = this.eatBlock(BlockType.SwitchCase);

                cases.push({
                    type: NodeType.SwitchCase,
                    value,
                    body
                });
            }

            this.eat(TokenType.Keyword)
                || expected('closing keyword');

            const node: AstNode = {
                type: NodeType.SwitchStatement,
                target,
                cases
            };

            return node;
        }
        // ExitLoop
        else if (this.eat(TokenType.Keyword, 'ExitLoop')) {
            const levels = this.eatExpression() ?? undefined;

            this.match(TokenType.EOL)
                || this.expected(TokenType.EOL);

            return {
                type: NodeType.ExitLoop,
                levels
            } as AstNode;
        }
        // Directive
        else if (!oneline && this.match(TokenType.Directive)) {
            const directive = this.eat(TokenType.Directive) as Token<TokenType.Directive>;

            const name = directive.value!.split(' ', 1)[0].toLowerCase();

            if (name == 'js') {
                return {
                    type: NodeType.JsDirective,
                    code: directive.value!.slice(2).trim()
                };
            }
            else if (name == 'include') {
                return {
                    type: NodeType.ExpressionStatement,
                    expression: {
                        type: NodeType.FunctionCall,
                        target: { type: NodeType.Identifier, name: 'include' },
                        arguments: [
                            {
                                type: NodeType.PrimitiveValue,
                                kind: 'string',
                                value: `'${directive.value!.split(' ')[1]}'`
                            }
                        ]
                    }
                };
            }
        }
        // ExpressionStatement
        else {
            const expression = this.eatExpression();

            if (expression) {
                const node: TypedNode<NodeType.ExpressionStatement> = {
                    type: NodeType.ExpressionStatement,
                    expression
                };

                return node;
            }
        }

        return null;
    }

    private eatExpression({ assignTarget = false } = { }): AstNode | null {
        let expression: AstNode;
        let token: Token | null;

        let unaryOperator: string | null = null;

        if (this.eat(TokenType.Keyword, 'Not')) {
            unaryOperator = 'Not';
        }
        else if (this.eat(TokenType.Operator, '+')) {
            unaryOperator = '+';
        }
        else if (this.eat(TokenType.Operator, '-')) {
            unaryOperator = '-';
        }

        if (token = this.eat(TokenType.Number)) {
            expression = {
                type: NodeType.PrimitiveValue,
                kind: 'number',
                value: token.value
            };
        }
        else if (token = this.eat(TokenType.String)) {
            expression = {
                type: NodeType.PrimitiveValue,
                kind: 'string',
                value: token.value
            };
        }
        else if ((token = this.eat(TokenType.Keyword, 'True')) || (token = this.eat(TokenType.Keyword, 'False'))) {
            expression = {
                type: NodeType.PrimitiveValue,
                kind: 'bool',
                value: token.value.toLowerCase()
            };
        }
        else if (token = this.eat(TokenType.Keyword, 'Null')) {
            expression = {
                type: NodeType.PrimitiveValue,
                kind: 'null',
                value: 'null'
            };
        }
        else if (token = this.eat(TokenType.Keyword, 'Default')) {
            expression = {
                type: NodeType.PrimitiveValue,
                kind: 'default',
                value: 'default'
            };
        }
        else if (token = this.eat(TokenType.Variable)) {
            expression = {
                type: NodeType.VarReference,
                name: token.value
            };
        }
        else if (token = this.eat(TokenType.Macro)) {
            expression = {
                type: NodeType.MacroCall,
                name: token.value
            };
        }
        else if (token = this.eat(TokenType.Identifier)) {
            expression = {
                type: NodeType.Identifier,
                name: token.value
            };
        }
        else return null;

        while (!this.match(TokenType.EOL)) {
            // $a[x][y], a()[x][y]
            if ((expression.type == NodeType.VarReference || expression.type == NodeType.FunctionCall) && this.match(TokenType.Bracket, '[')) {
                const subscripts = this.eatSubscripts();
                expression = {
                    type: NodeType.SubscriptExpression,
                    target: expression,
                    subscripts
                } as TypedNode<NodeType.SubscriptExpression>;
            }

            // $a(x, y), a(x, y), $a[0](x, y)
            else if (
                (
                    (expression as any).type == NodeType.Identifier
                    || (expression as any).type == NodeType.VarReference
                    || expression.type == NodeType.SubscriptExpression
                )
                && this.match(TokenType.Bracket, '(')
            ) {

                const args = this.eatArguments();

                expression = {
                    type: NodeType.FunctionCall,
                    target: expression,
                    arguments: args
                } as TypedNode<NodeType.FunctionCall>;
            }
            else {
                break;
            }
        }


        const isLogicalOp = this.match(TokenType.Keyword, ['Or', 'And']);

        const isValidOperator = isLogicalOp
            || 
            (
                assignTarget
                ? this.match(TokenType.Operator)
                    && !this.match(TokenType.Operator, ['=', '+=', '-=', '*=', '/=', '&='])
                : this.match(TokenType.Operator)
            );

        if (isValidOperator) {
            const operator = this.tok.value;
            this.advance(1);

            const right = this.eatExpression();
            if (!right) {
                this.error('Unexpected error parsing right side of binary expression');
            }

            expression = {
                type: NodeType.BinaryExpression,
                operator,
                left: expression,
                right
            } as TypedNode<NodeType.BinaryExpression>;
        }

        if (unaryOperator) {
            expression = {
                type: NodeType.UnaryExpression,
                operator: unaryOperator,
                argument: expression
            };
        }

        return expression;
    }

    private eatSubscripts(): AstNode[] {
        const expected = this.parsing('subscript').expected;

        const subscripts: AstNode[] = [];

        while (!this.eat(TokenType.EOL)) {
            this.eat(TokenType.Bracket, '[')
                || expected(TokenType.Bracket, '[');

            const subscript = this.eatExpression()
                || expected('Expression');

            this.eat(TokenType.Bracket, ']')
                || expected(TokenType.Bracket, ']');

            subscripts.push(subscript);

            if (!this.match(TokenType.Bracket, '[')) {
                break;
            }
        }

        return subscripts;
    }

    private eatSubscriptsEmptyAllowed(): (AstNode | undefined)[] {
        const expected = this.parsing('subscript').expected;

        const subscripts: (AstNode | undefined)[] = [];

        while (!this.match(TokenType.EOL)) {
            this.eat(TokenType.Bracket, '[')
                || expected(TokenType.Bracket, '[');

            const subscript = this.eatExpression() ?? undefined;

            this.eat(TokenType.Bracket, ']')
                || expected.many([TokenType.Bracket, ']'], 'subscript value');

            subscripts.push(subscript);

            if (!this.match(TokenType.Bracket, '[')) {
                break;
            }
        }

        return subscripts;
    }

    private eatVarDeclaration(): TypedNode<NodeType.VarDeclaration> | null {
        if (!this.match(TokenType.Keyword, ['Local', 'Global', 'Dim', 'Static', 'Const'])) {
            return null;
        }

        const expected = this.parsing('var declaration').expected;

        let isStatic = false;
        let isConst = false;
        let scope: 'local' | 'global' | 'dim' | undefined = undefined;

        if (this.match(TokenType.Keyword, ['Local', 'Global', 'Dim'])) {
            scope = this.tok.value.toLowerCase();
            this.advance(1);
        }

        if (this.eat(TokenType.Keyword, 'Static')) {
            isStatic = true;
        }
        else if (this.eat(TokenType.Keyword, 'Const')) {
            isConst = true;
        }

        if (!scope && this.match(TokenType.Keyword, ['Local', 'Global', 'Dim'])) {
            scope = this.tok.value.toLowerCase(); 
            this.advance(1);
        }

        const node: AstNode = {
            type: NodeType.VarDeclaration,
            isStatic,
            isConst,
            scope: scope ?? 'dim',
            declarations: []
        };

        do {
            const variable = this.eat(TokenType.Variable)
                || expected('a variable declaration');

            const declaration: VarDeclaration = {
                name: variable.value
            };

            if (this.match(TokenType.Bracket, '[')) {
                const subscripts = this.eatSubscriptsEmptyAllowed();
                declaration.subscripts = subscripts;
            }

            if (this.eat(TokenType.Operator, '=')) {
                let expr: AstNode;

                if (this.match(TokenType.Bracket, '[')) {
                    expr = this.eatArrayInitializer();
                }
                else {
                    expr = this.eatExpression()
                    || expected('a variable initializer');
                }

                declaration.value = expr;
            }

            if (!this.match(TokenType.Comma) && !this.match(TokenType.EOL)) {
                expected.not();
            }

            node.declarations.push(declaration);
        } while(!this.match(TokenType.EOL) && this.eat(TokenType.Comma));

        return node;
    }

    private eatMaybeVarAssignment(): AstNode | null {
        if (!this.match(TokenType.Variable)) {
            return null;
        }

        const expected = this.parsing('variable assignment').expected;

        const variable = this.eatExpression({ assignTarget: true })
            || expected.not();

        // const variable = this.eat(TokenType.Variable)!;

        // let target: AstNode = {
        //     type: NodeType.VarReference,
        //     name: variable.value
        // };

        // if (this.match(TokenType.Bracket, '[')) {
        //     const subscripts = this.eatSubscripts();

        //     target = {
        //         type: NodeType.SubscriptExpression,
        //         target,
        //         subscripts
        //     };
        // }

        if (this.match(TokenType.Operator, ['=', '+=', '-=', '*=', '/=', '&='])) {
            const kind = this.eat(TokenType.Operator)!.value;

            const value = this.eatExpression()
                || expected('Expression');

            return {
                type: NodeType.VarAssignment,
                target: variable,
                kind,
                value
            };
        }
        // else if (this.match(TokenType.Bracket, '(')) {
        //     const args = this.eatArguments();

        //     let target: AstNode =  {
        //         type: NodeType.VarReference,
        //         name: variable.value
        //     };

        //     if (subscripts.length > 0) {
        //         target = {
        //             type: NodeType.SubscriptExpression,
        //             target,
        //             subscripts
        //         } as TypedNode<NodeType.SubscriptExpression>;
        //     }

        //     const node: TypedNode<NodeType.FunctionCall> = {
        //         type: NodeType.FunctionCall,
        //         arguments: args,
        //         target
        //     };

        //     this.eat(TokenType.EOL)
        //         || expected('EOL');

        //     return node;
        // }
        else {
            return {
                type: NodeType.ExpressionStatement,
                expression: variable
            };
        }
    }

    private eatArrayInitializer(): TypedNode<NodeType.ArrayInitializer> {
        const expected = this.parsing('an array initializer').expected;

        this.eat(TokenType.Bracket, '[')
            || expected(TokenType.Bracket);

        const array: AstNode[] = [];

        while (true) {
            if (this.match(TokenType.Bracket, '[')) {
                const element = this.eatArrayInitializer();
                array.push(element);
            }
            else if (this.eat(TokenType.Bracket, ']')) {
                break;
            }
            else {
                const element = this.eatExpression()
                    || expected.not();

                array.push(element);
            }

            if (this.match(TokenType.Comma) && !this.peek(TokenType.Bracket, ']')) {
                this.eat(TokenType.Comma);
                continue;
            }
            else if (this.eat(TokenType.Bracket, ']')) break;
            else expected.not();
        }

        return {
            type: NodeType.ArrayInitializer,
            array
        };
    }

    private eatArguments(): AstNode[] {
        const args: AstNode[] = [];

        const expected = this.parsing('arguments').expected;

        this.eat(TokenType.Bracket, '(')
            || expected(TokenType.Bracket, '(');

        while (!this.match(TokenType.Bracket, ')')) {
            const arg = this.eatExpression()
                || expected('Expression');

            args.push(arg);

            if (!this.eat(TokenType.Comma)) {
                break;
            }
        }

        this.eat(TokenType.Bracket, ')')
            || expected('Bracket', ')');

        return args;
    }

    private eatParameters(): TypedNode<NodeType.Parameter>[] {
        const params: TypedNode<NodeType.Parameter>[] = [];

        while (!this.match(TokenType.Bracket, ')')) {
            const constant = this.eat(TokenType.Keyword, 'Const');
            const byRef = this.eat(TokenType.Keyword, 'ByRef');

            const param = this.eat(TokenType.Variable)
                || this.parsing('parameters').expected('parameter name');

            const node = {
                type: NodeType.Parameter,
                name: param.value,
                isByRef: !!byRef,
                isConst: !!constant,
                defaultValue: undefined
            } as TypedNode<NodeType.Parameter>;

            if (this.eat(TokenType.Operator, '=')) {
                const defaultValue = this.eatExpression()
                    || this.parsing('parameter default value').expected('Expression');
                node.defaultValue = defaultValue;
            }

            params.push(node);

            if (!this.eat(TokenType.Comma)) {
                break;
            }
        }

        this.eat(TokenType.Bracket, ')')
            || this.parsing('parameters').expected('Bracket', ')');

        return params;
    }

    private eatBlock(blockType: BlockType): AstNode {
        const statements: AstNode[] = [];
        //TODO: refactor to closings array or Map<BlockType, Set<string>>
        const closing = (
            blockType == BlockType.If ? 'EndIf' :
            blockType == BlockType.ElseIf ? 'EndIf' :
            blockType == BlockType.Else ? 'EndIf' :
            blockType == BlockType.Func ? 'EndFunc' :
            blockType == BlockType.While ? 'WEnd' :
            blockType == BlockType.Do ? 'Until' :
            blockType == BlockType.For ? 'Next' :
            blockType == BlockType.Switch ? 'EndSwitch' :
            blockType == BlockType.SwitchCase ? 'EndSwitch' :
            blockType == BlockType.Select ? 'EndSelect' :
            blockType == BlockType.SelectCase ? 'EndSelect' :
            undefined
        );
        const alternatives = (
            blockType == BlockType.If ? ['ElseIf', 'Else'] :
            blockType == BlockType.ElseIf ? ['ElseIf', 'Else'] :
            blockType == BlockType.SwitchCase ? ['Case'] :
            blockType == BlockType.SelectCase ? ['Case'] :
            []
        );

        while (!this.match(TokenType.Keyword, closing) && !this.match(TokenType.Keyword, alternatives)) {
            if (this.eos) {
                this.parsing('block').expected(TokenType.Keyword, closing);
            }
            else {
                const statement = this.eatStatement(blockType);
                if (statement) {
                    statements.push(statement);
                }
            }

            this.eat(TokenType.EOL)
                || this.expected('EOL in ' + BlockType[blockType]);
        }

        this.match(TokenType.Keyword, closing)
            || (alternatives.length && this.match(TokenType.Keyword, alternatives[0]))
            || (alternatives.length > 1 && this.match(TokenType.Keyword, alternatives[1]))
            || this.parsing('block').expected(TokenType.Keyword, closing);

        return {
            type: NodeType.BlockStatement,
            body: statements
        };
    }

    private error(msg: string): never {
        throw new SyntaxError(msg);
    }

    private append(node: AstNode) {
        (this.tree.type == NodeType.Program) && this.tree.children.push(node);
    }
}
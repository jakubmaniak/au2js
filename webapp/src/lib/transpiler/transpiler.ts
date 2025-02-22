import { AstNode, TypedNode } from '../types/ast-node';
import { BlockType } from '../types/block-type';
import { NodeType } from '../types/node-type';
import { Scope } from './scope';


const macros = new Set([
    'AUTOITVERSION', 'COMPILED', 'CR', 'CRLF', 'ERROR', 'EXITCODE', 'EXTENDED', 'HOUR', 'LF',
    'MDAY', 'MIN', 'MON', 'MSEC', 'OSLANG', 'SEC', 'SW_SHOW', 'TAB', 'WDAY', 'YDAY', 'YEAR'
]);

const builtin = new Set([
    'Abs', 'ACos', 'Asc', 'AscW', 'ASin', 'ATan', 'AdlibRegister', 'AdlibUnregister', 'Asc', 'AscW', 'AutoItSetOption',
    'Binary', 'BinaryToString', 'BitAND', 'BitNOT', 'BitOR', 'BitRotate', 'BitShift', 'BitXOR',
    'Ceiling', 'Chr', 'ChrW', 'ConsoleRead', 'ConsoleWrite', 'Cos',
    'Dec', 'DllCall', 'DllClose', 'DllOpen',
    'Exp',
    'Floor', 'FuncName',
    'GUICreate', 'GUIGetMsg', 'GUISetState',
    'GUICtrlCreateButton', 'GUICtrlCreateInput', 'GUICtrlCreatePic',
    'GUICtrlRead', 'GUICtrlSetData',
    'Hex', 'HotKeySet',
    'Include', 'InputBox', 'Int',
    'Log',
    'MapAppend', 'MapExists', 'MapKeys', 'MapRemove',
    'Mod', 'MouseClick', 'MouseDown', 'MouseGetCursor', 'MouseGetPos', 'MouseMove', 'MouseUp', 'MsgBox',
    'Number',
    'ObjCreate', 'Opt',
    'ProcessClose', 'ProcessExists', 'ProcessGetStats', 'ProcessSetPriority', 'ProcessList',
    'ProcessWait', 'ProcessWaitClose',
    'Random', 'Round', 'Run', 'RunWait', 'RunAs', 'RunAsWait',
    'Send', 'SendKeepActive', 'SetError', 'SetExitCode', 'SetExtended',
    'ShellExecute', 'ShellExecuteWait', 'Sin', 'Sleep', 'SRandom',
    'String', 'StringAddCR', 'StringCompare', 'StringInStr', 'StringFormat', 'StringLeft',
    'StringLen', 'StringLower', 'StringMid', 'StringRegExp', 'StringRegExpReplace',
    'StringReplace', 'StringReverse', 'StringRight', 'StringSplit', 'StringToBinary',
    'StringTrimLeft', 'StringTrimRight', 'StringUpper',
    'Sqrt',
    'Tan', 'TimerInit', 'TimerDiff',
    'UBound',
    'VarGetType'
]);
const builtinMap = new Map([...builtin].map((kwd) => [kwd.toLowerCase(), kwd]));
const usedBuiltins = new Set<string>();

export class Transpiler {
    private lines: string[] = ['const au3 = require("au3");'];
    private scope = new Scope(BlockType.Program);

    private constructor(private tree: AstNode) { }

    private run(): string {
        if (this.tree.type != NodeType.Program) return '';

        let i = 0;
        for (const stmt of this.tree.children) {
            this.lines.push(this.statement(stmt));

            if (i > 0
                && this.tree.children[i - 1].type == NodeType.FunctionDeclaration
                && stmt.type != NodeType.FunctionDeclaration
            ) {
                this.lines[this.lines.length - 1] = '\n' + this.lines[this.lines.length - 1];
            }

            i++;
        }

        return this.lines.join('\n');
    }

    private enterScope(type: BlockType) {
        const outer = this.scope;
        const inner = new Scope(type);

        outer.enter(inner);
        this.scope = inner;

        // console.log(outer.level + ' -> ' + this.scope.level);
    }

    private leaveScope() {
        const outer = this.scope.parent;
        if (outer == undefined) return;

        // const inner = this.scope;

        this.scope.leave();
        this.scope = outer;

        // console.log(inner.level + ' -> ' + this.scope.level);
    }

    private indent(code: string, level = 1) {
        const spaces = new Array(level).fill('    ').join('');
        return code
            .split('\n')
            .map((line) => spaces + line)
            .join('\n');
    }

    private levelIndent() {
        return new Array(this.scope.level).fill('    ').join('');
    }

    private statement(stmt: AstNode, { inline = false } = { }) {
        let line = '';

        if (stmt.type == NodeType.ExpressionStatement) {
            line = this.expression(stmt.expression) + ';';
        }
        else if (stmt.type == NodeType.Exit) {
            line = this.exit(stmt);
        }
        else if (stmt.type == NodeType.VarDeclaration) {
            line = this.varDeclaration(stmt);
        }
        else if (stmt.type == NodeType.VarAssignment) {
            line = this.varAssignment(stmt);
        }
        else if (stmt.type == NodeType.FunctionDeclaration) {
            line = this.funcDeclaration(stmt);
        }
        else if (stmt.type == NodeType.Return) {
            line = this.return(stmt);
        }
        else if (stmt.type == NodeType.WhileStatement) {
            line = this.whileStatement(stmt);
        }
        else if (stmt.type == NodeType.DoUntilStatement) {
            line = this.doUntilStatement(stmt);
        }
        else if (stmt.type == NodeType.ForToStatement) {
            line = this.forToStatement(stmt);
        }
        else if (stmt.type == NodeType.ForInStatement) {
            line = this.forInStatement(stmt);
        }
        else if (stmt.type == NodeType.ExitLoop) {
            line = this.exitLoop(stmt);
        }
        else if (stmt.type == NodeType.IfStatement) {
            line = this.ifStatement(stmt);
        }
        else if (stmt.type == NodeType.SwitchStatement) {
            line = this.switchStatement(stmt);
        }
        else if (stmt.type == NodeType.JsDirective) {
            line = this.jsDirective(stmt);
        }

        if (this.scope.level == 0 || inline) {
            return line;
        }
        return this.indent(line);
    }

    private exit(node: TypedNode<NodeType.Exit>) {
        if (!node.code) return 'process.exit();';
        return 'process.exit(' + this.expression(node.code) + ');';
        // if (!node.code) return 'au3.Exit();';
        // return 'au3.Exit(' + this.expression(node.code) + ');';
    }

    private varDeclaration(node: TypedNode<NodeType.VarDeclaration>) {
        if (node.isStatic) {
            const funcScope = this.scope.findAncestor(BlockType.Func, { includeSelf: true });
            if (!funcScope) {
                throw new Error('Cannot declare a static variable outside a function');
            }

            for (const decl of node.declarations) {
                funcScope.statics.add(decl.name);
            }
        }

        let code = (
            node.isConst ? 'const ' :
            node.isStatic ? 'static_.' :
            'let '
        );

        for (let i = 0; i < node.declarations.length; i++) {
            const decl = node.declarations[i];

            let variable = '$' + decl.name.toLowerCase();

            if (i == 0) code += variable;
            else code += ', ' + variable;

            if (decl.subscripts) {
                const params: string[] = [];

                if (decl.value) {
                    params.push(this.expression(decl.value));
                }

                const dims = '[' + decl.subscripts.map((s) => {
                    if (s) return this.expression(s);
                    else return 'undefined';
                }).join(', ') + ']';

                params.push(dims);

                code += ' = au3.Array(' + params.join(', ') + ')';
            }
            else if (decl.value) {
                code += ' = ' + this.expression(decl.value);
            }
        }

        return code + ';';
    }

    private varAssignment(node: TypedNode<NodeType.VarAssignment>) {
        const variable = this.expression(node.target);

        let code = variable;
        code += ' ' + node.kind + ' ';
        code += this.expression(node.value);

        return code + ';';
    }

    private expression(node: AstNode): string {
        if (node.type == NodeType.PrimitiveValue) {
            return node.value;
        }
        else if (node.type == NodeType.Identifier) {
            const name = node.name.toLowerCase();

            if (builtinMap.has(name)) {
                usedBuiltins.add(name);
                return 'au3.' + builtinMap.get(name)!;
            }
            else return name + '_fn';
        }
        else if (node.type == NodeType.VarReference) {
            const funcScope = this.scope.findAncestor(BlockType.Func, { includeSelf: true });
            if (funcScope && funcScope.statics.has(node.name)) {
                return 'static_.$' + node.name.toLowerCase();
            }
            return '$' + node.name.toLowerCase();
        }
        else if (node.type == NodeType.MacroCall) {
            const name = node.name.toUpperCase();
            if (!macros.has(name)) {
                throw new SyntaxError('Unknown macro');
            }
            return 'au3.' + name;
        }
        else if (node.type == NodeType.UnaryExpression) {
            let argument = this.expression(node.argument);

            const op = (
                node.operator == 'Not' ? '!'
                : node.operator
            );

            return op + argument;
        }
        else if (node.type == NodeType.BinaryExpression) {
            let left = this.expression(node.left);
            let right = this.expression(node.right);

            if (node.operator == '+') {
                if (node.left.type != NodeType.PrimitiveValue || node.left.kind != 'number') {
                    left = '+' + left;
                }
                if (node.right.type != NodeType.PrimitiveValue || node.right.kind != 'number') {
                    right = '+' + right;
                }
            }

            const anyString = (
                (node.left.type == NodeType.PrimitiveValue && node.left.kind == 'string')
                || 
                (node.right.type == NodeType.PrimitiveValue && node.right.kind == 'string')
            );

            return left
                + ' ' + (
                    node.operator == '&' ? (anyString ? '+' : "+''+")
                    : node.operator == '=' ? '=='
                    : node.operator == 'And' ? '&&'
                    : node.operator == 'Or' ? '||'
                    : node.operator
                ) + ' '
                + right;
        }
        else if (node.type == NodeType.FunctionCall) {
            const args = node.arguments.map((arg) => this.expression(arg)).join(', ');
            return this.expression(node.target) + '(' + args + ')';
        }
        else if (node.type == NodeType.ArrayInitializer) {
            return '[' + node.array.map((n) => this.expression(n)).join(', ') + ']';
        }
        else if (node.type == NodeType.SubscriptExpression) {
            return this.expression(node.target)
                + node.subscripts.map((s) => '[' + this.expression(s) + ']').join('');
        }

        return '{UNKNOWN_EXPR}';
    }

    private blockStatement(node: TypedNode<NodeType.BlockStatement>) {
        let code = '';

        for (const stmt of node.body) {
            code += this.statement(stmt) + '\n';
        }

        return code;
    }

    private funcDeclaration(node: TypedNode<NodeType.FunctionDeclaration>) {
        const functionName = node.name.toLowerCase() + '_fn';
        let code = '\nfunction ' + functionName + '(';
        code += node.parameters
            .map((p) => this.parameter(p))
            .join(', ');

        code += ') {\n';
        code += '    const static_ = (' + functionName + '.static ??= {});\n';

        this.enterScope(BlockType.Func);
        code += this.blockStatement(node.body as TypedNode<NodeType.BlockStatement>);
        this.leaveScope();

        code += '}';

        return code;
    }

    private parameter(node: TypedNode<NodeType.Parameter>) {
        return '$' + node.name.toLowerCase()
            + (node.defaultValue ? ' = ' + this.expression(node.defaultValue) : '');
    }

    private return(node: TypedNode<NodeType.Return>) {
        if (!node.value) return 'return;';
        return 'return ' + this.expression(node.value) + ';';
    }

    private whileStatement(node: TypedNode<NodeType.WhileStatement>) {
        let code = 'while (';

        code += this.expression(node.test) + ') {\n';

        this.enterScope(BlockType.While);
        code += this.blockStatement(node.body as TypedNode<NodeType.BlockStatement>);
        this.leaveScope();

        code += '}';

        return code;
    }

    private doUntilStatement(node: TypedNode<NodeType.DoUntilStatement>) {
        let code = 'do {\n';

        this.enterScope(BlockType.Do);
        code += this.blockStatement(node.body as TypedNode<NodeType.BlockStatement>);
        this.leaveScope();

        code += '} while (' + this.expression(node.test) + ');';

        return code;
    }

    private forToStatement(node: TypedNode<NodeType.ForToStatement>) {
        let code = 'for (';

        const variable = '$' + node.variable.toLowerCase();
        const step = node.step ? (' += ' + this.expression(node.step)) : '++';

        code += `let ${variable} = ${this.expression(node.start)}; `;

        let condition = `${variable} <= ${this.expression(node.stop)}`;
        if (node.step != undefined
            && +this.expression(node.step) < 0
        ) {
            condition = `${variable} >= ${this.expression(node.stop)}`;
        }

        code += `${condition}; `;
        code += `${variable}${step}) {\n`;

        this.enterScope(BlockType.For);
        code += this.blockStatement(node.body as TypedNode<NodeType.BlockStatement>);
        this.leaveScope();

        code += '}';

        return code;
    }

    private forInStatement(node: TypedNode<NodeType.ForInStatement>) {
        let code = 'for (';

        const variable = '$' + node.variable.toLowerCase();

        code += `let ${variable} of ${this.expression(node.array)}) {\n`;

        this.enterScope(BlockType.For);
        code += this.blockStatement(node.body as TypedNode<NodeType.BlockStatement>);
        this.leaveScope();

        code += '}';

        return code;
    }

    private exitLoop(node: TypedNode<NodeType.ExitLoop>) {
        if (!node.levels) {
            return 'break;';
        }
        throw new Error('Not implemented');
        // return 'return ' + this.expression(node.value) + ';';
    }

    private ifStatement(node: TypedNode<NodeType.IfStatement>, elseif = false) {
        let code = 'if (';

        code += this.expression(node.test) + ') ';

        if (node.body.type == NodeType.BlockStatement) {
            code += '{\n';
            this.enterScope(elseif ? BlockType.ElseIf : BlockType.If);
            code += this.blockStatement(node.body);
            this.leaveScope();
            code += '}';
        }
        else {
            code += this.statement(node.body, { inline: true });
        }

        if (node.elseBody) {
            if (node.elseBody.type == NodeType.BlockStatement) {
                code += '\nelse {\n';
                this.enterScope(BlockType.Else);
                code += this.blockStatement(node.elseBody) + '}';
                this.leaveScope();
            }
            else if (node.elseBody.type == NodeType.IfStatement) {
                code += '\nelse ' + this.ifStatement(node.elseBody, true);
            }
        }

        return code;
    }

    private switchStatement(node: TypedNode<NodeType.SwitchStatement>) {
        let code = '\nswitch (';

        code += this.expression(node.target) + ') {\n';

        this.enterScope(BlockType.Switch);
        for (const switchCase of node.cases) {
            code += this.switchCase(switchCase as TypedNode<NodeType.SwitchCase>);
        }
        this.leaveScope();

        code += '\n}';

        return code;
    }

    private switchCase(node: TypedNode<NodeType.SwitchCase>) {
        let code = 'case ';
        code += this.expression(node.value) + ':\n';

        this.enterScope(BlockType.SwitchCase);
        code += this.blockStatement(node.body as TypedNode<NodeType.BlockStatement>);
        this.leaveScope();

        code += '    break;\n';

        return code;
    }

    private jsDirective(node: TypedNode<NodeType.JsDirective>) {
        return node.code;
    }

    static transpile(tree: AstNode) {
        return new Transpiler(tree).run();
    }
}
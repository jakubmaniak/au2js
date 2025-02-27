import { AstNode } from '../types/ast-node';
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
    'Ceiling', 'Chr', 'ChrW', 'ClipGet', 'ClipPut', 'ConsoleRead', 'ConsoleWrite', 'Cos',
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
    'Tan', 'TimerInit', 'TimerDiff', 'ToolTip',
    'UBound',
    'VarGetType',
    'WinClose', 'WinExists', 'WinWaitActive'
]);
const builtinMap = new Map([...builtin].map((kwd) => [kwd.toLowerCase(), kwd]));
const usedBuiltins = new Set<string>();

export class Transpiler {
    private segments: string[] = ['const au3 = require("au3");\n'];
    private scope = new Scope(BlockType.Program);

    private constructor(private tree: AstNode<NodeType.Program>) { }

    static transpile(tree: AstNode<NodeType.Program>) {
        return new Transpiler(tree).run();
    }

    private run(): string {
        if (this.tree.type != NodeType.Program) return '';

        let i = 0;
        for (const stmt of this.tree.children) {
            this.segments.push(this.statement(stmt));

            if (i > 0
                && this.tree.children[i - 1].type == NodeType.FunctionDeclaration
                && stmt.type != NodeType.FunctionDeclaration
            ) {
                this.segments[this.segments.length - 1] = '\n' + this.segments[this.segments.length - 1];
            }

            i++;
        }

        return this.segments.join('\n');
    }

    private enterScope(type: BlockType) {
        const outer = this.scope;
        const inner = new Scope(type);

        outer.enter(inner);
        this.scope = inner;

        return inner;

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

    private statement(stmt: AstNode, { inline = false } = { }) {
        let code = '';

        if (stmt.type == NodeType.ExpressionStatement) {
            code = this.expression(stmt.expression) + ';';
        }
        else if (stmt.type == NodeType.Exit) {
            code = this.exit(stmt);
        }
        else if (stmt.type == NodeType.VarDeclaration) {
            code = this.varDeclaration(stmt);
        }
        else if (stmt.type == NodeType.VarAssignment) {
            code = this.varAssignment(stmt);
        }
        else if (stmt.type == NodeType.FunctionDeclaration) {
            code = this.funcDeclaration(stmt);
        }
        else if (stmt.type == NodeType.Return) {
            code = this.return(stmt);
        }
        else if (stmt.type == NodeType.WhileStatement) {
            code = this.whileStatement(stmt);
        }
        else if (stmt.type == NodeType.DoUntilStatement) {
            code = this.doUntilStatement(stmt);
        }
        else if (stmt.type == NodeType.ForToStatement) {
            code = this.forToStatement(stmt);
        }
        else if (stmt.type == NodeType.ForInStatement) {
            code = this.forInStatement(stmt);
        }
        else if (stmt.type == NodeType.ExitLoop) {
            code = this.exitLoop(stmt);
        }
        else if (stmt.type == NodeType.ContinueLoop) {
            code = this.continueLoop(stmt);
        }
        else if (stmt.type == NodeType.IfStatement) {
            code = this.ifStatement(stmt);
        }
        else if (stmt.type == NodeType.SwitchStatement) {
            code = this.switchStatement(stmt);
        }
        else if (stmt.type == NodeType.JsDirective) {
            code = this.jsDirective(stmt);
        }

        if (this.scope.level == 0 || inline) {
            return code;
        }
        return this.indent(code);
    }

    private exit(node: AstNode<NodeType.Exit>) {
        if (!node.exitCode) return 'process.exit();';
        return 'process.exit(' + this.expression(node.exitCode) + ');';
        // if (!node.code) return 'au3.Exit();';
        // return 'au3.Exit(' + this.expression(node.code) + ');';
    }

    private varDeclaration(node: AstNode<NodeType.VarDeclaration>) {
        if (node.isStatic) {
            const funcScope = this.scope.ofType(BlockType.Func);
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

    private varAssignment(node: AstNode<NodeType.VarAssignment>) {
        const variable = this.expression(node.target);
        let operator: string = node.kind;

        if (operator == '&=') {
            operator = "+= ''+";
        }
        else if (operator == '+=') {
            operator = '= +(' + variable + ') +';
        }

        let code = variable + ' ' + operator + ' ';
        code += this.expression(node.value);

        return code + ';';
    }

    private expression(node: AstNode): string {
        if (node.type == NodeType.PrimitiveValue) {
            return (
                node.kind == 'default'
                ? 'au3.Default'
                : node.value
            );
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
            const funcScope = this.scope.ofType(BlockType.Func);
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
        else if (node.type == NodeType.Group) {
            return '(' + this.expression(node.expression) + ')';
        }
        else if (node.type == NodeType.UnaryExpression) {
            let argument = this.expression(node.argument);

            if (node.operator == 'Not') {
                return '!' + argument;
            }

            return node.operator + '(' + argument + ')';
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

            switch (node.operator) {
                case '&':
                    return `${left} ${anyString ? '+' : "+''+"} (${right})`;
                case '=':
                    return `au3.CompareCI(${left}, ${right})`;
                case 'Or':
                    return `au3.Or(${left}, ${right})`;
                case 'And':
                    return `au3.And(${left}, ${right})`;
                case '<>':
                    return `${left} != ${right}`;
                case '^':
                    return `${left} ** ${right}`;
                default:
                    return `${left} ${node.operator} ${right}`;
            }
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
        else if (node.type == NodeType.MemberExpression) {
            return this.expression(node.target) + '.' + node.property;
        }

        return '{UNKNOWN_EXPR}';
    }

    private blockStatement(node: AstNode<NodeType.BlockStatement>) {
        let code = '';

        for (const stmt of node.body) {
            code += this.statement(stmt) + '\n';
        }

        return code;
    }

    private funcDeclaration(node: AstNode<NodeType.FunctionDeclaration>) {
        const functionName = node.name.toLowerCase() + '_fn';

        let header = '\nfunction ' + functionName + '(';
        header += node.parameters
            .map((p) => this.parameter(p))
            .join(', ');
        header += ') {\n';

        let code = '';

        const scope = this.enterScope(BlockType.Func);
        code += this.blockStatement(node.body);

        if (scope.statics.size > 0) {
            header += '    const static_ = (' + functionName + '.static ??= {});\n';
        }
        this.leaveScope();

        code += '}';

        return header + code;
    }

    private parameter(node: AstNode<NodeType.Parameter>) {
        return '$' + node.name.toLowerCase()
            + (node.defaultValue ? ' = ' + this.expression(node.defaultValue) : '');
    }

    private return(node: AstNode<NodeType.Return>) {
        if (!node.value) return 'return;';
        return 'return ' + this.expression(node.value) + ';';
    }

    private whileStatement(node: AstNode<NodeType.WhileStatement>) {
        let code = 'while (';

        code += this.expression(node.test) + ') {\n';

        const scope = this.enterScope(BlockType.While);
        code += this.blockStatement(node.body);

        if (scope.requiresLabel) {
            code = scope.id + ':\n' + code;
        }
        this.leaveScope();


        code += '}';

        return code;
    }

    private doUntilStatement(node: AstNode<NodeType.DoUntilStatement>) {
        let code = 'do {\n';

        const scope = this.enterScope(BlockType.Do);
        code += this.blockStatement(node.body);

        if (scope.requiresLabel) {
            code = scope.id + ':\n' + code;
        }
        this.leaveScope();

        code += '} while (' + this.expression(node.test) + ');';

        return code;
    }

    private forToStatement(node: AstNode<NodeType.ForToStatement>) {
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

        const scope = this.enterScope(BlockType.For);
        code += this.blockStatement(node.body);

        if (scope.requiresLabel) {
            code = scope.id + ':\n' + code;
        }
        this.leaveScope();

        code += '}';

        return code;
    }

    private forInStatement(node: AstNode<NodeType.ForInStatement>) {
        let code = 'for (';

        const variable = '$' + node.variable.toLowerCase();

        code += `let ${variable} of ${this.expression(node.array)}) {\n`;

        const scope = this.enterScope(BlockType.For);
        code += this.blockStatement(node.body);

        if (scope.requiresLabel) {
            code = scope.id + ':\n' + code;
        }
        this.leaveScope();

        code += '}';

        return code;
    }

    private exitLoop(node: AstNode<NodeType.ExitLoop>) {
        if (node.levels) {
            throw new Error('ExitLoop <level> is not supported');
        }

        const loopScope = this.scope.ofType([BlockType.While, BlockType.Do, BlockType.For]);
        const caseScope = this.scope.ofType([BlockType.SwitchCase, BlockType.SelectCase]);

        if (!loopScope) {
            throw new SyntaxError('Illegal break statement');
        }

        if (!caseScope || loopScope.level > caseScope.level) {
            return `break;`;
        }
        else {
            loopScope.requiresLabel = true;
            return `break ${loopScope.id};`;
        }
    }

    private continueLoop(node: AstNode<NodeType.ContinueLoop>) {
        if (node.levels) {
            throw new Error('ContinueLoop <level> is not supported');
        }

        const loopScope = this.scope.ofType([BlockType.While, BlockType.Do, BlockType.For]);
        const caseScope = this.scope.ofType([BlockType.SwitchCase, BlockType.SelectCase]);

        if (!loopScope) {
            throw new SyntaxError('Illegal continue statement');
        }

        if (!caseScope || loopScope.level > caseScope.level) {
            return `continue;`;
        }
        else {
            loopScope.requiresLabel = true;
            return `continue ${loopScope.id};`;
        }
    }

    private ifStatement(node: AstNode<NodeType.IfStatement>, elseif = false) {
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

    private switchStatement(node: AstNode<NodeType.SwitchStatement>) {
        let code = 'switch (';

        code += this.expression(node.target) + ') {\n';

        this.enterScope(BlockType.Switch);
        for (const switchCase of node.cases) {
            code += this.switchCase(switchCase);
        }
        this.leaveScope();

        code += '\n}';

        return code;
    }

    private switchCase(node: AstNode<NodeType.SwitchCase>) {
        let code = 'case ';
        code += this.expression(node.value) + ': {\n';

        this.enterScope(BlockType.SwitchCase);
        code += this.blockStatement(node.body);
        this.leaveScope();

        code += '    break;\n}';

        return code;
    }

    private jsDirective(node: AstNode<NodeType.JsDirective>) {
        return node.code;
    }
}
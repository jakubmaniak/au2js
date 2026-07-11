import { history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting } from '@codemirror/language';
import { keymap, lineNumbers, placeholder } from '@codemirror/view';
import { EditorView } from 'codemirror';
import hljs from 'highlight.js';
import javascript from 'highlight.js/lib/languages/javascript';
import yml from 'highlight.js/lib/languages/yaml';
import JSON5 from 'json5';
import { sanitize } from 'lib/helpers/sanitize';
import YAML from 'yaml';
import { autoitLanguage } from './editor/language';
import { highlightStyle, theme } from './editor/theme';
import { state } from './state';


const output = document.querySelector('#output .content')!;
const debugOutput = document.querySelector('#debug-info .content')!;
const executeButton = document.querySelector('button#execute')!;
const copyButton = document.querySelector<HTMLButtonElement>('button#copy-code')!;
const debugTabs = document.querySelector('#debug-info .tabs')!;


type UIEvents = {
    onInput: (value: string) => void;
    onExecute: () => void;
};

let editorView: EditorView;

export function initUI(events: UIEvents) {
    hljs.configure({ classPrefix: 'token--' });
    hljs.registerLanguage('javascript', javascript);
    hljs.registerLanguage('yaml', yml);


    debugTabs.querySelectorAll('button')
        .forEach((tab) => {
            const tabElement = tab as HTMLElement;
            const tabId = tabElement.dataset.tabId!;

            tabElement.addEventListener('click', () => changeTab(tabId));
        });


    executeButton.addEventListener('click', () => events.onExecute());
    copyButton.addEventListener('click', copyCode);

    addEventListener('keyup', (ev) => {
        if (ev.code == 'Enter' && ev.ctrlKey) {
            ev.preventDefault();
            events.onExecute();
        }
    });


    editorView = new EditorView({
        parent: document.getElementById('source-editor')!,
        extensions: [
            lineNumbers(),
            autoitLanguage,
            theme,
            syntaxHighlighting(highlightStyle),
            history(),
            keymap.of([...historyKeymap, indentWithTab]),
            placeholder('Source code'),

            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    const value = update.state.doc.toString();
                    events.onInput(value);
                }
            })
        ],
    });


    return {
        output,
        debugOutput,
        editorView,

        setEditorContent,
        focusEditor,
        changeTab,
        updateOutput,
        updateDebugInfo,
        showError,
    };
}


function setEditorContent(value: string) {
    editorView.dispatch({
        changes: { from: 0, to: editorView.state.doc.length, insert: value }
    });
}


function focusEditor() {
    editorView.dispatch({
        selection: { anchor: editorView.state.doc.length }
    });
    editorView.focus();
}


function changeTab(tabId: string) {
    state.currentTab = tabId;

    debugTabs.querySelector('button.active')?.classList.remove('active');
    debugTabs.querySelector(`button[data-tab-id="${tabId}"]`)?.classList.add('active');

    updateDebugInfo();
}


function updateOutput() {
    const hl = hljs.highlight(state.code, { language: 'javascript', ignoreIllegals: true });
    output.innerHTML = hl.value;
}


function updateDebugInfo() {
    let html = '';

    const excludeSourceKey = (key: string, value: any) => (
        key == 'source' ? undefined : value
    );

    switch (state.currentTab) {
        case 'ast': {
            const yaml = YAML.stringify(state.ast, excludeSourceKey);
            const hl = hljs.highlight(yaml, { language: 'yaml', ignoreIllegals: true });
            html = hl.value;
            break;
        }
        case 'tokens': {
            const tokens = state.tokens
                .map((token) => {
                    const position = (
                        token.source
                        ? (token.source.line + ':' + token.source.column)
                        : ''
                    );
                    const type = (
                        (token.value !== undefined)
                        ? `${token.type.padEnd(10, ' ')} ${JSON5.stringify(token.value)}`
                        : token.type
                    );
                    return position.padEnd(5, ' ') + ' ' + type;
                })
                .join('\n');

            const hl = hljs.highlight(tokens, { language: 'javascript', ignoreIllegals: true });
            html = hl.value;
            break;
        }
        case 'console': {
            html = state.consoleOutput;
            break;
        }
    }

    debugOutput.innerHTML = html;
    debugOutput.classList.remove('error');
}


function showError(error: string) {
    debugOutput.innerHTML = sanitize(error);
    debugOutput.classList.add('error');
}


async function copyCode() {
    await navigator.clipboard.writeText(state.code);
    copyButton.innerText = 'Copied';

    setTimeout(() => {
        copyButton.innerText = 'Copy';
    }, 1500);
}
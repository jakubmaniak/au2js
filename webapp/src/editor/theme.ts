import { HighlightStyle } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';


export const theme = EditorView.theme({
    '&': {
        color: '#d0dade',
        backgroundColor: 'transparent',
        height: '100%',
        padding: '9px'
    },

    '.cm-content': {
        caretColor: '#ffffff',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '14px',
        lineHeight: '1.5',
        fontWeight: '500'
    },

    '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: '#ffffff'
    },

    '.cm-selectionBackground': {
        backgroundColor: '#264f78'
    },

    '&.cm-focused': {
        outline: 'none'
    },

    '&.cm-focused .cm-selectionBackground': {
        backgroundColor: '#264f78'
    },

    '.cm-activeLine': {
        backgroundColor: '#2a2d2e'
    },

    '.cm-gutters': {
        paddingRight: '9px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '14px',
        fontWeight: '500',
        lineHeight: '1.5',
        backgroundColor: 'transparent',
        color: '#505053',
        border: 'none'
    },

    '.cm-gutter': {
        minWidth: '28px',
    },

    '.cm-activeLineGutter': {
        backgroundColor: '#2a2d2e'
    },
}, { dark: true });


export const highlightStyle = HighlightStyle.define([
    { tag: tags.keyword, color: '#569cd6' },
    { tag: tags.string, color: '#ce9178' },
    { tag: tags.comment, color: '#6a9955' },
    { tag: tags.number, color: '#b5cea8' },
    { tag: tags.definition(tags.variableName), color: '#dcdcaa' },
    { tag: tags.variableName, color: '#9cdcfe' },
    { tag: tags.meta, color: '#c586c0' },
    { tag: tags.operator, color: '#d4d4d4' },
    { tag: tags.atom, color: '#4fc1ff' },
]);
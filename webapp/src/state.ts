import { Token } from 'lib/types/token';


export const state = {
    currentTab: 'ast',
    code: '',
    tokens: [] as Token[],
    ast: { },
    consoleOutput: '',
    error: null,
};
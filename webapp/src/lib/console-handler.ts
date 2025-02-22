import type au3 from './au3';


export class ConsoleHandler {
    private static injected = false;
    private static handlerCallback = (_data: any) => { };

    static injectTo(lib: typeof au3) {
        if (this.injected) return;

        const consoleWrite = lib.ConsoleWrite;

        lib.ConsoleWrite = (data: any) => {
            this.handlerCallback(data);
            consoleWrite(data);
        };

        this.injected = true;

        return Object.freeze(lib);
    }

    static setCallback(callback: (data: any) => void) {
        this.handlerCallback = callback;
    }
}
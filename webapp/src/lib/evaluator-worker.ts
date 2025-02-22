import au3 from './au3';
import { ConsoleHandler } from './console-handler';


const lib = ConsoleHandler.injectTo(au3);
ConsoleHandler.setCallback((data) => postMessage({ $console: data }));

addEventListener('message', (ev) => {
    const require = (_path: string) => lib;

    const t0 = performance.now();
    new Function('require', ev.data.code).call(null, require);
    const t = performance.now() - t0;

    postMessage({ $done: t });
});
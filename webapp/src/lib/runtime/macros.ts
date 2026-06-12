export const macros = {
    _var: {
        error: 0,
        extended: 0,
        exitCode: 0,
    },
    AUTOITVERSION: '3.3.16.1',
    COMPILED: 0,
    CR: '\r',
    CRLF: '\r\n',
    get ERROR() { return this._var.error; },
    get EXTENDED() { return this._var.extended; },
    get EXITCODE() { return this._var.exitCode; },
    get HOUR() { return new Date().getHours(); },
    LF: '\n',
    get MDAY() { return new Date().getDate(); },
    get MIN() { return new Date().getMinutes(); },
    get MON() { return new Date().getMonth() + 1; },
    get MSEC() { return new Date().getMilliseconds(); },
    get OSLANG() { return '0409'; },
    get SEC() { return new Date().getSeconds(); },
    SW_SHOW: 5,
    TAB: '\t',
    get WDAY() { return new Date().getDay() + 1; },
    get YDAY() {
        const d = new Date();
        return (d.getTime() - d.setMonth(0, 1)) / (24 * 3600 * 1000) + 1;
    },
    get YEAR() { return new Date().getFullYear(); },
};
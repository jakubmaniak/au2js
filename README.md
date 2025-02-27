<p align="center">
    <img src="webapp/public/favicon.png">
</p>
<h1 align="center">Au2Js – AutoIt3 to JavaScript Transpiler</h1>

<p align="center">
This project is a tool that translates AutoIt3 code into JavaScript.<br>
Beyond ordinary translation, the project aims to become a superset of AutoIt3 by leveraging the capabilities of Node.js and JavaScript. This allows for extended functionality while maintaining a high level of support for AutoIt3 syntax and features.
</p>

## Features
- Converts AutoIt3 scripts to JavaScript in real-time
- Built with TypeScript for type safety
- Uses Vite for rapid development
- Provides an AST and a lexer output preview

## Requirements
- Node.js version: 20.x or later
- TypeScript version: 5.7.x or later

## Installation
To set up the project locally, follow these steps:

```sh
# Clone the repository
git clone https://github.com/jakubmaniak/au2js

# Navigate to the project directory
cd au2js/webapp

# Install dependencies
npm install
```

## Usage
To start the development server, run:

```sh
npm run dev
```

Then, open your browser and go to http://localhost:5173 to use the converter.


## Example
Below is a simple example demonstrating how AutoIt3 code is converted into JavaScript using this tool:

### Source code:
```autoit
Const $PI = 3.14159265359

Local $angle = $PI/6, _
      $radius = 2

Local $point = Polar($angle, $radius)

ConsoleWrite("Angle = " & $angle & @CRLF);
ConsoleWrite("Radius = " & $angle & @CRLF);
ConsoleWrite("Point = (" & $point[0] & ", " & $point[1] & ")")

Func Polar($phi, $r)
    Local $aPoint = [$r * Cos($phi), $r * Sin($phi)]
    Return $aPoint
EndFunc
```

### Converted code:
```javascript
const au3 = require("au3");

const $pi = 3.14159265359;

let $angle = $pi / 6, $radius = 2;

let $point = polar_fn($angle, $radius);

au3.ConsoleWrite("Angle = " + $angle +''+ au3.CRLF);
au3.ConsoleWrite("Radius = " + $angle +''+ au3.CRLF);
au3.ConsoleWrite("Point = (" + $point[0] +''+ ", " + $point[1] + ")");

function polar_fn($phi, $r) {
    let $apoint = [$r * au3.Cos($phi), $r * au3.Sin($phi)];
    return $apoint;
}
```
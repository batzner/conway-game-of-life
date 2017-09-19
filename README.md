# Conway's Game of Life

**Showcase:** [mlowl.com/conway-game-of-life/](http://mlowl.com/conway-game-of-life/)

[![](https://raw.githubusercontent.com/batzner/conway-game-of-life/master/showcase.gif)](http://mlowl.com/conway-game-of-life/)

## Setup

**Open `index.html`,**

if you have a browser supporting ECMAScript 6 (Chrome 60+, Firefox 55+ or Safari 10+)

For older browsers, see **Production** below.

### Production

For deployment:

1. Switch to the `gh-pages` branch.
2. Run `npm install` in the project's root directory.
3. Run `gulp` in the project's root directory. This will transpile and minify the .js files to ECMAScript 5 and include [Babel's polyfill](https://babeljs.io/docs/usage/polyfill/).
4. Open `index.html` with IE11+ or any modern browser.

## Functionality

- Resize the game area by dragging the handle in the lower right corner.
- Open the settings / create a new game by clicking the &#9881; button.
- Execute a single step by clicking the &rsaquo; button.
- Insert a pattern into the game by clicking the &#9998; button.
- Flip the status of cells by clicking on them.


## Extensibility 

Add new patterns by modifying `src/js/patterns.js`.

## Limitations

- The browser window should have a minimum height of 540px for the menus to be fully visible.
- In Firefox, the dashed outline of the game area is displaced at the lower and right edges. This is due to the Firefox outline descendants bug: [https://bugzilla.mozilla.org/show_bug.cgi?id=687311](https://bugzilla.mozilla.org/show_bug.cgi?id=687311)
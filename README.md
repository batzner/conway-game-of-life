[![](https://raw.githubusercontent.com/batzner/conway-game-of-life/master/showcase.gif)](https://batzner.github.io/conway-game-of-life/)

**Showcase:** [batzner.github.io/conway-game-of-life/](https://batzner.github.io/conway-game-of-life/)

## Setup

**Open `src/index.html`**

if you have a browser supporting ECMAScript 6 (Chrome 60+, Firefox 55+ or Safari 10+).

For older browsers, see **Production** below.

### Production / Deployment

1. Run `npm install` in the project's root directory.
2. Run `gulp` in the project's root directory. This will transpile and minify the .js files to ECMAScript 5 and include [Babel's polyfill](https://babeljs.io/docs/usage/polyfill/).
3. Open `dist/index.html` with IE11+ or any modern browser.
4. (optional) Run `./publish.sh` on the `master` branch to publish the site to the `gh-pages` branch. Might be worth to take a look at `./publish.sh` before to see what it does.

## Functionality

- Open the settings / create a new game by clicking the &#9881; button.
- Resize the game area by dragging the handle in the lower right corner.
- Execute a single step by clicking the &rsaquo; button.
- Insert a pattern into the game by clicking the &#9998; button.
- Flip the status of cells by clicking on them.


## Extensibility 

Add new patterns by modifying `src/js/patterns.js`.

## Limitations

The browser window should have a minimum height of 540px for the menus to be fully visible.

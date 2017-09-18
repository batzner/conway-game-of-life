# Conway's Game of Life

**Showcase:** [mlowl.com/conway-game-of-life/](http://mlowl.com/conway-game-of-life/)

[![](https://raw.githubusercontent.com/batzner/conway-game-of-life/master/showcase.gif)](http://mlowl.com/conway-game-of-life/)

## Setup

### Development

The logic is written in ECMAScript 6. For development, use Chrome 60+, Firefox 55+ or Safari 10+. 

1. Run `npm install` in the project's root directory.
2. Open `index.html`.

### Production

For deployment:

1. Switch to the `gh-pages` branch.
2. Run `npm install --only=production` in the project's root directory.
3. Run `gulp` in the project's root directory. This will transpile and minify the .js files to ECMAScript 5 and include [Babel's polyfill](https://babeljs.io/docs/usage/polyfill/).
4. Open `index.html` with any modern browser.

## Functionality

## Extensibility 

Add new patterns by modifying `src/js/patterns.js`.
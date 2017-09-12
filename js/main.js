/**
 * Created by Kilian on 06.09.17.
 */

// TODO: Info / Explanation, Zoom, Insert Patterns, Choose Map, Window resizing observer

// Imports
const {MDCSlider} = mdc.slider;

// Util functions
Number.prototype.mod = function (n) {
    let result = ((this % n) + n) % n;
    if (result < 0) {
        console.log(this, n, result);
    }
    return result;
};

// Constants
const CELL_COLOR = '#3F51B5';
const GRID_MARGIN = 10;

// Semi-constant variables
let STAGE = null;
let GRID = null;
let GRID_SELECTOR = null;
let GRID_SELECTOR_SIBLINGS = {
    top: null, right: null, bottom: null, left: null
};
let MENU = null;
let DENSITY_VALUE_DISPLAY = null;
let DENSITY_SLIDER = null;

// Global variables
let cellSize = 12;
let field = null;
let shapes = null;
let infiniteEdges = true;
let incrementalUpdates = false;

$(function () {
    // Initialize the semi-constants
    STAGE = new createjs.Stage('canvas');
    GRID = $('#grid');
    GRID_SELECTOR = $('#grid-selector');
    GRID_SELECTOR_SIBLINGS.top = $('#grid-selector-top');
    GRID_SELECTOR_SIBLINGS.right = $('#grid-selector-right');
    GRID_SELECTOR_SIBLINGS.bottom = $('#grid-selector-bottom');
    GRID_SELECTOR_SIBLINGS.left = $('#grid-selector-left');
    MENU = $('#menu');
    DENSITY_VALUE_DISPLAY = $('#density-value-display');

    // Let the canvas fill the game area
    $('canvas').each(function (_, el) {
        const canvas = el.getContext('2d').canvas;
        canvas.width = GRID.width();
        canvas.height = GRID.height();
    });

    // Initialize the grid
    const styleVal = cellSize * 10 + 'px ' + cellSize * 10 + 'px';
    GRID.css('background-size', styleVal);

    // Calculate the number of cell that fit on the screen
    initGridSelector();

    // Initialize the menu
    MENU.addClass('mdc-simple-menu--open');

    // Initialize the sliders before hiding the menu, otherwise the initialization will fail
    const speedSlider = new MDCSlider(document.querySelector('#speed-slider'));
    speedSlider.listen('MDCSlider:input', () => createjs.Ticker.setFPS(speedSlider.value));

    DENSITY_SLIDER = new MDCSlider(document.querySelector('#density-slider'));
    DENSITY_SLIDER.step = 1;
    DENSITY_SLIDER.value = 50;
    DENSITY_VALUE_DISPLAY.html(DENSITY_SLIDER.value);
    DENSITY_SLIDER.listen('MDCSlider:input', () =>
        DENSITY_VALUE_DISPLAY.html(DENSITY_SLIDER.value)
    );
    MENU.hide();

    // Initialize the checkboxes
    mdc.checkbox.MDCCheckbox.attachTo(document.querySelector('.mdc-checkbox'));

    const infiniteEdgesCheckbox = $('#infinite-edges-checkbox');
    infiniteEdgesCheckbox.prop('checked', infiniteEdges);
    infiniteEdgesCheckbox.click(function () {
        infiniteEdges = infiniteEdgesCheckbox.prop('checked');
    });

    const incrementalUpdatesCheckbox = $('#incremental-updates-checkbox');
    incrementalUpdatesCheckbox.prop('checked', incrementalUpdates);
    incrementalUpdatesCheckbox.click(function () {
        incrementalUpdates = incrementalUpdatesCheckbox.prop('checked');
    });

    $('#create-game-button').click(function () {
        randomInit();
        MENU.hide();
    });

    // Hide the menu on outside clicks
    $(document).click(function (event) {
        // Exclude clicks within the menu or on the menu button
        const target = $(event.target);
        if (!target.closest('#menu-button').length && !target.closest('#menu').length) {
            if (MENU.is(':visible')) MENU.hide();
        }
    });

    // Initialize the buttons
    $('#menu-button').click(() => {
        MENU.show('fast');
    });
    $('#pause-resume-button').click(togglePauseResume);
    $('#next-step-button').click(function () {
        pause();
        tick();
    });

    // Start the game
    randomInit();
    createjs.Ticker.addEventListener('tick', function (event) {
        if (!event.paused) tick();
    });
    createjs.Ticker.setFPS(speedSlider.value);
    resume();
});

function pause() {
    if (!createjs.Ticker.paused) togglePauseResume();
}

function resume() {
    if (createjs.Ticker.paused) togglePauseResume();
}

function togglePauseResume() {
    let button = $('#pause-resume-button');
    createjs.Ticker.paused = !createjs.Ticker.paused;
    let icon = createjs.Ticker.paused ? 'play_arrow' : 'pause';
    button.find('.material-icons').first().html(icon);
}

function getGSRows() {
    return parseFloat(GRID_SELECTOR.attr('data-rows'));
}

function getGSColumns() {
    return parseFloat(GRID_SELECTOR.attr('data-columns'));
}

function initGridSelector() {
    alignGridSelector(Infinity, Infinity);

    // Taken from http://interactjs.io/
    interact('#grid-selector')
        .resizable({
            edges: {
                left: false,
                right: '.resize-hook-right',
                bottom: '.resize-hook-bottom',
                top: false
            }
        })
        .on('resizemove', function (event) {
            // If the rect exceeds the visible grid in the bottom right, increase the visible grid
            if (event.rect.right >= GRID.width() - GRID_MARGIN &&
                event.rect.bottom >= GRID.height() - GRID_MARGIN) {
                increaseGrid();
            }
            // Get the current (not rounded) position
            let x = Math.round(GRID_SELECTOR.position().left / cellSize);
            let y = Math.round(GRID_SELECTOR.position().top / cellSize);

            // Change the desired (not rounded) position
            let width = (event.rect.right / cellSize) - x;
            let height = (event.rect.bottom / cellSize) - y;

            // Store the desired size in the data attributes and align the grid
            alignGridSelector(width, height);
        })
        .on('resizeend', function () {
            // Check, if the grid can be enlarged
            fitGrid();
        });
}

function increaseGrid() {
    // Change the grid
    let newCellSize = Math.max(cellSize * 0.9, 4);

    // Check if there is nothing to do
    if (cellSize == newCellSize) return;
    updateCellSize(newCellSize);

    // TODO: Don't update the field, only the shapes
    updateShapes();
}

function updateCellSize(newCellSize) {
    // Round to 0 decimal places for the px value in CSS. The cell size needs to rounded accordingly
    // Otherwise the grid pattern background won't align with the canvas and grid selector
    cellSize = Math.round(newCellSize * 10) / 10;

    // Update the grid
    const styleVal = cellSize * 10 + 'px ' + cellSize * 10 + 'px';
    GRID.css('background-size', styleVal);
}

function fitGrid() {
    // Make the grid fill at least one dimension
    const maxColumns = getMaxGridColumns();
    const maxRows = getMaxGridRows();

    let columns = getGSColumns();
    let rows = getGSRows();

    let widthRatio = maxColumns / columns;
    let heightRatio = maxRows / rows;

    // Fit the dimension that will hit the limit first
    let newCellSize = cellSize * Math.min(widthRatio, heightRatio);
    updateCellSize(newCellSize);
    alignGridSelector(columns, rows);
    updateField();
}

function getMaxGridColumns() {
    return Math.floor(GRID.width() / cellSize) - 2 * getMarginCells();
}

function getMaxGridRows() {
    return Math.floor(GRID.height() / cellSize) - 2 * getMarginCells();
}

function alignGridSelector(desiredColumns, desiredRows) {
    // Default is to keep the same number of columns and rows
    if (typeof desiredColumns == 'undefined') desiredColumns = getGSColumns();
    if (typeof desiredRows == 'undefined') desiredRows = getGSRows();

    // Stay within the grid
    desiredColumns = Math.max(desiredColumns, 0);
    desiredRows = Math.max(desiredRows, 0);
    desiredColumns = Math.min(getMaxGridColumns(), desiredColumns);
    desiredRows = Math.min(getMaxGridRows(), desiredRows);

    // Align the position to the grid
    let roundedWidth = Math.round(desiredColumns);
    let roundedHeight = Math.round(desiredRows);
    GRID_SELECTOR.attr('data-columns', roundedWidth);
    GRID_SELECTOR.attr('data-rows', roundedHeight);
    updateGridSelector(roundedWidth * cellSize, roundedHeight * cellSize);
}

function getMarginCells() {
    return Math.ceil(GRID_MARGIN / cellSize);
}

function updateGridSelector(width, height, x, y) {
    // If x and y are not specified, set them to the top left
    let margin = getMarginCells() * cellSize;
    x = (typeof x != 'undefined') ? x : margin;
    y = (typeof y != 'undefined') ? y : margin;

    GRID_SELECTOR.width(width);
    GRID_SELECTOR.height(height);
    GRID_SELECTOR.css({'left': x, 'top': y});

    // Update the siblings of the selector
    GRID_SELECTOR_SIBLINGS.top.css({'top': 0, 'right': 0, 'left': 0});
    GRID_SELECTOR_SIBLINGS.top.height(y);
    GRID_SELECTOR_SIBLINGS.bottom.css({'top': y + height, 'right': 0, 'bottom': 0, 'left': 0});

    GRID_SELECTOR_SIBLINGS.left.css({'top': y, 'left': 0});
    GRID_SELECTOR_SIBLINGS.left.width(x);
    GRID_SELECTOR_SIBLINGS.left.height(height);
    GRID_SELECTOR_SIBLINGS.right.css({'top': y, 'right': 0, 'left': x + width});
    GRID_SELECTOR_SIBLINGS.right.height(height);
}

function tick() {
    // Update the field and draw it
    let updates = [];
    let newField = [];

    for (let row = 0; row < field.length; row++) {
        let newRow = [];
        for (let column = 0; column < field[row].length; column++) {
            const neighborsCount = getNeighborsCount(row, column);
            const willBeAlive = neighborsCount == 3 || neighborsCount == 2 && field[row][column];

            // Set an update if necessary
            if (willBeAlive != field[row][column]) {
                updates.push({
                    row: row,
                    column: column,
                    alive: willBeAlive
                });
            }
            newRow.push(willBeAlive);

            // Incremental cell updates that can be used by the following cells
            if (incrementalUpdates) field[row][column] = willBeAlive;
        }
        newField.push(newRow)
    }
    field = newField;
    drawFieldUpdates(updates);
}

function getNeighborsCount(cellRow, cellColumn) {
    const rowIndices = [cellRow - 1, cellRow, cellRow + 1];
    const columnIndices = [cellColumn - 1, cellColumn, cellColumn + 1];

    let neighborsCount = 0;
    for (let rowIndex of rowIndices) {
        // Handle out of bounds cases
        if (!infiniteEdges && (rowIndex < 0 || rowIndex >= field.length)) continue;
        let row = rowIndex.mod(field.length);

        for (let columnIndex of columnIndices) {
            // Handle out of bounds cases
            if (!infiniteEdges && (columnIndex < 0 || columnIndex >= field[row].length)) continue;
            let column = columnIndex.mod(field[row].length);

            // Check the neighbor
            if (field[row][column] == true && !(row == cellRow && column == cellColumn)) {
                neighborsCount += 1;

                // Return early for too many neighbors
                if (neighborsCount > 3) return neighborsCount;
            }
        }
    }
    return neighborsCount;
}

function drawField() {
    for (let row = 0; row < field.length; row++) {
        for (let column = 0; column < field[row].length; column++) {
            shapes[row][column].visible = field[row][column] == true;
        }
    }
    STAGE.update();
}

function drawFieldUpdates(updates) {
    for (let update of updates) {
        shapes[update.row][update.column].visible = update.alive;
    }
    STAGE.update();
}

function updateField() {
    const numRows = getGSRows();
    const numColumns = getGSColumns();

    if (field == null) field = [];

    // Crop rows if necessary
    field = field.slice(0, numRows);
    // Add rows if necessary
    if (field.length < numRows) {
        const newRows = new Array(numRows - field.length).fill([]);
        Array.prototype.push.apply(field, newRows);
    }

    for (let row = 0; row < field.length; row++) {
        // Crop columns if necessary
        field[row] = field[row].slice(0, numColumns);
        // Add columns if necessary
        if (field[row].length < numColumns) {
            const newColumns = new Array(numColumns - field[row].length).fill(false);
            Array.prototype.push.apply(field[row], newColumns);
        }
    }

    // Make sure the shapes always match the field
    updateShapes();

    return field;
}

function updateShapes() {
    const numRows = getGSRows();
    const numColumns = getGSColumns();

    // Don't set new shapes if the dimensions match the field
    if (shapes != null && shapes.length == numRows && shapes[0].length == numColumns) return;

    shapes = [];
    STAGE.removeAllChildren();
    let margin = getMarginCells() * cellSize;
    for (let row = 0; row < numRows; row++) {
        let shapesRow = [];
        for (let column = 0; column < numColumns; column++) {
            // Create the shape
            const shape = new createjs.Shape();
            shape.graphics
                .beginFill(CELL_COLOR)
                .drawRect(column * cellSize + margin, row * cellSize + margin, cellSize, cellSize);
            shape.visible = false;
            STAGE.addChild(shape);

            shapesRow.push(shape);
        }
        shapes.push(shapesRow);
    }

    drawField();
}

function randomInit() {
    pause();

    // Make sure the field matches the current grid selectors dimensions
    updateField();

    const density = DENSITY_SLIDER ? DENSITY_SLIDER.value / 100 : 0.1;
    for (let row = 0; row < getGSRows(); row++) {
        for (let column = 0; column < getGSColumns(); column++) {
            field[row][column] = Math.random() <= density;
        }
    }
    drawField();
}
/**
 * Created by Kilian on 06.09.17.
 */

// Imports
const {MDCSlider} = mdc.slider;

// Util functions
Number.prototype.mod = function (n) {
    return ((this % n) + n) % n;
};

// Constants
const CELL_COLOR = '#3F51B5';
const PATTERN_PREVIEW_COLOR = '#5fb4b5';
const GRID_MARGIN = 10;
const PATTERNS = {
    'Glider': [[-1, 0], [0, 1], [1, -1], [1, 0], [1, 1]],
    'Exploder': [[-1, -1], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 1], [2, 0]],
    'Spaceship': [[-2, -1], [-2, 0], [-2, 1], [-2, 2], [-1, -2], [-1, 2], [0, 2], [1, -2], [1, 1]],
    '10 Cell Row': [[0, -4], [0, -3], [0, -2], [0, -1], [0, 0], [0, 1], [0, 2], [0, 3], [0, 4],
        [0, 5]],
    'Glider Gun': [[0, -18], [0, -17], [1, -18], [1, -17], [0, -8], [1, -8], [2, -8], [-1, -7],
        [-2, -6], [-2, -5], [3, -7], [4, -6], [4, -5], [1, -4], [-1, -3], [0, -2], [1, -2],
        [2, -2], [1, -1], [3, -3], [-2, 2], [-1, 2], [0, 2], [-2, 3], [-1, 3], [0, 3], [-3, 4],
        [1, 4], [-4, 6], [-3, 6], [1, 6], [2, 6], [-2, 16], [-1, 16], [-2, 17], [-1, 17]],
    'Train': [[-3, -9], [-3, -8], [-3, -7], [-3, 5], [-3, 6], [-3, 7], [-2, -10], [-2, -7],
        [-2, 4], [-2, 7], [-1, -7], [-1, -2], [-1, -1], [-1, 0], [-1, 7], [0, -7], [0, -2], [0, 1],
        [0, 7], [1, -8], [1, -3], [1, 6]]
};

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
let SPEED_SLIDER = null;

// Global variables
let cellSize = 12;
let field = [];
let shapes = [];
let patternPreviewShapes = [];
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

    // Initialize the grid
    fitCanvasToGrid();
    updateCellSize(cellSize);
    initGridSelector();

    // Respond to window resizing
    $(window).resize(function () {
        clearTimeout(window.resizedFinished);
        window.resizedFinished = setTimeout(function () {
            // On resize end / pause
            fitCanvasToGrid();
            // TODO: The grid height will suddenly jump down 15px and then directly back up during
            // resizing, which will make the grid selector's height decrease by 15px.
            alignGridSelector();
            updateField();

            // Resizing will mess up the sliders
            initializeSliders();
        }, 250);
    });

    // Initialize the menu
    initializeSliders();

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
        pause();
        randomInit(DENSITY_SLIDER.value / 100);
        MENU.hide();
    });

    $('#clear-button').click(function () {
        randomInit(0);
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

    // Initialize the insert-pattern menu
    let insertPatternList = $('#insert-pattern-menu').find('ul');
    Object.keys(PATTERNS).forEach(patternName => {
        const pattern = PATTERNS[patternName];
        if (!pattern) return;

        const item = $('<li class="mdc-list-item" role="menuitem" tabindex="0"></li>');
        item.html(patternName);
        item.click(() => insertPatternMode(pattern));
        insertPatternList.append(item);
    });
    let insertPatternMenu = new mdc.menu.MDCSimpleMenu(
        document.querySelector('#insert-pattern-menu')
    );
    // Add event listener to some button to toggle the menu on and off.
    $('#insert-pattern-button').click(() => {
        insertPatternMenu.open = !insertPatternMenu.open;
    });

    // Start the game
    randomInit(DENSITY_SLIDER.value / 100);
    createjs.Ticker.addEventListener('tick', function (event) {
        if (!event.paused) tick();
    });
    createjs.Ticker.setFPS(SPEED_SLIDER.value);
});

function initializeSliders() {
    let menuWasVisible = MENU.is(":visible") && MENU.hasClass('mdc-simple-menu--open');
    MENU.addClass('mdc-simple-menu--open');
    if (!menuWasVisible) MENU.show();

    // Initialize the sliders before hiding the menu, otherwise the initialization will fail
    SPEED_SLIDER = new MDCSlider(document.querySelector('#speed-slider'));
    SPEED_SLIDER.step = 1;
    SPEED_SLIDER.listen('MDCSlider:input', () =>
        createjs.Ticker.setFPS(SPEED_SLIDER.value)
    );

    DENSITY_SLIDER = new MDCSlider(document.querySelector('#density-slider'));
    DENSITY_SLIDER.step = 1;
    DENSITY_SLIDER.listen('MDCSlider:input', () =>
        DENSITY_VALUE_DISPLAY.html(DENSITY_SLIDER.value)
    );

    DENSITY_VALUE_DISPLAY.html(DENSITY_SLIDER.value);

    if (!menuWasVisible) MENU.hide();
}

function fitCanvasToGrid() {
    // Let the canvas fill the game area
    $('canvas').each(function (_, el) {
        const canvas = el.getContext('2d').canvas;
        canvas.width = GRID.width();
        canvas.height = GRID.height();
    });
}

function insertPatternMode(pattern) {
    // Cancel a possibly active preview mode
    GRID_SELECTOR.off('mousemove');
    GRID_SELECTOR.off('mousedown');

    // Show the pattern where the mouse is
    GRID_SELECTOR.mousemove(function (event) {
        let [centerColumn, centerRow] = getMouseCellCoords(event);
        showPatternPreview(pattern, centerColumn, centerRow);
    });

    GRID_SELECTOR.mousedown(function (event) {
        // Stop the pattern previews and only insert once
        GRID_SELECTOR.off('mousemove');
        GRID_SELECTOR.off('mousedown');
        hidePatternPreview();

        let [centerColumn, centerRow] = getMouseCellCoords(event);

        // Set the pattern in the field
        let fieldUpdates = [];
        for (let cell of pattern) {
            let row = cell[0] + centerRow;
            let column = cell[1] + centerColumn;

            if (0 <= row && row < field.length && 0 <= column && column < field[row].length) {
                field[row][column] = true;
                fieldUpdates.push({
                    row: row,
                    column: column,
                    alive: true
                });
            }
        }

        drawFieldUpdates(fieldUpdates);
    })
}

function getMouseCellCoords(event) {
    // Get the mouse position relative to the grid
    let gridOffset = GRID_SELECTOR.offset();
    let x = event.pageX - gridOffset.left;
    let y = event.pageY - gridOffset.top;

    let column = Math.round(x / cellSize);
    let row = Math.round(y / cellSize);
    return [column, row];
}

function showPatternPreview(pattern, centerColumn, centerRow) {
    // Only manipulate the shapes, not the field

    // Delete the previous pattern
    hidePatternPreview();

    let maxRow = shapes.length;
    let maxColumn = shapes[0].length;
    for (let cell of pattern) {
        let row = cell[0] + centerRow;
        let column = cell[1] + centerColumn;

        // Don't draw outside the game area
        if (row >= maxRow || row < 0 || column >= maxColumn || column < 0) {
            continue
        }

        const shape = getCellShape(column, row, PATTERN_PREVIEW_COLOR);
        // Add at the front so they can be found easily when hiding the pattern
        STAGE.addChildAt(shape, 0);
        patternPreviewShapes.push(shape);
    }
    STAGE.update();
}

function hidePatternPreview() {
    for (let shape of patternPreviewShapes) {
        STAGE.removeChild(shape);
    }
}

function pause() {
    if (!createjs.Ticker.paused) togglePauseResume();
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

    // Don't update the field, only the shapes
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
    let roundedColumns = Math.round(desiredColumns);
    let roundedRows = Math.round(desiredRows);
    GRID_SELECTOR.attr('data-columns', roundedColumns);
    GRID_SELECTOR.attr('data-rows', roundedRows);
    updateGridSelector(roundedColumns * cellSize, roundedRows * cellSize);
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
    if (shapes.length == numRows && shapes[0].length == numColumns) return;

    shapes = [];
    STAGE.removeAllChildren();
    for (let row = 0; row < numRows; row++) {
        let shapesRow = [];
        for (let column = 0; column < numColumns; column++) {
            // Create the shape
            const shape = getCellShape(column, row, CELL_COLOR);
            shape.visible = false;
            STAGE.addChild(shape);
            shapesRow.push(shape);
        }
        shapes.push(shapesRow);
    }

    drawField();
}

function getCellShape(column, row, color) {
    let margin = getMarginCells();

    const shape = new createjs.Shape();
    shape.graphics
        .beginFill(color)
        .drawRect((column + margin) * cellSize, (row + margin) * cellSize, cellSize, cellSize);
    return shape;
}

function randomInit(density) {
    // Make sure the field matches the current grid selectors dimensions
    updateField();
    for (let row = 0; row < getGSRows(); row++) {
        for (let column = 0; column < getGSColumns(); column++) {
            field[row][column] = Math.random() <= density;
        }
    }
    drawField();
}
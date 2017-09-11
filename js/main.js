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
const CELL_COLOR = '#3F51B5';//  '#FF4081';

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

    // Let the canvas fill the screen
    $('canvas').each(function (_, el) {
        const canvas = el.getContext('2d').canvas;
        canvas.width = $(window).width();
        canvas.height = $(window).height();
    });

    // Calculate the number of cell that fit on the screen
    let numColumns = Math.floor(GRID.width() / cellSize);
    let numRows = Math.floor(GRID.height() / cellSize);

    // Initialize the game objects
    field = getField(numRows, numColumns);
    shapes = getShapes(STAGE, numRows, numColumns);

    // Initialize the menu
    MENU.addClass('mdc-simple-menu--open');

    // Initialize the sliders before hiding the menu, otherwise the initialization will fail
    const speedSlider = new MDCSlider(document.querySelector('#speed-slider'));
    speedSlider.listen('MDCSlider:input', () => createjs.Ticker.setFPS(speedSlider.value));

    DENSITY_SLIDER = new MDCSlider(document.querySelector('#density-slider'));
    DENSITY_SLIDER.step = 1;
    DENSITY_SLIDER.value = 10;
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

    $('#create-game-button').click(function() {
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

    // Initialize the grid
    const styleVal = cellSize * 10 + 'px ' + cellSize * 10 + 'px';
    GRID.css('background-size', styleVal);
    initGridSelector();

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

function getNumRows() {
    return field.length;
}

function getNumColumns() {
    return field[0] ? field[0].length : undefined;
}

function initGridSelector() {
    GRID_SELECTOR.attr('data-x', 0);
    GRID_SELECTOR.attr('data-y', 0);
    GRID_SELECTOR.attr('data-width', getNumColumns());
    GRID_SELECTOR.attr('data-height', getNumRows());

    alignGridSelector();

    // Taken from http://interactjs.io/
    interact('#grid-selector')
        .draggable({
            onmove: function (event) {
                // Get the current (not rounded) position
                let x = parseFloat(GRID_SELECTOR.attr('data-x'));
                let y = parseFloat(GRID_SELECTOR.attr('data-y'));

                // Change the desired (not rounded) position
                x += event.dx / cellSize;
                y += event.dy / cellSize;

                // Store the desired position in the data-x/data-y attributes and align the grid
                GRID_SELECTOR.attr('data-x', x);
                GRID_SELECTOR.attr('data-y', y);
                alignGridSelector();
            }
        })
        .resizable({
            edges: {left: false, right: true, bottom: true, top: false}
        })
        .on('resizemove', function (event) {
            // If the rect exceeds the visible grid, increase the visible grid
            if (event.rect.right >= GRID.width() || event.rect.bottom >= GRID.height()) {
                increaseGrid();
            }
            // Get the current (not rounded) position
            let x = parseFloat(GRID_SELECTOR.attr('data-x'));
            let y = parseFloat(GRID_SELECTOR.attr('data-y'));

            // Change the desired (not rounded) position
            let width = (event.rect.right / cellSize) - x;
            let height = (event.rect.bottom / cellSize) - y;

            // Store the desired position in the data-x/data-y attributes and align the grid
            GRID_SELECTOR.attr('data-width', width);
            GRID_SELECTOR.attr('data-height', height);
            alignGridSelector();
        });
}

function increaseGrid() {
    // Change the grid
    cellSize = Math.max(cellSize - 0.5, 4);
    const styleVal = cellSize * 10 + 'px ' + cellSize * 10 + 'px';
    GRID.css('background-size', styleVal);
}

function alignGridSelector() {
    // Get the desired position
    const x = parseFloat(GRID_SELECTOR.attr('data-x'));
    const y = parseFloat(GRID_SELECTOR.attr('data-y'));
    const width = parseFloat(GRID_SELECTOR.attr('data-width'));
    const height = parseFloat(GRID_SELECTOR.attr('data-height'));

    // Align the position to the grid
    let roundedX = Math.round(x);
    let roundedY = Math.round(y);
    let roundedWidth = Math.round(width);
    let roundedHeight = Math.round(height);

    // Stay within the grid
    let rightLimit = Math.floor(GRID.width() / cellSize);
    let bottomLimit = Math.floor(GRID.height() / cellSize);

    // Lower bounds
    roundedWidth = Math.max(roundedWidth, 0);
    roundedHeight = Math.max(roundedHeight, 0);

    // Upper bounds
    roundedWidth = Math.min(rightLimit - roundedX, roundedWidth);
    roundedHeight = Math.min(bottomLimit - roundedY, roundedHeight);
    updateGridSelector(roundedWidth * cellSize, roundedHeight * cellSize, roundedX * cellSize,
        roundedY * cellSize);
}

function updateGridSelector(width, height, x, y) {
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

    for (let row = 0; row < getNumRows(); row++) {
        let newRow = [];
        for (let column = 0; column < getNumColumns(); column++) {
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
        if (!infiniteEdges && (rowIndex < 0 || rowIndex >= getNumRows())) continue;
        let row = rowIndex.mod(getNumRows());

        for (let columnIndex of columnIndices) {
            // Handle out of bounds cases
            if (!infiniteEdges && (columnIndex < 0 || columnIndex >= getNumColumns())) continue;
            let column = columnIndex.mod(getNumColumns());

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

function getField(numRows, numColumns) {
    let field = [];
    for (let row = 0; row < numRows; row++) {
        let entriesRow = [];
        for (let column = 0; column < numColumns; column++) {
            entriesRow.push(false);
        }
        field.push(entriesRow);
    }
    return field;
}

function getShapes(stage, rows, columns) {
    let shapes = [];
    for (let row = 0; row < rows; row++) {
        let shapesRow = [];
        for (let column = 0; column < columns; column++) {
            // Create the shape
            const shape = new createjs.Shape();
            shape.graphics
                .beginFill(CELL_COLOR)
                .drawRect(column * cellSize, row * cellSize, cellSize, cellSize);
            stage.addChild(shape);

            shapesRow.push(shape);
        }
        shapes.push(shapesRow);
    }
    return shapes;
}

function randomInit() {
    pause();
    const density = DENSITY_SLIDER ? DENSITY_SLIDER.value / 100 : 0.1;
    for (let row = 0; row < getNumRows(); row++) {
        for (let column = 0; column < getNumColumns(); column++) {
            field[row][column] = Math.random() <= density;
        }
    }
    drawField();
}
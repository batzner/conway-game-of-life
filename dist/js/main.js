'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

/**
 * Created by Kilian on 06.09.17.
 */

// Util functions
Number.prototype.mod = function (n) {
    return (this % n + n) % n;
};

// Constants
var PATTERN_PREVIEW_COLOR = '#5fb4b5';
var GRID_MARGIN = 10;
var PATTERNS = {
    'Glider': [[-1, 0], [0, 1], [1, -1], [1, 0], [1, 1]],
    'Exploder': [[-1, -1], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 1], [2, 0]],
    'Spaceship': [[-2, -1], [-2, 0], [-2, 1], [-2, 2], [-1, -2], [-1, 2], [0, 2], [1, -2], [1, 1]],
    '10 Cell Row': [[0, -4], [0, -3], [0, -2], [0, -1], [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5]],
    'Glider Gun': [[0, -18], [0, -17], [1, -18], [1, -17], [0, -8], [1, -8], [2, -8], [-1, -7], [-2, -6], [-2, -5], [3, -7], [4, -6], [4, -5], [1, -4], [-1, -3], [0, -2], [1, -2], [2, -2], [1, -1], [3, -3], [-2, 2], [-1, 2], [0, 2], [-2, 3], [-1, 3], [0, 3], [-3, 4], [1, 4], [-4, 6], [-3, 6], [1, 6], [2, 6], [-2, 16], [-1, 16], [-2, 17], [-1, 17]],
    'Train': [[-3, -9], [-3, -8], [-3, -7], [-3, 5], [-3, 6], [-3, 7], [-2, -10], [-2, -7], [-2, 4], [-2, 7], [-1, -7], [-1, -2], [-1, -1], [-1, 0], [-1, 7], [0, -7], [0, -2], [0, 1], [0, 7], [1, -8], [1, -3], [1, 6]]
};

// Semi-constant variables
var STAGE = null;
var GRID = null;
var GRID_SELECTOR = null;
var GRID_SELECTOR_SIBLINGS = {
    top: null, right: null, bottom: null, left: null
};
var MENU = null;
var DENSITY_VALUE_DISPLAY = null;
var DENSITY_SLIDER = null;
var SPEED_SLIDER = null;

// Global variables
var cellSize = 24;
var field = [];
var shapes = [];
var patternPreviewShapes = [];
var infiniteEdges = true;
var incrementalUpdates = false;
var editCellsOnClick = true;
var cellColor = '#3F51B5';

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

    var infiniteEdgesCheckbox = $('#infinite-edges-checkbox');
    infiniteEdgesCheckbox.prop('checked', infiniteEdges);
    infiniteEdgesCheckbox.click(function () {
        infiniteEdges = infiniteEdgesCheckbox.prop('checked');
    });

    var incrementalUpdatesCheckbox = $('#incremental-updates-checkbox');
    incrementalUpdatesCheckbox.prop('checked', incrementalUpdates);
    incrementalUpdatesCheckbox.click(function () {
        incrementalUpdates = incrementalUpdatesCheckbox.prop('checked');
    });

    var editCellCheckbox = $('#edit-cells-checkbox');
    editCellCheckbox.prop('checked', editCellsOnClick);
    editCellCheckbox.click(function () {
        editCellsOnClick = editCellCheckbox.prop('checked');
    });

    // Edit pixels on click on the grid
    GRID_SELECTOR.click(function (event) {
        if (!editCellsOnClick || MENU.is(":visible")) return;

        var _getMouseCellCoords = getMouseCellCoords(event),
            _getMouseCellCoords2 = _slicedToArray(_getMouseCellCoords, 2),
            column = _getMouseCellCoords2[0],
            row = _getMouseCellCoords2[1];

        if (row < field.length && column < field[row].length) {
            field[row][column] = !field[row][column];
            drawFieldUpdates([{
                row: row,
                column: column,
                alive: field[row][column]
            }]);
        }
    });

    $("#colorpicker").spectrum({
        color: cellColor,
        showPaletteOnly: true,
        showPalette: true,
        hideAfterPaletteSelect: true,
        palette: [['#FFEB3B', '#FF9800', '#F44336', '#F50057'], ['#2196F3', '#00BCD4', '#009688', '#4CAF50'], ['#3F51B5', '#9C27B0', '#673AB7', '#000000']],
        change: function change(color) {
            // Change the cell color
            cellColor = color.toHexString();
            updateShapes(true);
        }
    });
    $('.sp-replacer').addClass('mdc-elevation--z3');
    $('.sp-container').addClass('mdc-elevation--z3');

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
        var target = $(event.target);
        if (!target.closest('#menu-button').length && !target.closest('#menu').length) {
            if (MENU.is(':visible')) MENU.hide();
        }
    });

    // Initialize the buttons
    $('#menu-button').click(function () {
        MENU.show('fast');
    });
    $('#pause-resume-button').click(togglePauseResume);
    $('#next-step-button').click(function () {
        pause();
        tick();
    });

    // Initialize the insert-pattern menu
    var insertPatternList = $('#insert-pattern-menu').find('ul');
    Object.keys(PATTERNS).forEach(function (patternName) {
        var pattern = PATTERNS[patternName];
        if (!pattern) return;

        var item = $('<li class="mdc-list-item" role="menuitem" tabindex="0"></li>');
        item.html(patternName);
        item.click(function () {
            return insertPatternMode(pattern);
        });
        insertPatternList.append(item);
    });
    var insertPatternMenu = new mdc.menu.MDCSimpleMenu(document.querySelector('#insert-pattern-menu'));
    // Add event listener to some button to toggle the menu on and off.
    $('#insert-pattern-button').click(function () {
        insertPatternMenu.open = !insertPatternMenu.open;
    });

    // Let the user start playing
    var explanation = $('#explanation');
    explanation.find('button').click(function () {
        explanation.hide();
    });

    // Start the game
    randomInit(DENSITY_SLIDER.value / 100);
    createjs.Ticker.addEventListener('tick', function (event) {
        if (!event.paused) tick();
    });
    createjs.Ticker.setFPS(SPEED_SLIDER.value);
});

function initializeSliders() {
    var menuWasVisible = MENU.is(":visible") && MENU.hasClass('no-interaction-menu--open');
    MENU.addClass('no-interaction-menu--open');
    if (!menuWasVisible) MENU.show();

    // Initialize the sliders before hiding the menu, otherwise the initialization will fail
    SPEED_SLIDER = new mdc.slider.MDCSlider(document.querySelector('#speed-slider'));
    SPEED_SLIDER.step = 1;
    SPEED_SLIDER.listen('MDCSlider:input', function () {
        return createjs.Ticker.setFPS(SPEED_SLIDER.value);
    });

    DENSITY_SLIDER = new mdc.slider.MDCSlider(document.querySelector('#density-slider'));
    DENSITY_SLIDER.step = 1;
    DENSITY_SLIDER.listen('MDCSlider:input', function () {
        return DENSITY_VALUE_DISPLAY.html(DENSITY_SLIDER.value);
    });

    DENSITY_VALUE_DISPLAY.html(DENSITY_SLIDER.value);

    if (!menuWasVisible) MENU.hide();
}

function fitCanvasToGrid() {
    // Let the canvas fill the game area
    $('canvas').each(function (_, el) {
        var canvas = el.getContext('2d').canvas;
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
        var _getMouseCellCoords3 = getMouseCellCoords(event),
            _getMouseCellCoords4 = _slicedToArray(_getMouseCellCoords3, 2),
            centerColumn = _getMouseCellCoords4[0],
            centerRow = _getMouseCellCoords4[1];

        showPatternPreview(pattern, centerColumn, centerRow);
    });

    GRID_SELECTOR.mousedown(function (event) {
        // Stop the pattern previews and only insert once
        GRID_SELECTOR.off('mousemove');
        GRID_SELECTOR.off('mousedown');
        hidePatternPreview();

        var _getMouseCellCoords5 = getMouseCellCoords(event),
            _getMouseCellCoords6 = _slicedToArray(_getMouseCellCoords5, 2),
            centerColumn = _getMouseCellCoords6[0],
            centerRow = _getMouseCellCoords6[1];

        // Set the pattern in the field


        var fieldUpdates = [];
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = pattern[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var cell = _step.value;

                var row = cell[0] + centerRow;
                var column = cell[1] + centerColumn;

                if (0 <= row && row < field.length && 0 <= column && column < field[row].length) {
                    field[row][column] = true;
                    fieldUpdates.push({
                        row: row,
                        column: column,
                        alive: true
                    });
                }
            }
        } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion && _iterator.return) {
                    _iterator.return();
                }
            } finally {
                if (_didIteratorError) {
                    throw _iteratorError;
                }
            }
        }

        drawFieldUpdates(fieldUpdates);
    });
}

function getMouseCellCoords(event) {
    // Get the mouse position relative to the grid
    var gridOffset = GRID_SELECTOR.offset();
    var x = event.pageX - gridOffset.left;
    var y = event.pageY - gridOffset.top;

    var column = Math.floor(x / cellSize);
    var row = Math.floor(y / cellSize);
    return [column, row];
}

function showPatternPreview(pattern, centerColumn, centerRow) {
    // Only manipulate the shapes, not the field

    // Delete the previous pattern
    hidePatternPreview();

    var maxRow = shapes.length;
    var maxColumn = shapes[0].length;
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
        for (var _iterator2 = pattern[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var cell = _step2.value;

            var row = cell[0] + centerRow;
            var column = cell[1] + centerColumn;

            // Don't draw outside the game area
            if (row >= maxRow || row < 0 || column >= maxColumn || column < 0) {
                continue;
            }

            var shape = getCellShape(column, row, PATTERN_PREVIEW_COLOR);
            // Add at the front so they can be found easily when hiding the pattern
            STAGE.addChildAt(shape, 0);
            patternPreviewShapes.push(shape);
        }
    } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
                _iterator2.return();
            }
        } finally {
            if (_didIteratorError2) {
                throw _iteratorError2;
            }
        }
    }

    STAGE.update();
}

function hidePatternPreview() {
    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
        for (var _iterator3 = patternPreviewShapes[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var shape = _step3.value;

            STAGE.removeChild(shape);
        }
    } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion3 && _iterator3.return) {
                _iterator3.return();
            }
        } finally {
            if (_didIteratorError3) {
                throw _iteratorError3;
            }
        }
    }
}

function pause() {
    if (!createjs.Ticker.paused) togglePauseResume();
}

function togglePauseResume() {
    var button = $('#pause-resume-button');
    createjs.Ticker.paused = !createjs.Ticker.paused;
    var icon = createjs.Ticker.paused ? 'play_arrow' : 'pause';
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
    interact('#grid-selector').resizable({
        edges: {
            left: false,
            right: '.resize-hook-right',
            bottom: '.resize-hook-bottom',
            top: false
        }
    }).on('resizemove', function (event) {
        // If the rect exceeds the visible grid in the bottom right, increase the visible grid
        if (event.rect.right >= GRID.width() - getMarginCells() * cellSize && event.rect.bottom >= GRID.height() - getMarginCells() * cellSize) {
            increaseGrid();
        }
        // Get the current (not rounded) position
        var x = Math.round(GRID_SELECTOR.position().left / cellSize);
        var y = Math.round(GRID_SELECTOR.position().top / cellSize);

        // Change the desired (not rounded) position
        var width = event.rect.right / cellSize - x;
        var height = event.rect.bottom / cellSize - y;

        // Store the desired size in the data attributes and align the grid
        alignGridSelector(width, height);
    }).on('resizeend', function () {
        // Check, if the grid can be enlarged
        fitGrid();
    });
}

function increaseGrid() {
    // Change the grid
    var newCellSize = Math.max(cellSize * 0.9, 4);

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
    var styleVal = cellSize * 10 + 'px ' + cellSize * 10 + 'px';
    GRID.css('background-size', styleVal);
}

function fitGrid() {
    // Make the grid fill at least one dimension
    var columns = getGSColumns();
    var rows = getGSRows();

    // Increase the cell size until maxRows <= rows or maxColumns <= columns
    // We cannot calculate the exact factor for increasing the cell size because a ratio like
    // cellSize *= maxColumns / columns depends on maxColumns, which in turn depends on the cell
    // size. Using a ratio like this will result in a 3 row grid when resizing from 50 rows to 5 for
    // example.
    var newCellSize = cellSize;
    while (rows < getMaxGridRows(newCellSize) && columns < getMaxGridColumns(newCellSize)) {
        newCellSize *= 1.01;
    }
    updateCellSize(newCellSize);
    alignGridSelector(columns, rows);
    updateField();
}

function getMaxGridColumns(_cellSize) {
    _cellSize = typeof _cellSize != 'undefined' ? _cellSize : cellSize;
    return Math.floor(GRID.width() / _cellSize) - 2 * getMarginCells(_cellSize);
}

function getMaxGridRows(_cellSize) {
    _cellSize = typeof _cellSize != 'undefined' ? _cellSize : cellSize;
    return Math.floor(GRID.height() / _cellSize) - 2 * getMarginCells(_cellSize);
}

function alignGridSelector(desiredColumns, desiredRows) {
    // Default is to keep the same number of columns and rows
    if (typeof desiredColumns == 'undefined') desiredColumns = getGSColumns();
    if (typeof desiredRows == 'undefined') desiredRows = getGSRows();

    // Stay within the grid
    desiredColumns = Math.max(desiredColumns, 5);
    desiredRows = Math.max(desiredRows, 5);
    desiredColumns = Math.min(getMaxGridColumns(), desiredColumns);
    desiredRows = Math.min(getMaxGridRows(), desiredRows);

    // Align the position to the grid
    var roundedColumns = Math.round(desiredColumns);
    var roundedRows = Math.round(desiredRows);
    GRID_SELECTOR.attr('data-columns', roundedColumns);
    GRID_SELECTOR.attr('data-rows', roundedRows);
    updateGridSelector(roundedColumns * cellSize, roundedRows * cellSize);
}

function getMarginCells(_cellSize) {
    _cellSize = typeof _cellSize != 'undefined' ? _cellSize : cellSize;
    return Math.ceil(GRID_MARGIN / _cellSize);
}

function updateGridSelector(width, height, x, y) {
    // If x and y are not specified, set them to the top left
    var margin = getMarginCells() * cellSize;
    x = typeof x != 'undefined' ? x : margin;
    y = typeof y != 'undefined' ? y : margin;

    GRID_SELECTOR.width(width);
    GRID_SELECTOR.height(height);
    GRID_SELECTOR.css({ 'left': x, 'top': y });

    // Update the siblings of the selector
    GRID_SELECTOR_SIBLINGS.top.css({ 'top': 0, 'right': 0, 'left': 0 });
    GRID_SELECTOR_SIBLINGS.top.height(y);
    GRID_SELECTOR_SIBLINGS.bottom.css({ 'top': y + height, 'right': 0, 'bottom': 0, 'left': 0 });

    GRID_SELECTOR_SIBLINGS.left.css({ 'top': y, 'left': 0 });
    GRID_SELECTOR_SIBLINGS.left.width(x);
    GRID_SELECTOR_SIBLINGS.left.height(height);
    GRID_SELECTOR_SIBLINGS.right.css({ 'top': y, 'right': 0, 'left': x + width });
    GRID_SELECTOR_SIBLINGS.right.height(height);
}

function tick() {
    // Update the field and draw it
    var updates = [];
    var newField = [];

    for (var row = 0; row < field.length; row++) {
        var newRow = [];
        for (var column = 0; column < field[row].length; column++) {
            var neighborsCount = getNeighborsCount(row, column);
            var willBeAlive = neighborsCount == 3 || neighborsCount == 2 && field[row][column];

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
        newField.push(newRow);
    }
    field = newField;
    drawFieldUpdates(updates);
}

function getNeighborsCount(cellRow, cellColumn) {
    var rowIndices = [cellRow - 1, cellRow, cellRow + 1];
    var columnIndices = [cellColumn - 1, cellColumn, cellColumn + 1];

    var neighborsCount = 0;
    var _iteratorNormalCompletion4 = true;
    var _didIteratorError4 = false;
    var _iteratorError4 = undefined;

    try {
        for (var _iterator4 = rowIndices[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
            var rowIndex = _step4.value;

            // Handle out of bounds cases
            if (!infiniteEdges && (rowIndex < 0 || rowIndex >= field.length)) continue;
            var row = rowIndex.mod(field.length);

            var _iteratorNormalCompletion5 = true;
            var _didIteratorError5 = false;
            var _iteratorError5 = undefined;

            try {
                for (var _iterator5 = columnIndices[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                    var columnIndex = _step5.value;

                    // Handle out of bounds cases
                    if (!infiniteEdges && (columnIndex < 0 || columnIndex >= field[row].length)) continue;
                    var column = columnIndex.mod(field[row].length);

                    // Check the neighbor
                    if (field[row][column] == true && !(row == cellRow && column == cellColumn)) {
                        neighborsCount += 1;

                        // Return early for too many neighbors
                        if (neighborsCount > 3) return neighborsCount;
                    }
                }
            } catch (err) {
                _didIteratorError5 = true;
                _iteratorError5 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion5 && _iterator5.return) {
                        _iterator5.return();
                    }
                } finally {
                    if (_didIteratorError5) {
                        throw _iteratorError5;
                    }
                }
            }
        }
    } catch (err) {
        _didIteratorError4 = true;
        _iteratorError4 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion4 && _iterator4.return) {
                _iterator4.return();
            }
        } finally {
            if (_didIteratorError4) {
                throw _iteratorError4;
            }
        }
    }

    return neighborsCount;
}

function drawField() {
    for (var row = 0; row < field.length; row++) {
        for (var column = 0; column < field[row].length; column++) {
            shapes[row][column].visible = field[row][column] == true;
        }
    }
    STAGE.update();
}

function drawFieldUpdates(updates) {
    var _iteratorNormalCompletion6 = true;
    var _didIteratorError6 = false;
    var _iteratorError6 = undefined;

    try {
        for (var _iterator6 = updates[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
            var update = _step6.value;

            shapes[update.row][update.column].visible = update.alive;
        }
    } catch (err) {
        _didIteratorError6 = true;
        _iteratorError6 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion6 && _iterator6.return) {
                _iterator6.return();
            }
        } finally {
            if (_didIteratorError6) {
                throw _iteratorError6;
            }
        }
    }

    STAGE.update();
}

function updateField() {
    var numRows = getGSRows();
    var numColumns = getGSColumns();

    // Crop rows if necessary
    field = field.slice(0, numRows);
    // Add rows if necessary
    if (field.length < numRows) {
        var newRows = new Array(numRows - field.length).fill([]);
        Array.prototype.push.apply(field, newRows);
    }

    for (var row = 0; row < field.length; row++) {
        // Crop columns if necessary
        field[row] = field[row].slice(0, numColumns);
        // Add columns if necessary
        if (field[row].length < numColumns) {
            var newColumns = new Array(numColumns - field[row].length).fill(false);
            Array.prototype.push.apply(field[row], newColumns);
        }
    }

    // Make sure the shapes always match the field
    updateShapes();

    return field;
}

function updateShapes() {
    var force = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

    var numRows = getGSRows();
    var numColumns = getGSColumns();

    // Don't set new shapes if the dimensions match the field
    if (!force && shapes.length == numRows && shapes[0].length == numColumns) return;

    shapes = [];
    STAGE.removeAllChildren();
    for (var row = 0; row < numRows; row++) {
        var shapesRow = [];
        for (var column = 0; column < numColumns; column++) {
            // Create the shape
            var shape = getCellShape(column, row, cellColor);
            shape.visible = false;
            STAGE.addChild(shape);
            shapesRow.push(shape);
        }
        shapes.push(shapesRow);
    }

    drawField();
}

function getCellShape(column, row, color) {
    var margin = getMarginCells();

    var shape = new createjs.Shape();
    shape.graphics.beginFill(color).drawRect((column + margin) * cellSize, (row + margin) * cellSize, cellSize, cellSize);
    return shape;
}

function randomInit(density) {
    // Make sure the field matches the current grid selectors dimensions
    updateField();
    for (var row = 0; row < getGSRows(); row++) {
        for (var column = 0; column < getGSColumns(); column++) {
            field[row][column] = Math.random() <= density;
        }
    }
    drawField();
}
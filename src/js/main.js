/**
 * Created by Kilian on 06.09.17.
 */

// Util functions
Number.prototype.mod = function (n) {
    return ((this % n) + n) % n;
};

// Constants
const DEFAULT_CELL_COLOR = '#3F51B5';
const PATTERN_PREVIEW_COLOR = '#5fb4b5';
const GRID_MARGIN = 10;

// Semi-constant variables initialized once the document is ready
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
let cellSize = 24;
let field = null;
let shapes = [];
let patternPreviewShapes = [];

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

    // Initialize the grid and controls
    fitCanvasToGrid();
    updateCellSize(cellSize);
    initGridSelector();

    initializeControls();

    // Initialize the model
    const numRows = getSelectedGridRows();
    const numColumns = getSelectedGridColumns();
    field = new Field(numRows, numColumns);

    // Respond to window resizing
    $(window).resize(function () {
        clearTimeout(window.resizePaused);
        window.resizePaused = setTimeout(function () {
            // On resize end / pause
            fitCanvasToGrid();
            alignGridSelector();
            updateField();

            // Resizing will mess up the sliders
            initializeSettingsSliders();
        }, 250);
    });

    // Edit pixels on click on the grid
    GRID_SELECTOR.on('click.editCell', editCell);

    // Start the game
    randomInit(DENSITY_SLIDER.value / 100);
    createjs.Ticker.addEventListener('tick', function (event) {
        if (!event.paused) tick();
    });
    createjs.Ticker.setFPS(SPEED_SLIDER.value);
});

function initializeControls() {
    initializeSettingsMenu();
    initializePatternMenu();

    $('#pause-resume-button').click(togglePauseResume);
    $('#next-step-button').click(function () {
        pause();
        tick();
    });

    // Let the user start playing
    let explanation = $('#explanation');
    explanation.find('button').click(function () {
        explanation.hide();
    });
}

function initializeSettingsMenu() {
    // Initialize the menu elements
    initializeSettingsSliders();
    initializeSettingsCheckboxes();
    initializeCellColorPicker();
    initializeSettingsButtons();

    // Hide the menu on outside clicks
    $(document).click(function (event) {
        // Exclude clicks within the menu or on the menu button
        const target = $(event.target);
        if (!target.closest('#menu-button').length && !target.closest('#menu').length) {
            if (MENU.is(':visible')) MENU.hide();
        }
    });

    // Activate the control for opening the menu
    $('#menu-button').click(() => {
        MENU.show('fast');
    });
}

function initializeSettingsSliders() {
    // TODO: Copy MDC description of rendering in here
    let menuWasVisible = MENU.is(':visible') && MENU.hasClass('no-interaction-menu--open');
    MENU.addClass('no-interaction-menu--open');
    if (!menuWasVisible) MENU.show();

    // Initialize the sliders before hiding the menu, otherwise the initialization will fail
    SPEED_SLIDER = new mdc.slider.MDCSlider(document.querySelector('#speed-slider'));
    SPEED_SLIDER.step = 1;
    SPEED_SLIDER.listen('MDCSlider:input', () =>
        createjs.Ticker.setFPS(SPEED_SLIDER.value)
    );

    DENSITY_SLIDER = new mdc.slider.MDCSlider(document.querySelector('#density-slider'));
    DENSITY_SLIDER.step = 1;
    DENSITY_SLIDER.listen('MDCSlider:input', () =>
        DENSITY_VALUE_DISPLAY.html(DENSITY_SLIDER.value)
    );

    DENSITY_VALUE_DISPLAY.html(DENSITY_SLIDER.value);

    if (!menuWasVisible) MENU.hide();
}

function initializeSettingsCheckboxes() {
    mdc.checkbox.MDCCheckbox.attachTo(document.querySelector('.mdc-checkbox'));

    const infiniteEdgesCheckbox = $('#infinite-edges-checkbox');
    infiniteEdgesCheckbox.prop('checked', true);

    const incrementalUpdatesCheckbox = $('#incremental-updates-checkbox');
    incrementalUpdatesCheckbox.prop('checked', false);

    const editCellCheckbox = $('#edit-cells-checkbox');
    editCellCheckbox.prop('checked', true);
}

function initializeCellColorPicker() {
    let picker = $('#colorpicker');
    picker.spectrum({
        color: DEFAULT_CELL_COLOR,
        showPaletteOnly: true,
        showPalette: true,
        hideAfterPaletteSelect: true,
        palette: [
            ['#FFEB3B', '#FF9800', '#F44336', '#F50057'],
            ['#2196F3', '#00BCD4', '#009688', '#4CAF50'],
            ['#3F51B5', '#9C27B0', '#673AB7', '#000000']
        ],
        change: function (color) {
            // Change the cell color
            updateShapes(true);
        }
    });
    $('.sp-replacer').addClass('mdc-elevation--z3');
    $('.sp-container').addClass('mdc-elevation--z3');

    picker.val(DEFAULT_CELL_COLOR);
}

function initializeSettingsButtons() {
    $('#create-game-button').click(function () {
        pause();
        randomInit(DENSITY_SLIDER.value / 100);
        MENU.hide();
    });

    $('#clear-button').click(function () {
        randomInit(0);
        MENU.hide();
    });
}

function initializePatternMenu() {
    // Initialize the insert-pattern menu
    let insertPatternList = $('#insert-pattern-menu').find('ul');
    Object.keys(PATTERNS).forEach(patternName => {
        const pattern = PATTERNS[patternName];
        if (!pattern) return;

        const item = $('<li class="mdc-list-item" role="menuitem" tabindex="0"></li>');
        item.html(patternName);
        item.click(() => startInsertPatternMode(pattern));
        insertPatternList.append(item);
    });

    let insertPatternMenu = new mdc.menu.MDCSimpleMenu(
        document.querySelector('#insert-pattern-menu')
    );

    // Activate the control for opening the menu
    $('#insert-pattern-button').click(() => {
        insertPatternMenu.open = !insertPatternMenu.open;
    });
}

function fitCanvasToGrid() {
    // Let the canvas fill the game area
    $('canvas').each(function (_, el) {
        const canvas = el.getContext('2d').canvas;
        canvas.width = GRID.width();
        canvas.height = GRID.height();
    });
}

function editCell(event) {
    let editCellsOnClick = $('#edit-cells-checkbox').prop('checked');
    if (!editCellsOnClick || MENU.is(':visible')) return;

    const [row, column] = getMouseCellCoords(event);
    const fieldUpdate = field.flipCell(row, column);
    if (fieldUpdate) {
        drawFieldUpdates([fieldUpdate]);
    }
}

function startInsertPatternMode(pattern) {
    // Cancel a possibly active preview mode
    stopInsertPatternMode();

    // Deactivate the cell editing handler to make sure our on click handler for the grid selector
    // is the only one.
    GRID_SELECTOR.off('click.editCell');

    // Show the pattern where the mouse is
    GRID_SELECTOR.mousemove(function (event) {
        let [centerRow, centerColumn] = getMouseCellCoords(event);
        showPatternPreview(pattern, centerColumn, centerRow);
    });

    GRID_SELECTOR.on('click.insertPattern', function (event) {
        let [centerRow, centerColumn] = getMouseCellCoords(event);

        // Set the pattern in the field
        setPattern(pattern, centerRow, centerColumn);

        // Stop the pattern previews
        stopInsertPatternMode();
    });
}

function stopInsertPatternMode() {
    hidePatternPreview();
    // Cancel a possibly active preview mode
    GRID_SELECTOR.off('mousemove');
    GRID_SELECTOR.off('click.insertPattern');
    GRID_SELECTOR.on('click.editCell', editCell);
}

function setPattern(pattern, centerRow, centerColumn) {
    const fieldUpdates = field.setPattern(pattern, centerRow, centerColumn);
    drawFieldUpdates(fieldUpdates);
}

function getMouseCellCoords(event) {
    // Get the mouse position relative to the grid
    let gridOffset = GRID_SELECTOR.offset();
    let x = event.pageX - gridOffset.left;
    let y = event.pageY - gridOffset.top;

    let row = Math.floor(y / cellSize);
    let column = Math.floor(x / cellSize);
    return [row, column];
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

function getSelectedGridRows() {
    return parseFloat(GRID_SELECTOR.attr('data-rows'));
}

function getSelectedGridColumns() {
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
            if (event.rect.right >= GRID.width() - getMarginCells() * cellSize &&
                event.rect.bottom >= GRID.height() - getMarginCells() * cellSize) {
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
    let columns = getSelectedGridColumns();
    let rows = getSelectedGridRows();

    // Increase the cell size until maxRows <= rows or maxColumns <= columns
    // We cannot calculate the exact factor for increasing the cell size because a ratio like
    // cellSize *= maxColumns / columns depends on maxColumns, which in turn depends on the cell
    // size. Using a ratio like this will result in a 3 row grid when resizing from 50 rows to 5 for
    // example.
    let newCellSize = cellSize;
    while (rows < getMaxGridRows(newCellSize) && columns < getMaxGridColumns(newCellSize)) {
        newCellSize *= 1.01;
    }
    updateCellSize(newCellSize);
    alignGridSelector(columns, rows);
    updateField();
}

function getMaxGridColumns(_cellSize) {
    _cellSize = (typeof _cellSize != 'undefined') ? _cellSize : cellSize;
    return Math.floor(GRID.width() / _cellSize) - 2 * getMarginCells(_cellSize);
}

function getMaxGridRows(_cellSize) {
    _cellSize = (typeof _cellSize != 'undefined') ? _cellSize : cellSize;
    return Math.floor(GRID.height() / _cellSize) - 2 * getMarginCells(_cellSize);
}

function alignGridSelector(desiredColumns, desiredRows) {
    // Default is to keep the same number of columns and rows
    if (typeof desiredColumns == 'undefined') desiredColumns = getSelectedGridColumns();
    if (typeof desiredRows == 'undefined') desiredRows = getSelectedGridRows();

    // Stay within the grid
    desiredColumns = Math.max(desiredColumns, 5);
    desiredRows = Math.max(desiredRows, 5);
    desiredColumns = Math.min(getMaxGridColumns(), desiredColumns);
    desiredRows = Math.min(getMaxGridRows(), desiredRows);

    // Align the position to the grid
    let roundedColumns = Math.round(desiredColumns);
    let roundedRows = Math.round(desiredRows);
    GRID_SELECTOR.attr('data-columns', roundedColumns);
    GRID_SELECTOR.attr('data-rows', roundedRows);
    updateGridSelector(roundedColumns * cellSize, roundedRows * cellSize);
}

function getMarginCells(_cellSize) {
    _cellSize = (typeof _cellSize != 'undefined') ? _cellSize : cellSize;
    return Math.ceil(GRID_MARGIN / _cellSize);
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
    let infiniteEdges = $('#infinite-edges-checkbox').prop('checked');
    let incrementalUpdates = $('#incremental-updates-checkbox').prop('checked');
    let updates = field.step(infiniteEdges, incrementalUpdates);
    drawFieldUpdates(updates);
}

function drawField() {
    field.forEach((row, column, isAlive) => {
        shapes[row][column].visible = isAlive;
    });
    STAGE.update();
}

function drawFieldUpdates(updates) {
    for (let update of updates) {
        shapes[update.row][update.column].visible = update.alive;
    }
    STAGE.update();
}

function randomInit(density) {
    // Make sure the field matches the current grid selectors dimensions
    updateField();
    field.randomInit(density);
    drawField();
}

function updateField() {
    const numRows = getSelectedGridRows();
    const numColumns = getSelectedGridColumns();

    field.updateSize(numRows, numColumns);

    // Make sure the shapes always match the field
    updateShapes();
}

function updateShapes(force = false) {
    const numRows = getSelectedGridRows();
    const numColumns = getSelectedGridColumns();

    // Don't set new shapes if the dimensions match the field
    if (!force && shapes.length == numRows && shapes[0].length == numColumns) return;

    shapes = [];
    STAGE.removeAllChildren();
    for (let row = 0; row < numRows; row++) {
        let shapesRow = [];
        for (let column = 0; column < numColumns; column++) {
            // Create the shape
            const cellColor = $('#colorpicker').val();
            const shape = getCellShape(column, row, cellColor);
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
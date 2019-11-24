/**
 * @fileoverview The game's View-Controller connecting the game's model to the document.
 */

// Constants
const DEFAULT_CELL_COLOR = '#3F51B5';
const PATTERN_PREVIEW_COLOR = '#5fb4b5';
const MIN_GRID_MARGIN = 10; // Minimum number of pixels between the active game area and the window

// Semi-constant variables initialized once the document is ready

/**
 * createjs.Stage instance responsible for drawing on the canvas
 * @type {createjs.Shape}
 */
let STAGE = null;

/**
 * The grid is an empty element, whose repeated background pattern draws the game's grid.
 * @type {jQuery}
 */
let GRID = null;

/**
 * The grid selector is a box on top of the grid, with which the user can modify the game's area.
 * @type {jQuery}
 */
let GRID_SELECTOR = null;

/**
 * The siblings are boxes for graying out the area outside of the game.
 * @type {{top: jQuery, right: jQuery, bottom: jQuery, left: jQuery}}
 */
let GRID_SELECTOR_SIBLINGS = {
    top: null, right: null, bottom: null, left: null
};

/**
 * The settings menu element.
 * @type {jQuery}
 */
let MENU = null;

/**
 * Material design slider for setting the field initialization density.
 * @type {MDCSlider}
 */
let DENSITY_SLIDER = null;

/**
 * Material design slider for setting the speed.
 * @type {MDCSlider}
 */
let SPEED_SLIDER = null;

// Global variables
let cellSize = 12; // Cell width and height in pixels

/**
 * The model
 * @type {Field}
 */
let field = null;

/**
 * The shapes of the cells for drawing on the canvas.
 * @type {Array<createjs.Shape>}
 */
let shapes = [];

/**
 * The shapes of the pattern preview cells for drawing on the canvas.
 * @type {Array<createjs.Shape>}
 */
let patternPreviewShapes = [];

// Initialize the game when the document is ready
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

    // Initialize the grid and controls
    fitCanvasToGrid();
    updateCellSize(cellSize);
    initializeGridSelector();
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
            updateFieldSize();

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

/**
 * Initializes the game's UI controls.
 */
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

/**
 * Initializes the settings menu.
 */
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

/**
 * Initializes the sliders in the settings menu.
 *
 * This sets the global SPEED_SLIDER and DENSITY_SLIDER variables. The MDCSlider instance's UI is
 * updated based on the values read when it is instantiated. Thus, we have to display the menu and
 * then hide it again after the slider's initialization. Also, this function needs to be called on
 * window size changes.
 */
function initializeSettingsSliders() {
    // Display the menu for instantiating the sliders
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
    const densityDisplay = $('#density-value-display');
    DENSITY_SLIDER.listen('MDCSlider:input', () => {
        densityDisplay.html(DENSITY_SLIDER.value);
    });
    densityDisplay.html(DENSITY_SLIDER.value);

    if (!menuWasVisible) MENU.hide();
}

/**
 * Initializes the checkboxes in the settings menu.
 */
function initializeSettingsCheckboxes() {
    mdc.checkbox.MDCCheckbox.attachTo(document.querySelector('.mdc-checkbox'));

    const infiniteEdgesCheckbox = $('#infinite-edges-checkbox');
    infiniteEdgesCheckbox.prop('checked', false);

    const incrementalUpdatesCheckbox = $('#incremental-updates-checkbox');
    incrementalUpdatesCheckbox.prop('checked', false);

    const editCellCheckbox = $('#edit-cells-checkbox');
    editCellCheckbox.prop('checked', true);
}

/**
 * Initializes the cell color picker.
 */
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

/**
 * Initializes the buttons in the settings menu.
 */
function initializeSettingsButtons() {
    $('#create-game-button').click(function () {
        pause();
        randomInit(DENSITY_SLIDER.value / 100);
        MENU.hide();
    });

    $('#clear-button').click(function () {
        // Create a game with zero density
        randomInit(0);
        MENU.hide();
    });
}

/**
 * Initializes the menu for inserting patterns.
 */
function initializePatternMenu() {
    // Fill the list of patterns
    let insertPatternList = $('#insert-pattern-menu').find('ul');
    Object.keys(PATTERNS).forEach(patternName => {
        const pattern = PATTERNS[patternName];
        const item = $('<li class="mdc-list-item" role="menuitem" tabindex="0"></li>');
        item.html(patternName);

        // Set the listener for inserting the pattern
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

/**
 * Resizes the game's canvas to fit it to the dimensions of the grid.
 */
function fitCanvasToGrid() {
    // Let the canvas fill the game area
    $('canvas').each(function (_, el) {
        const canvas = el.getContext('2d').canvas;
        canvas.width = GRID.width();
        canvas.height = GRID.height();
    });
}

/**
 * Flips the cell at the position given by the click event if cell-editing is activated.
 * @param {!Event} event
 */
function editCell(event) {
    // Return if cell-editing is deactivated or the click closed the menu.
    let editCellsOnClick = $('#edit-cells-checkbox').prop('checked');
    if (!editCellsOnClick || MENU.is(':visible')) return;

    const [row, column] = getMouseCellCoords(event);
    const fieldUpdate = field.flipCell(row, column);
    if (fieldUpdate) {
        drawFieldUpdates([fieldUpdate]);
    }
}

/**
 * Displays a preview of the given pattern at the mouse position and draws the pattern onto the
 * field when the grid is clicked.
 * @param {!Array<Array<number>>} pattern - An array of <row, column> tuples. Each entry
 *      contains the coordinates of a living cell relative to the given center coordinates.
 */
function startInsertPatternMode(pattern) {
    // Cancel a possibly active preview mode
    stopInsertPatternMode();

    // Deactivate the cell editing handler to make sure our on click handler for the grid selector
    // is the only one.
    GRID_SELECTOR.off('click.editCell');

    // Show the pattern where the mouse is
    GRID_SELECTOR.mousemove(function (event) {
        let [centerRow, centerColumn] = getMouseCellCoords(event);
        showPatternPreview(pattern, centerRow, centerColumn);
    });

    // Insert the pattern on click.
    GRID_SELECTOR.on('click.insertPattern', function (event) {
        let [centerRow, centerColumn] = getMouseCellCoords(event);

        // Set the pattern in the field
        const fieldUpdates = field.setPattern(pattern, centerRow, centerColumn);
        drawFieldUpdates(fieldUpdates);

        // Stop the pattern previews
        stopInsertPatternMode();
    });
}

/**
 * Stops an active insert pattern mode. See startInsertPatternMode() for more details.
 */
function stopInsertPatternMode() {
    hidePatternPreview();
    // Cancel a possibly active preview mode
    GRID_SELECTOR.off('mousemove');
    GRID_SELECTOR.off('click.insertPattern');
    GRID_SELECTOR.on('click.editCell', editCell);
}

/**
 * Returns the row and column of a mouse event relative to the active game area.
 * @param {!Event} event
 * @returns {[!number, !number]}
 */
function getMouseCellCoords(event) {
    // Get the mouse position relative to the grid
    let gridOffset = GRID_SELECTOR.offset();
    let x = event.pageX - gridOffset.left;
    let y = event.pageY - gridOffset.top;

    let row = Math.floor(y / cellSize);
    let column = Math.floor(x / cellSize);
    return [row, column];
}

/**
 * Displays a pattern in preview mode. This means the cells are colored with the
 * PATTERN_PREVIEW_COLOR but they do not actually influence the game. Thus, this does not manipulate
 * the field, only the canvas.
 * @param {!Array<Array<number>>} pattern - An array of <row, column> tuples. Each entry
 *      contains the coordinates of a living cell relative to the given center coordinates.
 * @param {!number} centerRow - The row of the pattern's center.
 * @param {!number} centerColumn - The column of the pattern's center.
 */
function showPatternPreview(pattern, centerRow, centerColumn) {
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

/**
 * Hides a possibly displayed pattern in preview mode. See showPatternPreview() for more details.
 */
function hidePatternPreview() {
    for (let shape of patternPreviewShapes) {
        STAGE.removeChild(shape);
    }
}

/**
 * Pauses the game / the field updates
 */
function pause() {
    if (!createjs.Ticker.paused) togglePauseResume();
}

/**
 * Pauses or resumes the game / the field updates
 */
function togglePauseResume() {
    let button = $('#pause-resume-button');
    createjs.Ticker.paused = !createjs.Ticker.paused;
    let icon = createjs.Ticker.paused ? 'play_arrow' : 'pause';
    button.find('.material-icons').first().html(icon);
}

/**
 * Returns the number of rows based on the grid selector. This constitutes the rows of the active
 * game area.
 * @returns {!Number} - The number of rows
 */
function getSelectedGridRows() {
    return parseFloat(GRID_SELECTOR.attr('data-rows'));
}


/**
 * Returns the number of columns based on the grid selector. This constitutes the columns of the
 * active game area.
 * @returns {!Number} - The number of columns
 */
function getSelectedGridColumns() {
    return parseFloat(GRID_SELECTOR.attr('data-columns'));
}

/**
 * Initializes the grid selector and its ability to resize the game area.
 */
function initializeGridSelector() {
    // Let the grid selector fill all available space
    alignGridSelector(Infinity, Infinity);

    // Make the grid selector / active game area resizable
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
            // If the rect exceeds the visible grid in the bottom right, increase the number of rows
            // and columns
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

/**
 * Increases the number of rows and columns by decreasing the cell size exponentially. The minimum
 * cell size is 4px. This will update the shapes / the canvas but not the model's field size.
 */
function increaseGrid() {
    // Change the grid
    let newCellSize = Math.max(cellSize * 0.9, 4);

    // Check if there is nothing to do
    if (cellSize == newCellSize) return;
    updateCellSize(newCellSize);

    // Don't update the field, only the shapes
    updateShapes();
}

/**
 * Updates the grid's cell size. This does not update the shapes on the canvas nor the model.
 * @param {!number} newCellSize - The new cell size in px.
 */
function updateCellSize(newCellSize) {
    // Round to 0 decimal places for the px value in CSS. The cell size needs to be rounded
    // accordingly, otherwise the grid pattern background won't align with the canvas and grid
    // selector.
    cellSize = Math.round(newCellSize * 10) / 10;
    let imageUrl = "img/grid32@2x.png";
    if (8 < cellSize && cellSize <= 16) {
        imageUrl = "img/grid16@2x.png";
    } else if (4 < cellSize && cellSize <= 8) {
        imageUrl = "img/grid8@2x.png";
    } else if (cellSize <= 4) {
        imageUrl = "img/grid4@2x.png";
    }

    // Update the grid
    const styleVal = cellSize * 10 + 'px ' + cellSize * 10 + 'px';
    GRID.css('background-size', styleVal);
    GRID.css('background-image', 'url("' + imageUrl + '")');
}

/**
 * Fits the grid to the available space given by the window while preserving the ratio between
 * columns and rows.
 */
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
    updateFieldSize();
}

/**
 * Returns the maximum number of grid columns for a hypothetical cell size based on the grid's
 * width.
 * @param {!number} _cellSize - The hypothetical cell size in px.
 * @returns {!number} - The number of columns
 */
function getMaxGridColumns(_cellSize) {
    _cellSize = (typeof _cellSize != 'undefined') ? _cellSize : cellSize;
    return Math.floor(GRID.width() / _cellSize) - 2 * getMarginCells(_cellSize);
}


/**
 * Returns the maximum number of grid rows for a hypothetical cell size based on the grid's height.
 * @param {!number} _cellSize - The hypothetical cell size in px.
 * @returns {!number} - The number of rows
 */
function getMaxGridRows(_cellSize) {
    _cellSize = (typeof _cellSize != 'undefined') ? _cellSize : cellSize;
    return Math.floor(GRID.height() / _cellSize) - 2 * getMarginCells(_cellSize);
}

/**
 * Returns the number of margin cells needed to fulfill the minimum grid margin [px] based on a
 * given cell size.
 * @param {!number} _cellSize - The cell size in px.
 * @returns {!number} - The number of cells
 */
function getMarginCells(_cellSize) {
    _cellSize = (typeof _cellSize != 'undefined') ? _cellSize : cellSize;
    return Math.ceil(MIN_GRID_MARGIN / _cellSize);
}

/**
 * Align the grid selector to the grid based on the given number of columns and rows. These can be
 * floating point numbers of any value (also Infinity). The grid selector element will always align
 * with the grid's cells, fill at most the grid and at least 5x5 cells.
 *
 * Use getSelectedGridRows() and getSelectedGridColumns() to retrieve the grid selectors actual row
 * and column count.
 *
 * @param {!number} desiredColumns - Desired number of columns. May be a float.
 * @param {!number} desiredRows - Desired number of rows. May be a float.
 */
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

/**
 * Updates the grid selector's position and size. This will also update the grid selector's
 * siblings, which are boxes for graying out the area outside of the active game area.
 * @param {!number} width - Number of pixels.
 * @param {!number} height - Number of pixels.
 * @param {!number} x - Number of pixels from the left.
 * @param {!number} y - Number of pixels from the top.
 */
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

/**
 * Calculates the next generation / step of the field and draws it to the canvas
 */
function tick() {
    // Update the field and draw it
    let infiniteEdges = $('#infinite-edges-checkbox').prop('checked');
    let incrementalUpdates = $('#incremental-updates-checkbox').prop('checked');
    let updates = field.step(infiniteEdges, incrementalUpdates);
    drawFieldUpdates(updates);
}

/**
 * Redraws the complete field cell by cell to the canvas. When updating a few cells, use
 * drawFieldUpdates() for a more efficient way.
 */
function drawField() {
    field.forEach((row, column, isAlive) => {
        shapes[row][column].visible = isAlive;
    });
    STAGE.update();
}

/**
 * Updates the game's canvas based on a given array of field updates.
 * @param {!Array<FieldUpdate>} updates
 */
function drawFieldUpdates(updates) {
    for (let update of updates) {
        shapes[update.row][update.column].visible = update.isAlive;
    }
    STAGE.update();
}

/**
 * Randomly (re)initializes the field and canvas with a given cell density
 * @param {!number} density - The probability of a cell being active.
 */
function randomInit(density) {
    // Make sure the field matches the current grid selectors dimensions
    updateFieldSize();
    field.randomInit(density);
    drawField();
}

/**
 * Updates the field's and shapes' sizes according to the number of columns and rows given by the
 * grid selector element.
 */
function updateFieldSize() {
    const numRows = getSelectedGridRows();
    const numColumns = getSelectedGridColumns();

    field.updateSize(numRows, numColumns);

    // Make sure the shapes always match the field
    updateShapes();
}


/**
 * Updates the shapes array's dimensions according to the number of columns and rows given by the
 * grid selector element.
 * @param {boolean} force - If True, the shapes will be recreated, even if the dimensions of the
 *      shapes array already match the grid selector's dimensions.
 */
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
            const cellColor = $('#colorpicker').val() || DEFAULT_CELL_COLOR;
            const shape = getCellShape(column, row, cellColor);
            shape.visible = false;
            STAGE.addChild(shape);
            shapesRow.push(shape);
        }
        shapes.push(shapesRow);
    }

    drawField();
}

/**
 * Returns a new cell shape for drawing onto the canvas with the given coordinates and color.
 * @param {!number} column - The cell's column.
 * @param {!number} row - The cell's row.
 * @param {!String} color - A CSS compatible color value (ex. "red", "#FF0000", or
 * "rgba(255,0,0,0.5)"). Setting to null will result in no fill.
 * @returns {createjs.Shape}
 */
function getCellShape(column, row, color) {
    let margin = getMarginCells();

    const shape = new createjs.Shape();
    shape.graphics
        .beginFill(color)
        .drawRect((column + margin) * cellSize, (row + margin) * cellSize, cellSize, cellSize);
    return shape;
}
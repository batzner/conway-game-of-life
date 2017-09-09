/**
 * Created by Kilian on 06.09.17.
 */

// Semi-constant variables
let STAGE = null;
let GRID = null;
let GRID_SELECTOR = null;

// Global variables
let cellSize = 48;
let field = null;
let shapes = null;

$(function () {
    // Initialize the semi-constants
    STAGE = new createjs.Stage("canvas");
    GRID = $("#grid");
    GRID_SELECTOR = $("#grid-selector");

    // Let the canvas fill the screen
    $("canvas").each(function (_, el) {
        const canvas = el.getContext("2d").canvas;
        canvas.width = $(window).width();
        canvas.height = $(window).height();
    });

    // Initialize the game objects
    field = getField(5, 10);
    shapes = getShapes(STAGE, getNumRows(), getNumColumns());

    // Start the game
    randomInit();
    drawField();
    createjs.Ticker.addEventListener("tick", tick);
    createjs.Ticker.setFPS(20);

    // TMP
    initGridSelector();
});

function getNumRows() {
    return field.length;
}

function getNumColumns() {
    return field[0] ? field[0].length : undefined;
}

function initGridSelector() {
    GRID_SELECTOR.attr("data-width", GRID_SELECTOR.width() / cellSize);
    GRID_SELECTOR.attr("data-height", GRID_SELECTOR.height() / cellSize);
    GRID_SELECTOR.attr("data-x", GRID_SELECTOR.position().left / cellSize);
    GRID_SELECTOR.attr("data-y", GRID_SELECTOR.position().top / cellSize);

    // Taken from http://interactjs.io/
    interact("#grid-selector")
        .draggable({
            onmove: function (event) {
                // Get the current (not rounded) position
                let x = parseFloat(GRID_SELECTOR.attr("data-x"));
                let y = parseFloat(GRID_SELECTOR.attr("data-y"));

                // Change the desired (not rounded) position
                x += event.dx / cellSize;
                y += event.dy / cellSize;

                // Store the desired position in the data-x/data-y attributes and align the grid
                GRID_SELECTOR.attr("data-x", x);
                GRID_SELECTOR.attr("data-y", y);
                alignGridSelector();
            }
        })
        .resizable({
            edges: {left: false, right: true, bottom: true, top: false}
        })
        .on("resizemove", function (event) {
            // If the rect exceeds the visible grid, increase the visible grid
            if (event.rect.right >= GRID.width() || event.rect.bottom >= GRID.height()) {
                increaseGrid();
            }
            // Get the current (not rounded) position
            let x = parseFloat(GRID_SELECTOR.attr("data-x"));
            let y = parseFloat(GRID_SELECTOR.attr("data-y"));

            // Change the desired (not rounded) position
            let width = (event.rect.right / cellSize) - x;
            let height = (event.rect.bottom / cellSize) - y;

            // Store the desired position in the data-x/data-y attributes and align the grid
            GRID_SELECTOR.attr("data-width", width);
            GRID_SELECTOR.attr("data-height", height);
            alignGridSelector();
        });
}

function increaseGrid() {
    // Change the grid
    cellSize = Math.max(cellSize - 0.5, 4);
    const styleVal = cellSize * 10 + "px " + cellSize * 10 + "px";
    GRID.css("background-size", styleVal);
}

function alignGridSelector() {
    // Get the desired position
    const x = parseFloat(GRID_SELECTOR.attr("data-x"));
    const y = parseFloat(GRID_SELECTOR.attr("data-y"));
    const width = parseFloat(GRID_SELECTOR.attr("data-width"));
    const height = parseFloat(GRID_SELECTOR.attr("data-height"));

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

    GRID_SELECTOR.width(roundedWidth * cellSize);
    GRID_SELECTOR.height(roundedHeight * cellSize);
    GRID_SELECTOR.css("webkitTransform", "translate("
        + (roundedX * cellSize) + "px,"
        + (roundedY * cellSize) + "px)");
    GRID_SELECTOR.css("transform", GRID_SELECTOR.css("webkitTransform"));
}

function tick() {
    // Update the field and draw it
    for (let row = 0; row < getNumRows(); row++) {
        for (let column = 0; column < getNumColumns(); column++) {
            const neighborsCount = getNeighborsCount(row, column);
            field[row][column] = neighborsCount == 3 || neighborsCount == 2 && field[row][column];
        }
    }

    drawField();
}

function getNeighborsCount(cellRow, cellColumn) {
    const rowStart = Math.max(cellRow - 1, 0);
    const rowEnd = Math.min(cellRow + 2, getNumRows());
    const columnStart = Math.max(cellColumn - 1, 0);
    const columnEnd = Math.min(cellColumn + 2, getNumColumns());

    let neighborsCount = 0;

    for (let row = rowStart; row < rowEnd; row++) {
        for (let column = columnStart; column < columnEnd; column++) {
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

function getField(rows, columns) {
    let field = [];
    for (let row = 0; row < rows; row++) {
        let entriesRow = [];
        for (let column = 0; column < columns; column++) {
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
                .beginFill("rgba(255,0,0,0.2)")
                .drawRect(column * cellSize, row * cellSize, cellSize, cellSize);
            stage.addChild(shape);

            shapesRow.push(shape);
        }
        shapes.push(shapesRow);
    }
    return shapes;
}

function randomInit() {
    for (let row = 0; row < getNumRows(); row++) {
        for (let column = 0; column < getNumColumns(); column++) {
            field[row][column] = Math.random() < 0.2;
        }
    }
}
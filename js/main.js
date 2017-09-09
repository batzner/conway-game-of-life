/**
 * Created by Kilian on 06.09.17.
 */

const NUM_ROWS = 12;
const NUM_COLUMNS = 24;

const FIELD = getField(NUM_ROWS, NUM_COLUMNS);

// Semi-constant variables
let STAGE = null;
let SHAPES = null;
let GRID = null;
let GRID_SELECTOR = null;

let cellSize = 48;

$(function () {
    // Initialize the semi-constants
    STAGE = new createjs.Stage("canvas");
    SHAPES = getShapes(STAGE, NUM_ROWS, NUM_COLUMNS);
    GRID = $("#grid");
    GRID_SELECTOR = $("#grid-selector");

    // Let the canvas fill the screen
    $("canvas").each(function (_, el) {
        const canvas = el.getContext("2d").canvas;
        canvas.width = $(window).width();
        canvas.height = $(window).height();
    });

    randomInit();
    drawField();
    createjs.Ticker.addEventListener("tick", tick);
    createjs.Ticker.setFPS(20);

    // TMP
    initGridSelector();
});

function initGridSelector() {
    // Taken from http://interactjs.io/
    interact("#grid-selector")
        .draggable({
            onmove: function (event) {
                // Get the current (not rounded) position
                let x = parseFloat(GRID_SELECTOR.attr("data-x")) || GRID_SELECTOR.position().left;
                let y = parseFloat(GRID_SELECTOR.attr("data-y")) || GRID_SELECTOR.position().top;

                // Change the desired (not rounded) position
                x += event.dx;
                y += event.dy;

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
            let width = parseFloat(GRID_SELECTOR.attr("data-width")) || GRID_SELECTOR.width();
            let height = parseFloat(GRID_SELECTOR.attr("data-height")) || GRID_SELECTOR.height();

            // Change the desired (not rounded) position
            width += event.dx;
            height += event.dy;

            // Store the desired position in the data-x/data-y attributes and align the grid
            GRID_SELECTOR.attr("data-width", width);
            GRID_SELECTOR.attr("data-height", height);
            alignGridSelector();
        });
}

function increaseGrid() {
    // Keep the top left grid selector edge at the same column and row.
    let x = parseFloat(GRID_SELECTOR.attr("data-x")) || GRID_SELECTOR.position().left;
    let y = parseFloat(GRID_SELECTOR.attr("data-y")) || GRID_SELECTOR.position().top;
    let gridColumn = Math.round(x / cellSize);
    let gridRow = Math.round(y / cellSize);

    // Change the grid
    cellSize = Math.max(cellSize - 0.5, 4);
    const styleVal = cellSize * 10 + "px " + cellSize * 10 + "px";
    GRID.css("background-size", styleVal);

    // Update the grid selector x and y attributes to keep the same column and row
    let newX = gridColumn * cellSize;
    let newY = gridRow * cellSize;
    GRID_SELECTOR.attr("data-x", newX);
    GRID_SELECTOR.attr("data-y", newY);

    // We need to change the width and the height by the negative change of x and y to make sure
    // the bottom right edge stays at the cursor during the resizing
    let width = parseFloat(GRID_SELECTOR.attr("data-width")) || GRID_SELECTOR.width();
    let height = parseFloat(GRID_SELECTOR.attr("data-height")) || GRID_SELECTOR.height();
    GRID_SELECTOR.attr("data-width", width - (newX - x));
    GRID_SELECTOR.attr("data-height", height - (newY - y));

    alignGridSelector();
}

function alignGridSelector() {
    // Get the desired position
    const x = parseFloat(GRID_SELECTOR.attr("data-x")) || GRID_SELECTOR.position().left;
    const y = parseFloat(GRID_SELECTOR.attr("data-y")) || GRID_SELECTOR.position().top;
    const width = parseFloat(GRID_SELECTOR.attr("data-width")) || GRID_SELECTOR.width();
    const height = parseFloat(GRID_SELECTOR.attr("data-height")) || GRID_SELECTOR.height();

    // Align the position to the grid
    let roundedX = Math.round(x / cellSize) * cellSize;
    let roundedY = Math.round(y / cellSize) * cellSize;
    let roundedWidth = Math.round(width / cellSize) * cellSize;
    let roundedHeight = Math.round(height / cellSize) * cellSize;

    // Stay within the grid
    let rightLimit = Math.round(GRID.width() / cellSize) * cellSize;
    let bottomLimit = Math.round(GRID.height() / cellSize) * cellSize;

    // Lower bounds
    roundedWidth = Math.max(roundedWidth, 0);
    roundedHeight = Math.max(roundedHeight, 0);

    // Upper bounds
    roundedWidth = Math.min(rightLimit - roundedX, roundedWidth);
    roundedHeight = Math.min(bottomLimit - roundedY, roundedHeight);

    GRID_SELECTOR.width(roundedWidth);
    GRID_SELECTOR.height(roundedHeight);
    GRID_SELECTOR.css("webkitTransform", "translate(" + roundedX + "px," + roundedY + "px)");
    GRID_SELECTOR.css("transform", GRID_SELECTOR.css("webkitTransform"));
}

function tick() {
    // Update the field and draw it
    for (let row = 0; row < FIELD.length; row++) {
        for (let column = 0; column < FIELD[row].length; column++) {
            const neighborsCount = getNeighborsCount(row, column);
            FIELD[row][column] = neighborsCount == 3 || neighborsCount == 2 && FIELD[row][column];
        }
    }

    drawField();
}

function getNeighborsCount(cellRow, cellColumn) {
    const rowStart = Math.max(cellRow - 1, 0);
    const rowEnd = Math.min(cellRow + 2, NUM_ROWS);
    const columnStart = Math.max(cellColumn - 1, 0);
    const columnEnd = Math.min(cellColumn + 2, NUM_COLUMNS);

    let neighborsCount = 0;

    for (let row = rowStart; row < rowEnd; row++) {
        for (let column = columnStart; column < columnEnd; column++) {
            if (FIELD[row][column] == true && !(row == cellRow && column == cellColumn)) {
                neighborsCount += 1;

                // Return early for too many neighbors
                if (neighborsCount > 3) return neighborsCount;
            }
        }
    }
    return neighborsCount;
}

function drawField() {
    for (let row = 0; row < FIELD.length; row++) {
        for (let column = 0; column < FIELD[row].length; column++) {
            SHAPES[row][column].visible = FIELD[row][column] == true;
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
    for (let row = 0; row < FIELD.length; row++) {
        for (let column = 0; column < FIELD[row].length; column++) {
            FIELD[row][column] = Math.random() < 0.2;
        }
    }
}
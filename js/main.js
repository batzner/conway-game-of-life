/**
 * Created by Kilian on 06.09.17.
 */

const CELL_WIDTH = 12;
const CELL_HEIGHT = 12;
const NUM_ROWS = 50;
const NUM_COLUMNS = 100;

const FIELD = getField(NUM_ROWS, NUM_COLUMNS);

let STAGE = null;
let SHAPES = null;

$(function () {
    // Initialize the semi-constants
    STAGE = new createjs.Stage("canvas");
    SHAPES = getShapes(STAGE, NUM_ROWS, NUM_COLUMNS);

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
});

function tick() {
    // Update the field and draw it
    for (let row =0; row < FIELD.length; row++) {
        for (let column = 0; column < FIELD[row].length; column++) {
            const neighborsCount = getNeighborsCount(row, column);
            FIELD[row][column] = neighborsCount == 3 || neighborsCount == 2 && FIELD[row][column];
        }
    }

    drawField();
}

function getNeighborsCount(cellRow, cellColumn) {
    const rowStart = Math.max(cellRow-1, 0);
    const rowEnd = Math.min(cellRow+2, NUM_ROWS);
    const columnStart = Math.max(cellColumn-1, 0);
    const columnEnd = Math.min(cellColumn+2, NUM_COLUMNS);

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
    for (let row =0; row < FIELD.length; row++) {
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
                .beginFill('rgba(255,0,0,0.2)')
                .drawRect(column * CELL_WIDTH, row * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
            stage.addChild(shape);

            shapesRow.push(shape);
        }
        shapes.push(shapesRow);
    }
    return shapes;
}

function randomInit() {
    for (let row =0; row < FIELD.length; row++) {
        for (let column = 0; column < FIELD[row].length; column++) {
            FIELD[row][column] = Math.random() < 0.1;
        }
    }
}
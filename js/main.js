/**
 * Created by Kilian on 06.09.17.
 */

const CELL_WIDTH = 48;
const CELL_HEIGHT = 48;
const NUM_ROWS = 12;
const NUM_COLUMNS = 24;

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

    // TMP
    initGridSelector();
});

function initGridSelector() {
    // Taken from http://interactjs.io/
    interact("#grid-selector")
        .draggable({
            onmove: function (event) {
                // Taken from http://interactjs.io/
                const target = event.target;
                // keep the dragged position in the data-x/data-y attributes
                const x = (parseFloat(target.getAttribute("data-x")) || 0) + event.dx;
                const y = (parseFloat(target.getAttribute("data-y")) || 0) + event.dy;

                updateGridSelector(target, x, y, target.style.width, target.style.height);
            }
        })
        .resizable({
            edges: {left: true, right: true, bottom: true, top: true}
        })
        .on("resizemove", function (event) {
            const target = event.target;
            let x = (parseFloat(target.getAttribute("data-x")) || 0);
            let y = (parseFloat(target.getAttribute("data-y")) || 0);

            // translate when resizing from top or left edges
            x += event.deltaRect.left;
            y += event.deltaRect.top;

            updateGridSelector(target, x, y, event.rect.width, event.rect.height);
        });
}

function updateGridSelector(target, x, y, width, height) {
    // Round the size, but keep the actual values stored in the data attributes
    roundedWidth = Math.round(width / CELL_WIDTH) * CELL_WIDTH;
    roundedHeight = Math.round(height / CELL_HEIGHT) * CELL_HEIGHT;
    target.style.width = roundedWidth + "px";
    target.style.height = roundedHeight + "px";

    roundedX = Math.round(x / CELL_WIDTH) * CELL_WIDTH;
    roundedY = Math.round(y / CELL_HEIGHT) * CELL_HEIGHT;
    target.style.webkitTransform = target.style.transform =
        "translate(" + roundedX + "px," + roundedY + "px)";
    target.setAttribute("data-x", x);
    target.setAttribute("data-y", y);
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
                .drawRect(column * CELL_WIDTH, row * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
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
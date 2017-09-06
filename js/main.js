/**
 * Created by Kilian on 06.09.17.
 */

const CANVAS_PADDING = 2;
const FIELD = $("#field");
const FIELD_CONTAINER = $("#field-container");

let cellWidth = 0;
let cellHeight = 0;


$(function () {
    drawGrid(100, 50);

    // Draw a square on screen.
    const stage = new createjs.Stage("canvas");
    const shape = new createjs.Shape();
    shape.graphics.beginFill('rgba(0,255,0,0.2)').drawRect(0, 0, 120, 120);
    stage.addChild(shape);
    stage.update();
});

function drawGrid(columns, rows) {
    updateField(columns / rows);

    const rough = new RoughCanvas(document.getElementById('grid-canvas'));

    // Determine the cell size from the canvas size
    cellWidth = Math.floor((rough.width - 2 * CANVAS_PADDING) / columns);
    cellHeight = Math.floor((rough.height - 2 * CANVAS_PADDING) / rows);

    // Make the cells square
    cellWidth = Math.min(cellHeight, cellWidth);
    //noinspection JSSuspiciousNameCombination
    cellHeight = cellWidth;

    const strokeWidth = cellHeight * 0.5 / 40;

    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
        for (let columnIndex = 0; columnIndex < columns; columnIndex++) {
            const rect = rough.rectangle(
                CANVAS_PADDING + columnIndex * cellWidth,
                CANVAS_PADDING + rowIndex * cellHeight,
                cellWidth, cellHeight);
            rect.fill = "rgba(0,0,0,0)";
            rough.strokeWidth = strokeWidth;
        }
    }
}

function updateField(widthHeightRatio) {
    // Try to make the FIELD as large as possible
    let maxHeight = FIELD_CONTAINER.height();
    let maxWidth = FIELD_CONTAINER.width();

    FIELD.width(Math.min(maxWidth, widthHeightRatio * maxHeight));
    FIELD.height(Math.min(maxHeight, maxWidth / widthHeightRatio));

    // Let the canvasses fill the FIELD
    $("canvas").each(function (_, el) {
        const canvas = el.getContext("2d").canvas;
        canvas.width = FIELD.width();
        canvas.height = FIELD.height();
    });
}
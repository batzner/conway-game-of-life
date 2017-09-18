/**
 * Created by Kilian on 06.09.17.
 */

class Field {
    constructor(numRows, numColumns) {
        this.field = [];
        this.updateSize(numRows, numColumns);
    }

    forEach(callback) {
        // Iterate the field and call the callback
        for (let row = 0; row < this.field.length; row++) {
            for (let column = 0; column < this.field[row].length; column++) {
                callback(row, column, this.field[row][column]);
            }
        }
    }

    randomInit(density) {
        this.forEach((row, column) => {
            this.field[row][column] = Math.random() <= density;
        });
    }

    updateSize(numRows, numColumns) {
        // Crop rows if necessary
        this.field = this.field.slice(0, numRows);
        // Add rows if necessary
        if (this.field.length < numRows) {
            const newRows = new Array(numRows - this.field.length).fill([]);
            Array.prototype.push.apply(this.field, newRows);
        }

        for (let row = 0; row < this.field.length; row++) {
            // Crop columns if necessary
            this.field[row] = this.field[row].slice(0, numColumns);
            // Add columns if necessary
            if (this.field[row].length < numColumns) {
                const newColumns = new Array(numColumns - this.field[row].length).fill(false);
                Array.prototype.push.apply(this.field[row], newColumns);
            }
        }
    }

    step(infiniteEdges, incrementalUpdates) {
        let updates = [];
        let newField = [];

        for (let row = 0; row < this.field.length; row++) {
            let newRow = [];
            for (let column = 0; column < this.field[row].length; column++) {
                const neighborsCount = this.getNeighborsCount(row, column, infiniteEdges);
                const willBeAlive = neighborsCount == 3 || neighborsCount == 2 && this.field[row][column];

                // Set an update if necessary
                if (willBeAlive != this.field[row][column]) {
                    updates.push({
                        row: row,
                        column: column,
                        alive: willBeAlive
                    });
                }
                newRow.push(willBeAlive);

                // Incremental cell updates that can be used by the following cells
                if (incrementalUpdates) {
                    this.field[row][column] = willBeAlive;
                }
            }
            newField.push(newRow)
        }
        this.field = newField;
        return updates;
    }

    setPattern(pattern, centerRow, centerColumn) {
        let updates = [];
        for (let cell of pattern) {
            let row = cell[0] + centerRow;
            let column = cell[1] + centerColumn;

            if (0 <= row && row < this.field.length && 0 <= column && column < this.field[row].length) {
                this.field[row][column] = true;
                updates.push({
                    row: row,
                    column: column,
                    alive: true
                });
            }
        }
        return updates;
    }

    flipCell(row, column) {
        if (row < this.field.length && column < this.field[row].length) {
            this.field[row][column] = !this.field[row][column];
            return {
                row: row,
                column: column,
                alive: this.field[row][column]
            }
        } else {
            return null;
        }
    }

    isAlive(row, column) {
        return this.field[row][column];
    }

    getNeighborsCount(cellRow, cellColumn, infiniteEdges) {
        const rowIndices = [cellRow - 1, cellRow, cellRow + 1];
        const columnIndices = [cellColumn - 1, cellColumn, cellColumn + 1];

        let neighborsCount = 0;
        for (let rowIndex of rowIndices) {
            // Handle out of bounds cases
            if (!infiniteEdges && (rowIndex < 0 || rowIndex >= this.field.length)) {
                continue;
            }
            let row = rowIndex.mod(this.field.length);

            for (let columnIndex of columnIndices) {
                // Handle out of bounds cases
                if (!infiniteEdges && (columnIndex < 0 || columnIndex >= this.field[row].length)) {
                    continue;
                }
                let column = columnIndex.mod(this.field[row].length);

                // Check the neighbor
                if (this.field[row][column] == true && !(row == cellRow && column == cellColumn)) {
                    neighborsCount += 1;

                    // Return early for too many neighbors
                    if (neighborsCount > 3) return neighborsCount;
                }
            }
        }
        return neighborsCount;
    }
}
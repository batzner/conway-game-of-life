/**
 * @fileoverview Implements the logic of Conway's Game of Life.
 */

/**
 * Util function for calculating a positive modulo of a number.
 * @param {!number} dividend - The number to divide
 * @param {!number} divisor - The number to divide by
 * @returns {number} - A number in [0, divisor[
 */
function positiveMod(dividend, divisor) {
    return ((dividend % divisor) + divisor) % divisor;
}

/**
 * A class representing an instance of the Game of Life.
 */
class Field {
    /**
     * The size of the field may be changed later with updateSize().
     * @param {!number} numRows - Number of initial rows.
     * @param {!number} numColumns - Number of initial columns.
     */
    constructor(numRows, numColumns) {
        this.field = [];
        this.updateSize(numRows, numColumns);
    }

    /**
     * Callback for iterating through the field cells.
     *
     * @callback forEachCallback
     * @param {!number} row - The cell's row.
     * @param {!number} column - The cell's column.
     * @param {!number} isAlive - The cell's state.
     */

    /**
     * Iterates through the field's cells and calls a callback for each cell.
     * @param {!forEachCallback} callback
     */
    forEach(callback) {
        for (let row = 0; row < this.field.length; row++) {
            for (let column = 0; column < this.field[row].length; column++) {
                callback(row, column, this.field[row][column]);
            }
        }
    }

    /**
     * Reinitializes the field randomly with a given density.
     * @param {!number} density - The probability of a cell being alive.
     */
    randomInit(density) {
        this.forEach((row, column) => {
            this.field[row][column] = Math.random() <= density;
        });
    }

    /**
     * Reshapes the field. If a dimension is expanded, the existing cells will keep their state and
     * the new cells will be initialized as dead.
     * @param {!number} numRows - New number of rows
     * @param {!number} numColumns - New number of columns
     */
    updateSize(numRows, numColumns) {
        // Crop rows if necessary
        this.field = this.field.slice(0, numRows);

        // Add rows if necessary
        if (this.field.length < numRows) {
            // The new rows don't need to match the given columns since we extend the columns below
            const newRows = new Array(numRows - this.field.length).fill([]);
            Array.prototype.push.apply(this.field, newRows);
        }

        // Update the columns
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

    /**
     * Update each cell according to the game's rules.
     * @param {boolean} infiniteEdges - If True, the cell's at opposing edges are neighbors.
     * @param {boolean} incrementalUpdates - If True, the cells are updated one after another. Thus,
     *      an update may already influence other updates in the same generation / step.
     * @returns {!Array<FieldUpdate>} - A list of the updated cells.
     */
    step(infiniteEdges, incrementalUpdates) {
        let updates = [];
        // Compute the new field in a separate variable to prevent cell updates from influencing
        // updates in the same step.
        let newField = [];

        for (let row = 0; row < this.field.length; row++) {
            let newRow = [];

            for (let column = 0; column < this.field[row].length; column++) {
                // Calculate the new status
                const neighborsCount = this.getNeighborsCount(row, column, infiniteEdges);
                const willBeAlive = (neighborsCount == 3 ||
                neighborsCount == 2 && this.field[row][column]);
                newRow.push(willBeAlive);

                // Set an update if necessary
                if (willBeAlive != this.field[row][column]) {
                    const update = new FieldUpdate(row, column, willBeAlive);
                    updates.push(update);
                }

                // Let this update influence other updates in the same step
                if (incrementalUpdates) {
                    this.field[row][column] = willBeAlive;
                }
            }
            newField.push(newRow)
        }
        this.field = newField;
        return updates;
    }


    /**
     * Sets a pattern into the field. Only cells within the field's current bounds are updated.
     * @param {!Array<Array<number>>} pattern - An array of <row, column> tuples. Each entry
     *      contains the coordinates of a living cell relative to the given center coordinates.
     * @param {!number} centerRow - The row of the pattern's center.
     * @param {!number} centerColumn - The column of the pattern's center.
     * @returns {!Array<FieldUpdate>} - A list of the updated cells.
     */
    setPattern(pattern, centerRow, centerColumn) {
        let updates = [];
        for (let cell of pattern) {
            let row = cell[0] + centerRow;
            let column = cell[1] + centerColumn;

            // Check the bounds before updating
            if (this.isInBounds(row, column)) {
                this.field[row][column] = true;
                let update = new FieldUpdate(row, column, true);
                updates.push(update);
            }
        }
        return updates;
    }

    /**
     * Returns True, if the given row and column don't exceed the field's current bounds.
     * @param {!number} row
     * @param {!number} column
     * @returns {boolean}
     */
    isInBounds(row, column) {
        return (0 <= row && row < this.field.length &&
        0 <= column && column < this.field[row].length);
    }

    /**
     * Flips the status of a cell.
     * @param {!number} row
     * @param {!number} column
     * @returns {FieldUpdate | null} - The field update or null if the given position exceeded the
     *      field's bounds.
     */
    flipCell(row, column) {
        if (this.isInBounds(row, column)) {
            this.field[row][column] = !this.field[row][column];
            return new FieldUpdate(row, column, this.field[row][column]);
        } else {
            return null;
        }
    }

    /**
     * Returns the number of neighbors of a cell.
     * @param {!number} cellRow
     * @param {!number} cellColumn
     * @param {boolean} infiniteEdges -  If True, the cell's at opposing edges are neighbors.
     * @returns {number} - The number of neighbors.
     */
    getNeighborsCount(cellRow, cellColumn, infiniteEdges) {
        // Get the indices of the neighbors
        const rowIndices = [cellRow - 1, cellRow, cellRow + 1];
        const columnIndices = [cellColumn - 1, cellColumn, cellColumn + 1];

        let neighborsCount = 0;
        for (let rowIndex of rowIndices) {
            // Handle out of bounds cases
            if (!infiniteEdges && (rowIndex < 0 || rowIndex >= this.field.length)) {
                continue;
            }
            let row = positiveMod(rowIndex, this.field.length);

            for (let columnIndex of columnIndices) {
                // Handle out of bounds cases
                if (!infiniteEdges && (columnIndex < 0 || columnIndex >= this.field[row].length)) {
                    continue;
                }
                let column = positiveMod(columnIndex, this.field[row].length);

                // Check the neighbor
                if (this.field[row][column] == true && !(row == cellRow && column == cellColumn)) {
                    neighborsCount += 1;
                }
            }
        }
        return neighborsCount;
    }
}

/**
 * A class representing an update of a cell.
 */
class FieldUpdate {

    /**
     * @param {!number} row - The cell's row
     * @param {!number} column - The cell's column
     * @param {!boolean} isAlive - The cell's new state
     */
    constructor(row, column, isAlive) {
        this.row = row;
        this.column = column;
        this.isAlive = isAlive;
    }
}
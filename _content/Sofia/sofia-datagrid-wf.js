window.sofiaDataGridWf = {
    _handlers: {},

    isReady: function () {
        return true;
    },

    _overlaySelector: ".sofia-select--open, .sofia-datepicker--open, .sofia-select__popup, .sofia-datepicker__panel",

    _isOverlayNavKey: function (key) {
        return key === "ArrowUp"
            || key === "ArrowDown"
            || key === "ArrowLeft"
            || key === "ArrowRight"
            || key === "PageUp"
            || key === "PageDown"
            || key === "Home"
            || key === "End"
            || key === "Enter"
            || key === "NumpadEnter"
            || key === " "
            || key === "Spacebar";
    },

    _isOverlayOpen: function (target) {
        return !!(target && target.closest && target.closest(this._overlaySelector));
    },

    /** Text inputs keep ↑/↓ (caret / spinner). Select triggers & readonly date fields yield to row nav. */
    _editorKeepsVerticalArrows: function (target) {
        if (!target) {
            return false;
        }

        var tag = (target.tagName || "").toUpperCase();
        if (tag === "TEXTAREA") {
            return true;
        }

        if (tag === "SELECT") {
            return true;
        }

        if (tag === "INPUT") {
            var type = (target.type || "text").toLowerCase();
            if (type === "checkbox" || type === "radio" || type === "button" || type === "submit" || type === "reset") {
                return false;
            }

            // Readonly datepicker field: arrows move between rows.
            if (target.readOnly || target.disabled) {
                return false;
            }

            return true;
        }

        return false;
    },

    _focusCellEditor: function (cell) {
        if (!cell) {
            return;
        }

        var el = cell.querySelector(
            "input:not([disabled]):not([type='hidden'])," +
            "button.sofia-select__trigger:not([disabled])," +
            "textarea:not([disabled])," +
            "select:not([disabled])," +
            "[tabindex]:not([tabindex='-1'])"
        );
        if (el && typeof el.focus === "function") {
            el.focus();
        }
    },

    _navigateVertical: function (root, cell, delta) {
        var row = cell.closest("[data-sofia-wf-rowkey]");
        if (!row || !root) {
            return;
        }

        var rows = Array.prototype.slice.call(root.querySelectorAll("[data-sofia-wf-rowkey]"));
        var rowIndex = rows.indexOf(row);
        if (rowIndex < 0) {
            return;
        }

        var nextRow = rows[rowIndex + delta];
        if (!nextRow) {
            return;
        }

        var cells = row.querySelectorAll("[data-sofia-wf-cell]");
        var colIndex = Array.prototype.indexOf.call(cells, cell);
        if (colIndex < 0) {
            colIndex = 0;
        }

        var nextCells = nextRow.querySelectorAll("[data-sofia-wf-cell]");
        var nextCell = nextCells[colIndex] || nextCells[0];
        this._focusCellEditor(nextCell);
    },

    bind: function (id, root, dotNetRef) {
        this.unbind(id);
        if (!root) {
            return;
        }

        var self = this;
        var handler = function (e) {
            var cell = e.target && e.target.closest ? e.target.closest("[data-sofia-wf-cell]") : null;
            if (!cell || !root.contains(cell)) {
                return;
            }

            var rowKey = cell.getAttribute("data-sofia-wf-row");
            if (!rowKey) {
                return;
            }

            // Popup open: control owns keys; block browser scroll of the grid underneath.
            if (self._isOverlayOpen(e.target)) {
                if (self._isOverlayNavKey(e.key)) {
                    e.preventDefault();
                }
                return;
            }

            // Closed: ↑/↓ move focus to the same column on the adjacent row.
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                if (self._editorKeepsVerticalArrows(e.target)) {
                    return;
                }

                e.preventDefault();
                e.stopPropagation();
                self._navigateVertical(root, cell, e.key === "ArrowDown" ? 1 : -1);
                return;
            }

            var isLast = cell.getAttribute("data-sofia-wf-last") === "true";
            var isEnter = e.key === "Enter" || e.key === "NumpadEnter";
            var isSubmitTab = e.key === "Tab" && !e.shiftKey && isLast;

            if (!isEnter && !isSubmitTab) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();
            dotNetRef.invokeMethodAsync("NotifyWindowsFormSubmit", rowKey);
        };

        this._handlers[id] = { root: root, handler: handler, dotNetRef: dotNetRef };
        root.addEventListener("keydown", handler, true);
    },

    unbind: function (id) {
        var entry = this._handlers[id];
        if (!entry) {
            return;
        }

        entry.root.removeEventListener("keydown", entry.handler, true);
        delete this._handlers[id];
    },

    focusFirstEditor: function (rowEl) {
        if (!rowEl) {
            return;
        }

        var el = rowEl.querySelector(
            ".sofia-datatable__cell-edit input:not([disabled]):not([type='hidden'])," +
            ".sofia-datatable__cell-edit button.sofia-select__trigger:not([disabled])," +
            ".sofia-datatable__cell-edit textarea:not([disabled])," +
            ".sofia-datatable__cell-edit select:not([disabled])," +
            ".sofia-datatable__cell-edit [tabindex]:not([tabindex='-1'])"
        );
        if (el && typeof el.focus === "function") {
            el.focus();
        }
    },

    focusRowEditor: function (root, rowKey, columnIndex) {
        if (!root) {
            return;
        }

        var safeKey = String(rowKey).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        var row = root.querySelector('[data-sofia-wf-rowkey="' + safeKey + '"]');
        if (!row) {
            return;
        }

        var cells = row.querySelectorAll("[data-sofia-wf-cell]");
        var cell = cells[columnIndex] || cells[0];
        if (!cell) {
            this.focusFirstEditor(row);
            return;
        }

        this._focusCellEditor(cell);
    }
};

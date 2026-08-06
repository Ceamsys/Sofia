window.sofiaFocusTrap = {
    _instances: {},

    _focusableSelector:
        'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, object, embed, [contenteditable="true"], [tabindex]:not([tabindex="-1"])',

    _isVisible: function (el) {
        if (!el || el.getAttribute("aria-hidden") === "true") {
            return false;
        }

        var style = window.getComputedStyle(el);
        if (style.visibility === "hidden" || style.display === "none") {
            return false;
        }

        return el.getClientRects().length > 0;
    },

    _getFocusable: function (root) {
        if (!root) {
            return [];
        }

        return Array.prototype.slice
            .call(root.querySelectorAll(this._focusableSelector))
            .filter(function (el) {
                return window.sofiaFocusTrap._isVisible(el);
            });
    },

    _focusInitial: function (state) {
        if (!state || !state.element || !state.trapped) {
            return;
        }

        var target = null;
        if (state.options.initialFocusSelector) {
            target = state.element.querySelector(state.options.initialFocusSelector);
        }

        if (!target) {
            target = state.element.querySelector("[data-autofocus], [data-p-autofocus]");
        }

        if (!target || !this._isVisible(target)) {
            var list = this._getFocusable(state.element);
            target = list.length ? list[0] : null;
        }

        if (target && typeof target.focus === "function") {
            try {
                target.focus({ preventScroll: true });
            } catch (_) {
                target.focus();
            }
        }
    },

    _onKeyDown: function (state, e) {
        if (!state || !state.trapped) {
            return;
        }

        if (e.key === "Escape" || e.key === "Esc") {
            if (state.dotNetRef) {
                state.dotNetRef.invokeMethodAsync("NotifyEscape");
            }
            return;
        }

        if (e.key !== "Tab") {
            return;
        }

        var focusable = this._getFocusable(state.element);
        if (!focusable.length) {
            e.preventDefault();
            return;
        }

        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        var active = document.activeElement;

        if (e.shiftKey) {
            if (active === first || !state.element.contains(active)) {
                e.preventDefault();
                last.focus();
            }
        } else if (active === last || !state.element.contains(active)) {
            e.preventDefault();
            first.focus();
        }
    },

    attach: function (element, dotNetRef, options) {
        if (!element) {
            return null;
        }

        var id =
            typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : "ft-" + Date.now() + "-" + Math.random().toString(36).slice(2);

        var self = this;
        var state = {
            element: element,
            dotNetRef: dotNetRef,
            options: options || {},
            trapped: options && options.trapped === false ? false : true
        };

        state.keyHandler = function (e) {
            self._onKeyDown(state, e);
        };

        element.addEventListener("keydown", state.keyHandler);
        this._instances[id] = state;

        if (state.trapped && options && options.autoFocus !== false) {
            // Defer so Blazor finishes rendering focusable children.
            requestAnimationFrame(function () {
                self._focusInitial(state);
            });
        }

        return id;
    },

    update: function (id, options) {
        var state = this._instances[id];
        if (!state) {
            return;
        }

        var prev = state.trapped;
        state.options = Object.assign({}, state.options, options || {});
        state.trapped = state.options.trapped === false ? false : true;

        if (state.trapped && !prev && state.options.autoFocus !== false) {
            var self = this;
            requestAnimationFrame(function () {
                self._focusInitial(state);
            });
        }
    },

    dispose: function (id) {
        var state = this._instances[id];
        if (!state) {
            return;
        }

        if (state.element && state.keyHandler) {
            state.element.removeEventListener("keydown", state.keyHandler);
        }

        delete this._instances[id];
    }
};

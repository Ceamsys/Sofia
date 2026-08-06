window.sofiaMenu = {
    _handlers: {},

    open: function () { },

    position: function (popup, trigger, options) {
        if (!popup || !trigger) {
            return;
        }

        var side = (options && options.side) || "bottom";
        var align = (options && options.align) || "start";
        var sideOffset = (options && options.sideOffset) != null ? options.sideOffset : 4;
        var alignOffset = (options && options.alignOffset) != null ? options.alignOffset : 0;

        var tr = trigger.getBoundingClientRect();
        var pr = popup.getBoundingClientRect();
        var top = 0;
        var left = 0;

        if (side === "right") {
            left = tr.right + sideOffset;
            top = this._align(tr.top, tr.height, pr.height, align, alignOffset);
        } else if (side === "left") {
            left = tr.left - pr.width - sideOffset;
            top = this._align(tr.top, tr.height, pr.height, align, alignOffset);
        } else if (side === "top") {
            top = tr.top - pr.height - sideOffset;
            left = this._align(tr.left, tr.width, pr.width, align, alignOffset);
        } else {
            top = tr.bottom + sideOffset;
            left = this._align(tr.left, tr.width, pr.width, align, alignOffset);
        }

        var pad = 8;
        left = Math.min(Math.max(pad, left), window.innerWidth - pr.width - pad);
        top = Math.min(Math.max(pad, top), window.innerHeight - pr.height - pad);

        popup.style.position = "fixed";
        popup.style.top = Math.round(top) + "px";
        popup.style.left = Math.round(left) + "px";
        popup.style.visibility = "visible";
        popup.style.zIndex = "1160";
    },

    _align: function (origin, originSize, popupSize, align, alignOffset) {
        if (align === "center") {
            return origin + (originSize - popupSize) / 2 + alignOffset;
        }
        if (align === "end") {
            return origin + originSize - popupSize + alignOffset;
        }
        return origin + alignOffset;
    },

    attachDismiss: function (id, popup, trigger, dotNetRef) {
        this.detachDismiss(id);

        var handler = function (e) {
            var t = e.target;
            if (!popup || !trigger) {
                return;
            }
            if (popup.contains(t) || trigger.contains(t)) {
                return;
            }
            // Also keep open when interacting with nested submenu popups marked as sofia-menu__popup
            if (t.closest && t.closest(".sofia-ddmenu__popup")) {
                return;
            }
            dotNetRef.invokeMethodAsync("NotifyOutsideClick");
        };

        this._handlers[id] = handler;
        window.setTimeout(function () {
            document.addEventListener("mousedown", handler, true);
        }, 0);
    },

    detachDismiss: function (id) {
        var handler = this._handlers[id];
        if (!handler) {
            return;
        }
        if (typeof handler === "function") {
            document.removeEventListener("mousedown", handler, true);
        } else {
            if (handler.mousedown) {
                document.removeEventListener("mousedown", handler.mousedown, true);
            }
            if (handler.keydown) {
                document.removeEventListener("keydown", handler.keydown, true);
            }
        }
        delete this._handlers[id];
    },

    attachOutside: function (id, root, dotNetRef) {
        this.detachDismiss(id);

        var handler = function (e) {
            if (!root || root.contains(e.target)) {
                return;
            }
            if (e.target.closest && e.target.closest(".sofia-ddmenu__popup")) {
                return;
            }
            dotNetRef.invokeMethodAsync("NotifyOutsideClick");
        };

        this._handlers[id] = handler;
        window.setTimeout(function () {
            document.addEventListener("mousedown", handler, true);
        }, 0);
    },

    /** Position a popup at cursor coordinates (ContextMenu). */
    positionAtPoint: function (popup, clientX, clientY) {
        if (!popup) {
            return;
        }

        popup.style.position = "fixed";
        popup.style.left = "0px";
        popup.style.top = "0px";
        popup.style.visibility = "hidden";
        popup.style.zIndex = "1160";

        var pr = popup.getBoundingClientRect();
        var pad = 8;
        var left = clientX;
        var top = clientY;

        if (left + pr.width + pad > window.innerWidth) {
            left = clientX - pr.width;
        }
        if (top + pr.height + pad > window.innerHeight) {
            top = clientY - pr.height;
        }

        left = Math.min(Math.max(pad, left), window.innerWidth - pr.width - pad);
        top = Math.min(Math.max(pad, top), window.innerHeight - pr.height - pad);

        popup.style.left = Math.round(left) + "px";
        popup.style.top = Math.round(top) + "px";
        popup.style.visibility = "visible";
    },

    /**
     * ContextMenu dismiss: left-click outside + Escape (both optional via options).
     * options: { closeOnOutside: bool, closeOnEscape: bool }
     */
    attachDismissPoint: function (id, popup, root, dotNetRef, options) {
        this.detachDismiss(id);
        options = options || {};
        var closeOnOutside = options.closeOnOutside !== false;
        var closeOnEscape = options.closeOnEscape !== false;

        var onMouseDown = null;
        var onKeyDown = null;

        if (closeOnOutside) {
            onMouseDown = function (e) {
                // Primary (left) button only.
                if (e.button !== 0 || !popup) {
                    return;
                }
                var t = e.target;
                if (popup.contains(t)) {
                    return;
                }
                if (t.closest && t.closest(".sofia-ddmenu__popup")) {
                    return;
                }
                dotNetRef.invokeMethodAsync("NotifyOutsideClick");
            };
        }

        if (closeOnEscape) {
            onKeyDown = function (e) {
                if (e.key !== "Escape" && e.key !== "Esc") {
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                dotNetRef.invokeMethodAsync("NotifyEscape");
            };
        }

        this._handlers[id] = { mousedown: onMouseDown, keydown: onKeyDown };
        window.setTimeout(function () {
            if (onMouseDown) {
                document.addEventListener("mousedown", onMouseDown, true);
            }
            if (onKeyDown) {
                document.addEventListener("keydown", onKeyDown, true);
            }
        }, 0);
    },

    _globalHandlers: {},

    attachGlobalContextMenu: function (id, dotNetRef) {
        this.detachGlobalContextMenu(id);

        var handler = function (e) {
            e.preventDefault();
            dotNetRef.invokeMethodAsync("NotifyGlobalContextMenu", e.clientX, e.clientY);
        };

        this._globalHandlers[id] = handler;
        document.addEventListener("contextmenu", handler, true);
    },

    detachGlobalContextMenu: function (id) {
        var handler = this._globalHandlers[id];
        if (!handler) {
            return;
        }
        document.removeEventListener("contextmenu", handler, true);
        delete this._globalHandlers[id];
    }
};

window.sofiaPopover = {
    _handlers: {},

    position: function (popup, trigger, options) {
        if (!popup || !trigger) {
            return;
        }

        var side = (options && options.side) || "bottom";
        var align = (options && options.align) || "start";
        var sideOffset = (options && options.sideOffset) != null ? options.sideOffset : 12;
        var alignOffset = (options && options.alignOffset) != null ? options.alignOffset : 0;
        var matchWidth = !!(options && options.matchWidth);
        var minWidth = (options && options.minWidth) != null ? options.minWidth : 0;

        var tr = trigger.getBoundingClientRect();

        // Width before measuring popup so flip/clamp uses the final size.
        if (matchWidth) {
            popup.style.width = Math.round(Math.max(tr.width, minWidth)) + "px";
            popup.style.right = "auto";
        }

        var pr = popup.getBoundingClientRect();
        var top = 0;
        var left = 0;

        if (side === "top") {
            top = tr.top - pr.height - sideOffset;
            left = this._alignMain(tr.left, tr.width, pr.width, align, alignOffset);
        } else if (side === "bottom") {
            top = tr.bottom + sideOffset;
            left = this._alignMain(tr.left, tr.width, pr.width, align, alignOffset);
        } else if (side === "left") {
            left = tr.left - pr.width - sideOffset;
            top = this._alignMain(tr.top, tr.height, pr.height, align, alignOffset);
        } else {
            left = tr.right + sideOffset;
            top = this._alignMain(tr.top, tr.height, pr.height, align, alignOffset);
        }

        var pad = 8;
        left = Math.min(Math.max(pad, left), window.innerWidth - pr.width - pad);
        top = Math.min(Math.max(pad, top), window.innerHeight - pr.height - pad);

        popup.style.position = "fixed";
        popup.style.top = Math.round(top) + "px";
        popup.style.left = Math.round(left) + "px";
        popup.style.visibility = "visible";
    },

    _alignMain: function (origin, originSize, popupSize, align, alignOffset) {
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

        document.removeEventListener("mousedown", handler, true);
        delete this._handlers[id];
    }
};

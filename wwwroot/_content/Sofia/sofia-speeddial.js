window.sofiaSpeedDial = {
    _handlers: new WeakMap(),

    attachOutside: function (element, dotNetRef) {
        if (!element || !dotNetRef) {
            return;
        }

        this.detachOutside(element);

        var pointerHandler = function (event) {
            if (element.contains(event.target)) {
                return;
            }

            dotNetRef.invokeMethodAsync("OnOutsideClick");
        };

        var keyHandler = function (event) {
            if (event.key === "Escape") {
                dotNetRef.invokeMethodAsync("OnOutsideClick");
            }
        };

        document.addEventListener("pointerdown", pointerHandler, true);
        document.addEventListener("keydown", keyHandler, true);
        this._handlers.set(element, { pointerHandler: pointerHandler, keyHandler: keyHandler });
    },

    detachOutside: function (element) {
        if (!element) {
            return;
        }

        var handlers = this._handlers.get(element);
        if (!handlers) {
            return;
        }

        document.removeEventListener("pointerdown", handlers.pointerHandler, true);
        document.removeEventListener("keydown", handlers.keyHandler, true);
        this._handlers.delete(element);
    }
};

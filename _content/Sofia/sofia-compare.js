window.sofiaCompare = {
    measure: function (element, vertical) {
        if (!element || typeof element.getBoundingClientRect !== "function") {
            return { size: 0, start: 0 };
        }

        var rect = element.getBoundingClientRect();
        return vertical
            ? { size: rect.height, start: rect.top }
            : { size: rect.width, start: rect.left };
    },

    capture: function (element, pointerId) {
        if (!element || typeof element.setPointerCapture !== "function") {
            return;
        }

        try {
            element.setPointerCapture(pointerId);
        } catch (_) {
            /* ignore */
        }
    },

    release: function (element, pointerId) {
        if (!element || typeof element.releasePointerCapture !== "function") {
            return;
        }

        try {
            element.releasePointerCapture(pointerId);
        } catch (_) {
            /* ignore */
        }
    }
};

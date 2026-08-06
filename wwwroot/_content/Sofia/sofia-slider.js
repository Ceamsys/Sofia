window.sofiaSlider = {
    ratio: function (element, clientX, clientY, vertical) {
        if (!element || typeof element.getBoundingClientRect !== "function") {
            return 0;
        }

        var rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height) {
            return 0;
        }

        if (vertical) {
            return Math.min(1, Math.max(0, 1 - (clientY - rect.top) / rect.height));
        }

        return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
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

window.sofiaKnob = {
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

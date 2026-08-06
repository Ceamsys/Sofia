window.sofiaMask = {
    setCaret: function (element, pos) {
        if (!element || typeof element.setSelectionRange !== "function") {
            return;
        }

        try {
            element.focus();
            element.setSelectionRange(pos, pos);
        } catch (_) {
            /* ignore selection errors on unsupported types */
        }
    }
};

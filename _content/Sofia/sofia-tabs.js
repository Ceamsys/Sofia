window.sofiaTabs = {
    scrollBy: function (element, delta) {
        if (!element) {
            return;
        }

        element.scrollBy({ left: delta, behavior: "smooth" });
    },

    scrollIntoView: function (list, tab) {
        if (!list || !tab || typeof tab.scrollIntoView !== "function") {
            return;
        }

        tab.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
    },

    canScroll: function (element) {
        if (!element) {
            return { left: false, right: false };
        }

        var max = Math.max(0, element.scrollWidth - element.clientWidth);
        return {
            left: element.scrollLeft > 1,
            right: element.scrollLeft < max - 1
        };
    }
};

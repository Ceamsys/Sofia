window.sofiaScrollArea = {
    getState: function (element) {
        if (!element) {
            return { atTop: true, atBottom: true, atLeft: true, atRight: true };
        }

        var top = element.scrollTop;
        var left = element.scrollLeft;
        var maxTop = Math.max(0, element.scrollHeight - element.clientHeight);
        var maxLeft = Math.max(0, element.scrollWidth - element.clientWidth);

        return {
            atTop: top <= 1,
            atBottom: top >= maxTop - 1,
            atLeft: left <= 1,
            atRight: left >= maxLeft - 1
        };
    }
};

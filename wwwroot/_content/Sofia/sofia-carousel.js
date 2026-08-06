window.sofiaCarousel = {
    measureOffsets: function (viewport, track, vertical) {
        if (!viewport || !track) {
            return { viewport: 0, offsets: [], sizes: [] };
        }

        var vRect = viewport.getBoundingClientRect();
        var viewportSize = vertical ? vRect.height : vRect.width;
        var items = track.children || [];
        var offsets = [];
        var sizes = [];

        for (var i = 0; i < items.length; i++) {
            offsets.push(vertical ? items[i].offsetTop : items[i].offsetLeft);
            sizes.push(vertical ? items[i].offsetHeight : items[i].offsetWidth);
        }

        return { viewport: viewportSize, offsets: offsets, sizes: sizes };
    }
};

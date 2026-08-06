window.sofiaDropZone = {
    wireZone: function (zone) {
        if (!zone || zone.__sofiaDropZoneWired) {
            return;
        }

        zone.__sofiaDropZoneWired = true;

        zone.addEventListener(
            "dragstart",
            function (event) {
                try {
                    if (event.dataTransfer) {
                        event.dataTransfer.setData("text/plain", "sofia-dropzone");
                        event.dataTransfer.effectAllowed = "move";
                    }
                } catch (_) {
                    /* ignore */
                }
            },
            true
        );

        zone.addEventListener(
            "dragover",
            function (event) {
                event.preventDefault();
                try {
                    if (event.dataTransfer) {
                        event.dataTransfer.dropEffect = "move";
                    }
                } catch (_) {
                    /* ignore */
                }
            },
            true
        );
    },

    unwireZone: function (zone) {
        if (!zone) {
            return;
        }

        zone.__sofiaDropZoneWired = false;
    }
};

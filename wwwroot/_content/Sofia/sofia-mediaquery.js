window.sofiaMediaQuery = (function () {
    var entries = new Map();
    var nextId = 1;

    function bind(mql, handler) {
        if (typeof mql.addEventListener === "function") {
            mql.addEventListener("change", handler);
            return;
        }

        // Safari < 14
        mql.addListener(handler);
    }

    function unbind(mql, handler) {
        if (typeof mql.removeEventListener === "function") {
            mql.removeEventListener("change", handler);
            return;
        }

        mql.removeListener(handler);
    }

    return {
        observe: function (query, dotNetRef) {
            if (!query || typeof window.matchMedia !== "function" || !dotNetRef) {
                return 0;
            }

            var id = nextId++;
            var mql = window.matchMedia(query);
            var handler = function (event) {
                var matches = event && typeof event.matches === "boolean" ? event.matches : mql.matches;
                dotNetRef.invokeMethodAsync("OnMediaChange", matches);
            };

            bind(mql, handler);
            entries.set(id, { mql: mql, handler: handler });

            // Initial state
            dotNetRef.invokeMethodAsync("OnMediaChange", mql.matches);
            return id;
        },

        dispose: function (id) {
            var entry = entries.get(id);
            if (!entry) {
                return;
            }

            unbind(entry.mql, entry.handler);
            entries.delete(id);
        }
    };
})();

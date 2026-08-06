window.sofiaTileLayout = {
    _observers: new WeakMap(),

    observe: function (element, dotNetRef) {
        if (!element || typeof ResizeObserver === "undefined") {
            return;
        }

        this.unobserve(element);

        var notify = function () {
            var rect = element.getBoundingClientRect();
            dotNetRef.invokeMethodAsync("OnHostResized", rect.width, rect.height);
        };

        var ro = new ResizeObserver(function () {
            notify();
        });

        ro.observe(element);
        this._observers.set(element, { ro: ro, dotNetRef: dotNetRef });
        notify();
    },

    unobserve: function (element) {
        if (!element) {
            return;
        }

        var entry = this._observers.get(element);
        if (!entry) {
            return;
        }

        try {
            entry.ro.disconnect();
        } catch (_) {
            /* ignore */
        }

        this._observers.delete(element);
    }
};

window.sofiaCommandMenu = {
    _handlers: {},

    registerHotkey: function (dotNetRef) {
        if (!dotNetRef) {
            return null;
        }

        var id =
            typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : "cm-" + Date.now() + "-" + Math.random().toString(36).slice(2);

        var handler = function (e) {
            var key = (e.key || "").toLowerCase();
            if (key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                dotNetRef.invokeMethodAsync("ToggleFromHotkey");
            }
        };

        document.addEventListener("keydown", handler);
        this._handlers[id] = handler;
        return id;
    },

    unregisterHotkey: function (id) {
        var handler = this._handlers[id];
        if (!handler) {
            return;
        }

        document.removeEventListener("keydown", handler);
        delete this._handlers[id];
    }
};

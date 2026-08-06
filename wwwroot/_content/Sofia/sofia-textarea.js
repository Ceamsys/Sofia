window.sofiaTextarea = {
    autoResize: function (element) {
        if (!element) {
            return;
        }

        element.style.height = "auto";
        element.style.height = element.scrollHeight + "px";
    }
};

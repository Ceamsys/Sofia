window.sofiaOtp = {
    focus: function (id) {
        var el = document.getElementById(id);
        if (!el) {
            return;
        }

        el.focus();
        if (typeof el.select === "function" && el.value) {
            el.select();
        }
    },

    readValue: function (id) {
        var el = document.getElementById(id);
        return el && el.value ? String(el.value) : "";
    }
};

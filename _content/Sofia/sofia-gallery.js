window.sofiaGallery = {
    setBodyScrollLocked: function (locked) {
        try {
            document.body.style.overflow = locked ? "hidden" : "";
        } catch (_) {
            /* ignore */
        }
    },

    download: function (url, fileName) {
        if (!url) {
            return;
        }

        try {
            var link = document.createElement("a");
            link.href = url;
            link.download = fileName || "image";
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (_) {
            window.open(url, "_blank", "noopener,noreferrer");
        }
    }
};

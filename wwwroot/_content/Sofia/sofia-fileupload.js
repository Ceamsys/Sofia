window.sofiaFileUpload = {
    open: function (inputId) {
        var input = document.getElementById(inputId);
        if (input) {
            input.click();
        }
    },

    attachDrop: function (zone, inputId) {
        if (!zone || zone.__sofiaFileUploadBound) {
            return;
        }

        zone.__sofiaFileUploadBound = true;

        var onDragOver = function (e) {
            e.preventDefault();
            e.stopPropagation();
            zone.classList.add("sofia-fileupload--drag");
        };

        var onDragLeave = function (e) {
            if (!zone.contains(e.relatedTarget)) {
                zone.classList.remove("sofia-fileupload--drag");
            }
        };

        var onDrop = function (e) {
            e.preventDefault();
            e.stopPropagation();
            zone.classList.remove("sofia-fileupload--drag");

            var input = document.getElementById(inputId);
            if (!input || !e.dataTransfer || !e.dataTransfer.files || e.dataTransfer.files.length === 0) {
                return;
            }

            try {
                input.files = e.dataTransfer.files;
            } catch (err) {
                var dt = new DataTransfer();
                for (var i = 0; i < e.dataTransfer.files.length; i++) {
                    dt.items.add(e.dataTransfer.files[i]);
                }
                input.files = dt.files;
            }

            input.dispatchEvent(new Event("change", { bubbles: true }));
        };

        zone.addEventListener("dragenter", onDragOver);
        zone.addEventListener("dragover", onDragOver);
        zone.addEventListener("dragleave", onDragLeave);
        zone.addEventListener("drop", onDrop);
    }
};

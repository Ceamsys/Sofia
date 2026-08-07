window.sofiaDownload = {
    /**
     * Downloads a file from bytes.
     * Blazor often serializes byte[] as a base64 string — handle that case.
     */
    fromBytes: function (bytes, fileName, contentType) {
        if (typeof bytes === "string") {
            this.fromBase64(bytes, fileName, contentType);
            return;
        }

        var data;
        if (bytes instanceof Uint8Array) {
            data = bytes;
        } else if (Array.isArray(bytes) || (bytes && typeof bytes.length === "number")) {
            data = new Uint8Array(bytes);
        } else {
            console.error("sofiaDownload.fromBytes: unsupported payload", bytes);
            return;
        }

        this._save(data, fileName, contentType);
    },

    /**
     * Downloads a file from a base64 string (preferred from Blazor).
     */
    fromBase64: function (base64, fileName, contentType) {
        if (!base64) {
            console.error("sofiaDownload.fromBase64: empty payload");
            return;
        }

        var binary = atob(base64);
        var len = binary.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        this._save(bytes, fileName, contentType);
    },

    _save: function (data, fileName, contentType) {
        var blob = new Blob([data], { type: contentType || "application/octet-stream" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = fileName || "download";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 1500);
    }
};

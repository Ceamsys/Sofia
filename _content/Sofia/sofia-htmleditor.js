window.sofiaHtmlEditor = {
    _registry: new Map(),

    init: function (editable, dotNetRef, id) {
        if (!editable) {
            return;
        }

        const state = { dotNetRef: dotNetRef, savedRange: null };

        const onSelectionChange = () => {
            const active = document.activeElement;
            if (active !== editable && !editable.contains(active)) {
                return;
            }

            const states = {};
            [
                "bold", "italic", "underline", "strikeThrough",
                "insertUnorderedList", "insertOrderedList",
                "justifyLeft", "justifyCenter", "justifyRight", "justifyFull"
            ].forEach(cmd => {
                try {
                    states[cmd] = document.queryCommandState(cmd);
                } catch (_) {
                    states[cmd] = false;
                }
            });

            dotNetRef.invokeMethodAsync("OnSelectionStateChanged", states).catch(() => {});
        };

        document.addEventListener("selectionchange", onSelectionChange);
        state.onSelectionChange = onSelectionChange;
        this._registry.set(id, state);
    },

    setHtml: function (editable, html) {
        if (editable) {
            editable.innerHTML = html || "";
        }
    },

    getHtml: function (editable) {
        return editable ? editable.innerHTML : "";
    },

    focus: function (editable) {
        if (editable) {
            editable.focus();
        }
    },

    saveSelection: function (id) {
        const state = this._registry.get(id);
        if (!state) {
            return;
        }

        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            state.savedRange = sel.getRangeAt(0).cloneRange();
        }
    },

    restoreSelection: function (id, editable) {
        const state = this._registry.get(id);
        if (editable) {
            editable.focus();
        }

        if (!state || !state.savedRange) {
            return;
        }

        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(state.savedRange);
    },

    // `restore` should be true only when focus left the editable region since the selection was
    // captured (e.g. a <select> or a popover input was used) — plain toolbar buttons prevent
    // mousedown default so the live selection is already correct and must NOT be overwritten
    // with a possibly-stale saved range.
    execCommand: function (editable, id, command, value, restore) {
        if (restore) {
            this.restoreSelection(id, editable);
        } else if (editable) {
            editable.focus();
        }

        try {
            document.execCommand(command, false, value ?? null);
        } catch (_) {
            /* unsupported in this browser — ignore */
        }

        return editable ? editable.innerHTML : "";
    },

    insertImageFile: async function (editable, id, fileInput, uploadUrl, headers) {
        const file = fileInput && fileInput.files && fileInput.files[0];
        if (!file) {
            return { success: false, url: null, html: editable ? editable.innerHTML : "" };
        }

        this.restoreSelection(id, editable);

        try {
            if (uploadUrl) {
                try {
                    const form = new FormData();
                    form.append("file", file);
                    const res = await fetch(uploadUrl, { method: "POST", body: form, headers: headers || {} });
                    if (res.ok) {
                        const data = await res.json().catch(() => null);
                        const url = data && (data.url || data.Url);
                        if (url) {
                            document.execCommand("insertImage", false, url);
                            return { success: true, url: url, html: editable ? editable.innerHTML : "" };
                        }
                    }
                } catch (_) {
                    /* fall through to failure result */
                }

                return { success: false, url: null, html: editable ? editable.innerHTML : "" };
            }

            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            document.execCommand("insertImage", false, dataUrl);
            return { success: true, url: dataUrl, html: editable ? editable.innerHTML : "" };
        } catch (_) {
            return { success: false, url: null, html: editable ? editable.innerHTML : "" };
        } finally {
            fileInput.value = "";
        }
    },

    exportToPdf: function (html, title) {
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        iframe.setAttribute("aria-hidden", "true");
        document.body.appendChild(iframe);

        const cleanup = () => {
            setTimeout(() => {
                if (iframe.parentNode) {
                    iframe.parentNode.removeChild(iframe);
                }
            }, 1000);
        };

        const safeTitle = (title || "Document").replace(/[<>]/g, "");
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(
            "<!doctype html><html><head><meta charset=\"utf-8\" /><title>" + safeTitle + "</title>" +
            "<style>" +
            "body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#0f172a;padding:1.5rem;line-height:1.55;}" +
            "img{max-width:100%;}" +
            "table{border-collapse:collapse;width:100%;}" +
            "td,th{border:1px solid #cbd5e1;padding:0.35rem 0.6rem;}" +
            "blockquote{margin:0.75rem 0;padding-left:1rem;border-left:3px solid #cbd5e1;color:#475569;}" +
            "@media print { body { padding: 0; } }" +
            "</style></head><body>" + html + "</body></html>"
        );
        doc.close();

        const triggerPrint = () => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (_) {
                /* ignore */
            }

            cleanup();
        };

        if (doc.readyState === "complete") {
            triggerPrint();
        } else {
            iframe.onload = triggerPrint;
            setTimeout(triggerPrint, 400);
        }
    },

    dispose: function (id) {
        const state = this._registry.get(id);
        if (!state) {
            return;
        }

        document.removeEventListener("selectionchange", state.onSelectionChange);
        this._registry.delete(id);
    }
};

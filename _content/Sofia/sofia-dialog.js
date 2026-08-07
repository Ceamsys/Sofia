window.sofiaDialog = (function () {
    "use strict";

    var sessions = typeof WeakMap !== "undefined" ? new WeakMap() : null;
    var fallbackSessions = [];

    function ensureInteractiveStyles() {
        if (typeof document === "undefined" || document.getElementById("sofia-dialog-interactive-css")) {
            return;
        }

        var style = document.createElement("style");
        style.id = "sofia-dialog-interactive-css";
        style.textContent =
            "html.sofia-dialog--interacting,html.sofia-dialog--interacting *{" +
            "user-select:none!important;-webkit-user-select:none!important;}" +
            "html.sofia-dialog--interacting{cursor:grabbing!important;}" +
            "html.sofia-dialog--resizing,html.sofia-dialog--resizing *{cursor:nwse-resize!important;}" +
            "html.sofia-dialog--interacting iframe{pointer-events:none!important;}" +
            ".sofia-dialog__panel--pinned{" +
            "position:fixed!important;margin:0!important;" +
            "right:auto!important;bottom:auto!important;max-width:none!important;max-height:none!important;}";
        document.head.appendChild(style);
    }

    ensureInteractiveStyles();

    function setBlockScroll(block) {
        if (typeof document === "undefined" || !document.documentElement) {
            return;
        }

        document.documentElement.style.overflow = block ? "hidden" : "";
    }

    function getSession(panel) {
        if (!panel) {
            return null;
        }

        if (sessions) {
            return sessions.get(panel) || null;
        }

        for (var i = 0; i < fallbackSessions.length; i++) {
            if (fallbackSessions[i].panel === panel) {
                return fallbackSessions[i];
            }
        }

        return null;
    }

    function setSession(panel, state) {
        if (!panel) {
            return;
        }

        if (sessions) {
            sessions.set(panel, state);
            return;
        }

        for (var i = 0; i < fallbackSessions.length; i++) {
            if (fallbackSessions[i].panel === panel) {
                fallbackSessions[i] = state;
                return;
            }
        }

        fallbackSessions.push(state);
    }

    function deleteSession(panel) {
        if (!panel) {
            return;
        }

        if (sessions) {
            sessions.delete(panel);
            return;
        }

        fallbackSessions = fallbackSessions.filter(function (s) {
            return s.panel !== panel;
        });
    }

    function roundCssPx(value) {
        var dpr = window.devicePixelRatio || 1;
        return Math.round(value * dpr) / dpr;
    }

    function isInteractiveTarget(target) {
        if (!target || typeof target.closest !== "function") {
            return false;
        }

        return !!target.closest(
            "button, a, input, textarea, select, option, label, [data-sofia-no-drag], [contenteditable='true']"
        );
    }

    function setInteracting(resizing) {
        if (!document.documentElement) {
            return;
        }

        document.documentElement.classList.add("sofia-dialog--interacting");
        document.documentElement.classList.toggle("sofia-dialog--resizing", !!resizing);
    }

    function clearInteracting() {
        if (!document.documentElement) {
            return;
        }

        document.documentElement.classList.remove(
            "sofia-dialog--interacting",
            "sofia-dialog--resizing"
        );
    }

    function capture(el, pointerId) {
        if (!el || typeof el.setPointerCapture !== "function") {
            return;
        }

        try {
            el.setPointerCapture(pointerId);
        } catch (_) {
            /* ignore */
        }
    }

    function release(el, pointerId) {
        if (!el || typeof el.releasePointerCapture !== "function") {
            return;
        }

        try {
            el.releasePointerCapture(pointerId);
        } catch (_) {
            /* ignore */
        }
    }

    /**
     * Pin panel to viewport coordinates so flex centering cannot reflow under the cursor.
     */
    function pinPanel(panel, rect) {
        panel.classList.add("sofia-dialog__panel--pinned");
        panel.style.position = "fixed";
        panel.style.left = rect.left + "px";
        panel.style.top = rect.top + "px";
        panel.style.width = rect.width + "px";
        panel.style.height = rect.height + "px";
        panel.style.margin = "0";
        panel.style.right = "auto";
        panel.style.bottom = "auto";
        panel.style.transform = "none";
        panel.style.maxWidth = "none";
        panel.style.maxHeight = "none";
    }

    /**
     * Return panel to document flow and recover a translate() that preserves the visual top-left.
     */
    function unpinToFlow(panel, desiredLeft, desiredTop, desiredW, desiredH) {
        panel.classList.remove("sofia-dialog__panel--pinned");
        panel.style.position = "";
        panel.style.left = "";
        panel.style.top = "";
        panel.style.right = "";
        panel.style.bottom = "";
        panel.style.margin = "";
        panel.style.transform = "none";

        if (desiredW != null && desiredH != null) {
            panel.style.width = desiredW + "px";
            panel.style.height = desiredH + "px";
            panel.style.maxWidth = "100%";
            panel.style.maxHeight = "none";
        }

        // Force layout at the natural flex position, then offset with transform.
        void panel.offsetWidth;
        var natural = panel.getBoundingClientRect();
        var x = roundCssPx(desiredLeft - natural.left);
        var y = roundCssPx(desiredTop - natural.top);

        if (x !== 0 || y !== 0) {
            panel.style.transform = "translate(" + x + "px, " + y + "px)";
        } else {
            panel.style.transform = "";
        }

        return { x: x, y: y };
    }

    function readPinnedBox(panel, active) {
        return {
            left: parseFloat(panel.style.left) || active.left || 0,
            top: parseFloat(panel.style.top) || active.top || 0,
            width: parseFloat(panel.style.width) || active.currentW || 0,
            height: parseFloat(panel.style.height) || active.currentH || 0
        };
    }

    function endActive(state, notify) {
        var active = state.active;
        if (!active) {
            return;
        }

        state.active = null;
        clearInteracting();

        if (state.header) {
            state.header.classList.remove("sofia-dialog__header--dragging");
        }

        release(active.captureEl, active.pointerId);

        var panel = state.panel;
        var box;
        var offset = { x: 0, y: 0 };

        if (active.pinned) {
            box = readPinnedBox(panel, active);
            offset = unpinToFlow(panel, box.left, box.top, box.width, box.height);
        }

        if (!notify || !state.dotNetRef || !active.moved) {
            return;
        }

        try {
            if (active.type === "drag") {
                state.dotNetRef.invokeMethodAsync("OnDragEnd", offset.x, offset.y);
            } else if (active.type === "resize") {
                state.dotNetRef.invokeMethodAsync(
                    "OnResizeEnd",
                    box.width,
                    box.height,
                    offset.x,
                    offset.y
                );
            }
        } catch (_) {
            /* dispose race */
        }
    }

    function ensurePinnedForDrag(state, active, e) {
        if (active.pinned) {
            return;
        }

        var rect = state.panel.getBoundingClientRect();
        pinPanel(state.panel, rect);
        active.pinned = true;
        active.left = rect.left;
        active.top = rect.top;
        active.currentW = rect.width;
        active.currentH = rect.height;
        // Re-base grab so the click point stays under the cursor after pinning.
        active.grabX = e.clientX - rect.left;
        active.grabY = e.clientY - rect.top;
    }

    function onPointerMove(state, e) {
        var active = state.active;
        if (!active || e.pointerId !== active.pointerId) {
            return;
        }

        // Only while primary (left) button remains pressed.
        if ((e.buttons & 1) === 0) {
            endActive(state, true);
            return;
        }

        if (active.type === "drag") {
            var dx = e.clientX - active.startX;
            var dy = e.clientY - active.startY;

            if (!active.moved) {
                if (Math.hypot(dx, dy) < state.dragThreshold) {
                    return;
                }

                active.moved = true;
                if (state.header) {
                    state.header.classList.add("sofia-dialog__header--dragging");
                }

                ensurePinnedForDrag(state, active, e);
            } else if (!active.pinned) {
                ensurePinnedForDrag(state, active, e);
            }

            var left = roundCssPx(e.clientX - active.grabX);
            var top = roundCssPx(e.clientY - active.grabY);
            active.left = left;
            active.top = top;

            // Synchronous update keeps the grab point glued to the cursor.
            state.panel.style.left = left + "px";
            state.panel.style.top = top + "px";
            return;
        }

        if (active.type === "resize") {
            // Size from pinned top-left so the gripped corner tracks the pointer 1:1.
            var w = Math.max(state.minWidth, e.clientX - active.gripOffsetX - active.left);
            var h = Math.max(state.minHeight, e.clientY - active.gripOffsetY - active.top);
            w = roundCssPx(w);
            h = roundCssPx(h);

            if (!active.moved && w === active.originW && h === active.originH) {
                return;
            }

            active.moved = true;
            active.currentW = w;
            active.currentH = h;

            state.panel.style.width = w + "px";
            state.panel.style.height = h + "px";
        }
    }

    function onPointerUp(state, e) {
        var active = state.active;
        if (!active || e.pointerId !== active.pointerId) {
            return;
        }

        endActive(state, true);
    }

    function detachInteractive(panel) {
        var state = getSession(panel);
        if (!state) {
            return;
        }

        endActive(state, false);

        if (state.header && state.onHeaderDown) {
            state.header.removeEventListener("pointerdown", state.onHeaderDown);
        }

        if (state.resizeHandle && state.onResizeDown) {
            state.resizeHandle.removeEventListener("pointerdown", state.onResizeDown);
        }

        if (state.onMove) {
            document.removeEventListener("pointermove", state.onMove, true);
        }

        if (state.onUp) {
            document.removeEventListener("pointerup", state.onUp, true);
            document.removeEventListener("pointercancel", state.onUp, true);
        }

        if (state.onLostCapture) {
            if (state.header) {
                state.header.removeEventListener("lostpointercapture", state.onLostCapture);
            }

            if (state.resizeHandle) {
                state.resizeHandle.removeEventListener(
                    "lostpointercapture",
                    state.onLostCapture
                );
            }
        }

        deleteSession(panel);
    }

    function attachInteractive(panel, dotNetRef, options) {
        if (!panel) {
            return;
        }

        options = options || {};
        detachInteractive(panel);

        var header = panel.querySelector(".sofia-dialog__header--draggable");
        var resizeHandle = panel.querySelector(".sofia-dialog__resize");
        var draggable = options.draggable !== false && !!header;
        var resizable = options.resizable !== false && !!resizeHandle;

        if (!draggable && !resizable) {
            return;
        }

        var state = {
            panel: panel,
            header: header,
            resizeHandle: resizeHandle,
            dotNetRef: dotNetRef,
            minWidth: options.minWidth > 0 ? options.minWidth : 240,
            minHeight: options.minHeight > 0 ? options.minHeight : 160,
            dragThreshold:
                options.dragThreshold >= 0 ? options.dragThreshold : 3,
            active: null
        };

        state.onMove = function (e) {
            onPointerMove(state, e);
        };

        state.onUp = function (e) {
            onPointerUp(state, e);
        };

        state.onLostCapture = function (e) {
            var active = state.active;
            if (!active || e.pointerId !== active.pointerId) {
                return;
            }

            endActive(state, true);
        };

        state.onHeaderDown = function (e) {
            if (!draggable || e.button !== 0 || e.isPrimary === false) {
                return;
            }

            if (panel.classList.contains("sofia-dialog__panel--maximized")) {
                return;
            }

            if (isInteractiveTarget(e.target)) {
                return;
            }

            e.preventDefault();

            var rect = panel.getBoundingClientRect();
            state.active = {
                type: "drag",
                pointerId: e.pointerId,
                captureEl: header,
                startX: e.clientX,
                startY: e.clientY,
                grabX: e.clientX - rect.left,
                grabY: e.clientY - rect.top,
                left: rect.left,
                top: rect.top,
                currentW: rect.width,
                currentH: rect.height,
                pinned: false,
                moved: false
            };

            setInteracting(false);
            capture(header, e.pointerId);
        };

        state.onResizeDown = function (e) {
            if (!resizable || e.button !== 0 || e.isPrimary === false) {
                return;
            }

            if (panel.classList.contains("sofia-dialog__panel--maximized")) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            var rect = panel.getBoundingClientRect();
            pinPanel(panel, rect);

            state.active = {
                type: "resize",
                pointerId: e.pointerId,
                captureEl: resizeHandle,
                startX: e.clientX,
                startY: e.clientY,
                left: rect.left,
                top: rect.top,
                originW: rect.width,
                originH: rect.height,
                currentW: rect.width,
                currentH: rect.height,
                // Keep the same point on the handle under the cursor (not only the box corner).
                gripOffsetX: e.clientX - (rect.left + rect.width),
                gripOffsetY: e.clientY - (rect.top + rect.height),
                pinned: true,
                moved: false
            };

            setInteracting(true);
            capture(resizeHandle, e.pointerId);
        };

        if (draggable) {
            header.addEventListener("pointerdown", state.onHeaderDown);
            header.addEventListener("lostpointercapture", state.onLostCapture);
        }

        if (resizable) {
            resizeHandle.addEventListener("pointerdown", state.onResizeDown);
            resizeHandle.addEventListener(
                "lostpointercapture",
                state.onLostCapture
            );
        }

        document.addEventListener("pointermove", state.onMove, true);
        document.addEventListener("pointerup", state.onUp, true);
        document.addEventListener("pointercancel", state.onUp, true);

        setSession(panel, state);
    }

    function mountTaskbar(element) {
        if (!element || typeof document === "undefined" || !document.body) {
            return;
        }

        if (element.parentElement !== document.body) {
            document.body.appendChild(element);
        }

        element.setAttribute("data-sofia-taskbar-mounted", "true");
    }

    function unmountTaskbar(element) {
        if (!element || !element.parentElement) {
            return;
        }

        try {
            element.parentElement.removeChild(element);
        } catch (_) {
            /* ignore */
        }
    }

    return {
        setBlockScroll: setBlockScroll,
        attachInteractive: attachInteractive,
        detachInteractive: detachInteractive,
        mountTaskbar: mountTaskbar,
        unmountTaskbar: unmountTaskbar
    };
})();

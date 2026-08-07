window.sofiaSignature = {
    _registry: new Map(),

    init: function (canvas, dotNetRef, options) {
        if (!canvas) {
            return;
        }

        const ctx = canvas.getContext("2d");
        const state = {
            ctx: ctx,
            dotNetRef: dotNetRef,
            options: options || {},
            drawing: false,
            points: [],
            hasInk: false,
            ratio: 1,
            ro: null
        };

        const strokeStyle = () => state.options.strokeColor || "#0f172a";
        const lineWidth = () => state.options.strokeWidth || 2;

        const redrawFromDataUrl = (dataUrl) => {
            if (!dataUrl) {
                return;
            }

            const img = new Image();
            img.onload = () => {
                const w = canvas.width / state.ratio;
                const h = canvas.height / state.ratio;
                ctx.clearRect(0, 0, w, h);
                ctx.drawImage(img, 0, 0, w, h);
            };
            img.src = dataUrl;
        };

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) {
                return;
            }

            const prevDataUrl = state.hasInk ? canvas.toDataURL("image/png") : null;
            const ratio = window.devicePixelRatio || 1;
            state.ratio = ratio;
            canvas.width = Math.max(1, Math.round(rect.width * ratio));
            canvas.height = Math.max(1, Math.round(rect.height * ratio));
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            redrawFromDataUrl(prevDataUrl);
        };

        resize();

        if (typeof ResizeObserver !== "undefined") {
            state.ro = new ResizeObserver(resize);
            state.ro.observe(canvas);
        }

        const getPoint = (e) => {
            const rect = canvas.getBoundingClientRect();
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };

        const drawSegment = (p0, p1, p2) => {
            ctx.strokeStyle = strokeStyle();
            ctx.lineWidth = lineWidth();
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
            ctx.stroke();
        };

        const drawDot = (p) => {
            ctx.beginPath();
            ctx.fillStyle = strokeStyle();
            ctx.arc(p.x, p.y, lineWidth() / 2, 0, Math.PI * 2);
            ctx.fill();
        };

        const onDown = (e) => {
            if (state.options.disabled || state.options.readOnly) {
                return;
            }

            state.drawing = true;
            state.hasInk = true;
            const p = getPoint(e);
            state.points = [p];
            drawDot(p);

            try {
                canvas.setPointerCapture(e.pointerId);
            } catch (_) {
                /* ignore */
            }

            e.preventDefault();
        };

        const onMove = (e) => {
            if (!state.drawing) {
                return;
            }

            const p = getPoint(e);
            state.points.push(p);
            const n = state.points.length;

            if (n === 2) {
                drawSegment(state.points[0], state.points[0], state.points[1]);
            } else if (n >= 3) {
                drawSegment(state.points[n - 3], state.points[n - 2], state.points[n - 1]);
            }

            e.preventDefault();
        };

        const endStroke = async (e) => {
            if (!state.drawing) {
                return;
            }

            state.drawing = false;

            try {
                canvas.releasePointerCapture(e.pointerId);
            } catch (_) {
                /* ignore */
            }

            if (!state.dotNetRef) {
                return;
            }

            const dataUrl = canvas.toDataURL("image/png");

            try {
                await state.dotNetRef.invokeMethodAsync("OnStrokeEnd", dataUrl);
            } catch (_) {
                /* component may already be disposed */
            }
        };

        canvas.addEventListener("pointerdown", onDown);
        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerup", endStroke);
        canvas.addEventListener("pointercancel", endStroke);

        state.handlers = { onDown: onDown, onMove: onMove, endStroke: endStroke };
        this._registry.set(canvas, state);
    },

    setOptions: function (canvas, options) {
        const state = this._registry.get(canvas);
        if (state) {
            state.options = options || {};
        }
    },

    setValue: function (canvas, dataUrl) {
        const state = this._registry.get(canvas);
        if (!state) {
            return;
        }

        state.hasInk = !!dataUrl;
        const w = canvas.width / state.ratio;
        const h = canvas.height / state.ratio;
        state.ctx.clearRect(0, 0, w, h);

        if (!dataUrl) {
            return;
        }

        const img = new Image();
        img.onload = () => state.ctx.drawImage(img, 0, 0, w, h);
        img.src = dataUrl;
    },

    clear: function (canvas) {
        const state = this._registry.get(canvas);
        if (!state) {
            return;
        }

        state.hasInk = false;
        const w = canvas.width / state.ratio;
        const h = canvas.height / state.ratio;
        state.ctx.clearRect(0, 0, w, h);
    },

    dispose: function (canvas) {
        const state = this._registry.get(canvas);
        if (!state) {
            return;
        }

        canvas.removeEventListener("pointerdown", state.handlers.onDown);
        canvas.removeEventListener("pointermove", state.handlers.onMove);
        canvas.removeEventListener("pointerup", state.handlers.endStroke);
        canvas.removeEventListener("pointercancel", state.handlers.endStroke);

        if (state.ro) {
            state.ro.disconnect();
        }

        this._registry.delete(canvas);
    }
};

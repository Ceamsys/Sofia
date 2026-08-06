window.sofiaAnimateOnScroll = {
    _instances: {},
    _scrollY: typeof window !== "undefined" ? window.scrollY || 0 : 0,
    _direction: "down",
    _scrollBound: false,

    _ensureScrollTracker: function () {
        if (this._scrollBound || typeof window === "undefined") {
            return;
        }

        var self = this;
        this._scrollBound = true;
        this._scrollY = window.scrollY || window.pageYOffset || 0;

        window.addEventListener(
            "scroll",
            function () {
                var y = window.scrollY || window.pageYOffset || 0;
                // Deadzone avoids direction flicker on tiny scroll jitter.
                if (y > self._scrollY + 10) {
                    self._direction = "down";
                } else if (y < self._scrollY - 10) {
                    self._direction = "up";
                }
                self._scrollY = y;
            },
            { passive: true }
        );
    },

    _split: function (className) {
        if (!className || typeof className !== "string") {
            return [];
        }

        return className.split(/\s+/).filter(Boolean);
    },

    _addClass: function (el, className) {
        this._split(className).forEach(function (c) {
            el.classList.add(c);
        });
    },

    _removeClass: function (el, className) {
        this._split(className).forEach(function (c) {
            el.classList.remove(c);
        });
    },

    _applyDirection: function (el, direction) {
        el.classList.remove("sofia-aos--dir-up", "sofia-aos--dir-down");
        el.classList.add(direction === "up" ? "sofia-aos--dir-up" : "sofia-aos--dir-down");
        el.setAttribute("data-aos-dir", direction);
    },

    _directionFromEntry: function (entry, isEntering) {
        var rootBottom = window.innerHeight || document.documentElement.clientHeight || 0;
        var top = entry.boundingClientRect.top;
        var bottom = entry.boundingClientRect.bottom;

        if (isEntering) {
            if (bottom <= 0) {
                return "up";
            }
            if (top >= rootBottom) {
                return "down";
            }
            return top > rootBottom * 0.4 ? "down" : this._direction;
        }

        if (bottom <= 0 || top < 0) {
            return "down";
        }
        if (top >= rootBottom) {
            return "up";
        }

        return this._direction;
    },

    observe: function (element, dotNetRef, options) {
        if (!element || typeof IntersectionObserver === "undefined") {
            return null;
        }

        this._ensureScrollTracker();

        options = options || {};
        var self = this;
        var enterClass = options.enterClass || "";
        var leaveClass = options.leaveClass || "";
        var once = !!options.once;
        // Slight inset so edges don't flicker; keep stable (no dynamic changes).
        var rootMargin = options.rootMargin || "0px 0px -6% 0px";
        var root = null;

        // Hysteresis: must reach enterAt to show, must fall to leaveAt to hide.
        var enterAt = options.enterThreshold != null ? options.enterThreshold : 0.28;
        var leaveAt = options.leaveThreshold != null ? options.leaveThreshold : 0.06;
        if (leaveAt >= enterAt) {
            leaveAt = Math.max(0, enterAt * 0.25);
        }

        if (options.rootSelector) {
            root = document.querySelector(options.rootSelector);
        }

        if (root) {
            var lastTop = root.scrollTop || 0;
            root.addEventListener(
                "scroll",
                function () {
                    var top = root.scrollTop || 0;
                    if (top > lastTop + 10) {
                        self._direction = "down";
                    } else if (top < lastTop - 10) {
                        self._direction = "up";
                    }
                    lastTop = top;
                },
                { passive: true }
            );
        }

        var id = "aos-" + Math.random().toString(36).slice(2);
        var animationState = enterClass ? "hidden" : "visible";
        var isShown = !enterClass;
        var busy = false;
        var cooldownUntil = 0;
        var lastEntry = null;
        var pendingShown = null;
        var animationEndListener;
        var observer;
        var cooldownTimer;

        if (enterClass) {
            element.style.opacity = "0";
            element.classList.add("sofia-aos--pending");
        }

        function now() {
            return typeof performance !== "undefined" && performance.now
                ? performance.now()
                : Date.now();
        }

        function isBusy() {
            return busy || now() < cooldownUntil;
        }

        function unbindAnimationEvents() {
            if (animationEndListener) {
                element.removeEventListener("animationend", animationEndListener);
                animationEndListener = undefined;
            }
        }

        function startCooldown(ms) {
            cooldownUntil = now() + (ms || 140);
            if (cooldownTimer) {
                clearTimeout(cooldownTimer);
            }
            cooldownTimer = setTimeout(function () {
                cooldownTimer = null;
                flushPending();
            }, (ms || 140) + 16);
        }

        function bindAnimationEvents(onEnd) {
            unbindAnimationEvents();
            animationEndListener = function (ev) {
                if (ev.target !== element) {
                    return;
                }

                // Ignore child / leftover animation names.
                var name = ev.animationName || "";
                if (
                    name &&
                    name.indexOf("sofia-aos-enter") < 0 &&
                    name.indexOf("sofia-aos-leave") < 0
                ) {
                    return;
                }

                self._removeClass(element, enterClass);
                self._removeClass(element, leaveClass);
                busy = false;
                if (typeof onEnd === "function") {
                    onEnd();
                }
                unbindAnimationEvents();
                startCooldown(160);
            };
            element.addEventListener("animationend", animationEndListener);
        }

        function enter(direction) {
            if (!enterClass || isShown || animationState === "enter") {
                return;
            }

            // Never interrupt a leave mid-flight; queue instead.
            if (busy) {
                pendingShown = true;
                return;
            }

            busy = true;
            pendingShown = null;
            self._applyDirection(element, direction || self._direction);
            element.classList.remove("sofia-aos--pending");
            element.style.opacity = "";
            self._removeClass(element, leaveClass);
            void element.offsetWidth;
            self._addClass(element, enterClass);

            if (once && observer) {
                observer.unobserve(element);
            }

            animationState = "enter";
            isShown = true;

            bindAnimationEvents(function () {
                element.style.opacity = "1";
                animationState = "visible";
            });

            if (dotNetRef) {
                try {
                    dotNetRef.invokeMethodAsync("NotifyEnter");
                } catch (_) {
                    /* ignore */
                }
            }
        }

        function leave(direction) {
            if (!isShown || animationState === "leave" || animationState === "hidden") {
                return;
            }

            if (busy) {
                pendingShown = false;
                return;
            }

            if (!leaveClass) {
                element.style.opacity = enterClass ? "0" : "";
                element.classList.add("sofia-aos--pending");
                animationState = "hidden";
                isShown = false;
                startCooldown(120);
                return;
            }

            busy = true;
            pendingShown = null;
            self._applyDirection(element, direction || self._direction);
            self._removeClass(element, enterClass);
            element.style.opacity = "1";
            void element.offsetWidth;
            self._addClass(element, leaveClass);

            animationState = "leave";
            isShown = false;

            bindAnimationEvents(function () {
                element.style.opacity = "0";
                element.classList.add("sofia-aos--pending");
                animationState = "hidden";
            });

            if (dotNetRef) {
                try {
                    dotNetRef.invokeMethodAsync("NotifyLeave");
                } catch (_) {
                    /* ignore */
                }
            }
        }

        function desiredFromEntry(entry) {
            if (!entry) {
                return isShown;
            }

            var ratio = entry.intersectionRatio || 0;
            if (!entry.isIntersecting) {
                ratio = 0;
            }

            // Hysteresis band between leaveAt and enterAt prevents threshold chatter.
            if (isShown) {
                return ratio > leaveAt;
            }

            return ratio >= enterAt;
        }

        function flushPending() {
            if (isBusy()) {
                return;
            }

            var want = pendingShown;
            if (want === null && lastEntry) {
                want = desiredFromEntry(lastEntry);
            }

            if (want === null || want === isShown) {
                pendingShown = null;
                return;
            }

            pendingShown = null;
            var dir = self._direction;
            if (lastEntry) {
                dir = self._direction || self._directionFromEntry(lastEntry, want);
            }

            if (want) {
                enter(dir);
            } else {
                leave(dir);
            }
        }

        function onIntersect(entry) {
            lastEntry = entry;
            var want = desiredFromEntry(entry);

            if (want === isShown) {
                pendingShown = null;
                return;
            }

            if (isBusy()) {
                // Remember intent; apply only after animation/cooldown settles.
                pendingShown = want;
                return;
            }

            var dir = self._direction || self._directionFromEntry(entry, want);
            if (want) {
                enter(dir);
            } else {
                leave(dir);
            }
        }

        observer = new IntersectionObserver(
            function (entries) {
                var entry = entries[0];
                if (!entry) {
                    return;
                }
                onIntersect(entry);
            },
            {
                root: root,
                rootMargin: rootMargin,
                // Dense thresholds so ratio updates smoothly for hysteresis.
                threshold: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.65, 0.8, 1]
            }
        );

        setTimeout(function () {
            observer.observe(element);
        }, 0);

        this._instances[id] = {
            element: element,
            observer: observer,
            unbindAnimationEvents: unbindAnimationEvents,
            clearCooldown: function () {
                if (cooldownTimer) {
                    clearTimeout(cooldownTimer);
                    cooldownTimer = null;
                }
            }
        };

        return id;
    },

    unobserve: function (id) {
        var instance = this._instances[id];
        if (!instance) {
            return;
        }

        try {
            instance.unbindAnimationEvents();
            instance.clearCooldown();
            instance.observer.unobserve(instance.element);
            instance.observer.disconnect();
        } catch (_) {
            /* ignore */
        }

        delete this._instances[id];
    }
};

window.sofiaSpeech = {
    _registry: new Map(),

    isSupported: function () {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    },

    start: function (dotNetRef, id, language) {
        const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Ctor) {
            return false;
        }

        this.stop(id);

        const recognition = new Ctor();
        recognition.lang = language || navigator.language || "en-US";
        recognition.continuous = true;
        recognition.interimResults = false;

        let finalTranscript = "";

        recognition.onresult = function (event) {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
        };

        recognition.onerror = function () {
            /* swallowed — onend still fires and finalizes with whatever transcript was captured */
        };

        recognition.onend = async () => {
            this._registry.delete(id);

            try {
                await dotNetRef.invokeMethodAsync("OnResult", finalTranscript.trim());
            } catch (_) {
                /* component may already be disposed */
            }
        };

        try {
            recognition.start();
        } catch (_) {
            return false;
        }

        this._registry.set(id, recognition);
        return true;
    },

    stop: function (id) {
        const recognition = this._registry.get(id);
        if (!recognition) {
            return;
        }

        try {
            recognition.stop();
        } catch (_) {
            /* ignore */
        }
    },

    dispose: function (id) {
        this.stop(id);
        this._registry.delete(id);
    }
};

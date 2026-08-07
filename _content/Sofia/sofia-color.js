window.sofiaColor = {
  getRect: function (element) {
    if (!element) {
      return { width: 0, height: 0, left: 0, top: 0 };
    }

    var rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top
    };
  },

  eyeDropperPick: async function () {
    if (!window.EyeDropper) {
      return null;
    }

    try {
      var dropper = new window.EyeDropper();
      var result = await dropper.open();
      return result && result.sRGBHex ? result.sRGBHex : null;
    } catch (e) {
      return null;
    }
  }
};

// Back-compat alias used by early drafts.
window.sofiaEyeDropperPick = function () {
  return window.sofiaColor.eyeDropperPick();
};

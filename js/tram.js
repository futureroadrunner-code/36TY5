/**
 * Tram-compatible tween helper (Webflow production pattern).
 * Sets inline styles through jQuery when present, native style otherwise.
 */
(function (root) {
  "use strict";

  function unwrap(el) {
    if (!el) return null;
    if (el.jquery) return el[0];
    if (typeof el === "string") return document.querySelector(el);
    return el;
  }

  function kebab(prop) {
    return prop.replace(/[A-Z]/g, function (m) {
      return "-" + m.toLowerCase();
    });
  }

  function parseAdd(str) {
    var parts = String(str || "").trim().split(/\s+/);
    var prop = parts[0] || "opacity";
    var time = parts[1] || "400ms";
    var ease = parts.slice(2).join(" ") || "ease";
    var dur = parseFloat(time);
    if (/ms$/i.test(time)) dur = dur;
    else if (/s$/i.test(time)) dur = dur * 1000;
    else dur = 400;
    return { prop: prop, dur: dur, ease: ease };
  }

  function write(el, key, value) {
    var $ = root.jQuery;
    if ($ && el) {
      $(el).css(key, value);
      return;
    }
    if (el) el.style[key] = value;
  }

  function tram(el) {
    el = unwrap(el);
    var current = { prop: "opacity", dur: 400, ease: "cubic-bezier(0.22, 1, 0.36, 1)" };
    var api = {
      add: function (def) {
        current = parseAdd(def);
        return api;
      },
      set: function (obj) {
        Object.keys(obj || {}).forEach(function (k) {
          write(el, k, obj[k]);
        });
        return api;
      },
      start: function (obj) {
        if (!el) return api;
        var keys = Object.keys(obj || {});
        el.style.transition = keys
          .map(function (k) {
            return kebab(k) + " " + current.dur + "ms " + current.ease;
          })
          .join(", ");
        root.requestAnimationFrame(function () {
          keys.forEach(function (k) {
            write(el, k, obj[k]);
          });
        });
        return api;
      },
    };
    return api;
  }

  tram.frame = root.requestAnimationFrame.bind(root);
  root.tram = tram;
})(window);

(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) root.TradeCalc = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var TRILLION = 1e12;

  // P&L = investment × (exit − entry) ÷ entry
  // ROI = P&L ÷ investment
  function calculate(entry, exitPrice, investment) {
    if (!Number.isFinite(entry) || !Number.isFinite(exitPrice) || !Number.isFinite(investment)) {
      return null;
    }
    if (entry <= 0 || investment <= 0 || exitPrice < 0) return null;

    var quantity = investment / entry;
    var exitValue;
    var pnl;
    var roi;

    if (exitPrice === entry) {
      exitValue = investment;
      pnl = 0;
      roi = 0;
    } else {
      exitValue = (investment * exitPrice) / entry;
      pnl = exitValue - investment;
      roi = (pnl / investment) * 100;
    }

    if (![quantity, exitValue, pnl, roi].every(Number.isFinite)) return null;

    return {
      quantity: quantity,
      exitValue: exitValue,
      pnl: pnl,
      roi: roi,
    };
  }

  function sanitize(raw) {
    var value = String(raw).replace(/[$,\s]/g, "").replace(/[^\d.]/g, "");
    var dot = value.indexOf(".");
    if (dot !== -1) {
      value = value.slice(0, dot + 1) + value.slice(dot + 1).replace(/\./g, "");
    }

    var pieces = value.split(".");
    var whole = pieces[0].replace(/^0+(?=\d)/, "");
    var fraction = pieces[1];
    if (whole.length > 12) whole = whole.slice(0, 12);

    if (fraction !== undefined) {
      if (whole === "") whole = "0";
      return whole + "." + fraction.slice(0, 12);
    }
    return whole;
  }

  function plainDecimal(value) {
    if (!Number.isFinite(value) || value < 0 || value >= TRILLION) return null;
    if (value === 0) return "0";

    var exp = Math.floor(Math.log10(value) + 1e-12);
    var decimals = Math.min(18, Math.max(0, 12 - exp - 1));
    var text = value.toFixed(decimals).replace(/\.?0+$/, "");
    if (!/^\d+(\.\d+)?$/.test(text)) return null;
    text = sanitize(text);
    if (text === "" || text === ".") return null;
    return text;
  }

  function parseAmount(raw) {
    if (raw == null) return { ok: false, reason: "empty" };

    var compact = String(raw).trim().replace(/[$,\s]/g, "");
    if (compact === "" || compact === "." || compact === "0.") {
      return { ok: false, reason: "empty" };
    }

    if (/e/i.test(compact)) {
      if (!/^\d+(\.\d+)?e[+-]?\d+$/i.test(compact)) {
        return { ok: false, reason: "invalid" };
      }
      var scientific = Number(compact);
      if (!Number.isFinite(scientific) || scientific < 0) {
        return { ok: false, reason: "invalid" };
      }
      if (scientific >= TRILLION) return { ok: false, reason: "too-large" };
      return { ok: true, value: scientific };
    }

    var cleaned = sanitize(compact);
    if (cleaned === "" || cleaned === "." || cleaned === "0.") {
      return { ok: false, reason: "empty" };
    }

    var normalized = cleaned.endsWith(".") ? cleaned.slice(0, -1) : cleaned;
    if (normalized === "") return { ok: false, reason: "empty" };
    if (!/^\d+(\.\d+)?$/.test(normalized)) return { ok: false, reason: "invalid" };

    var value = Number(normalized);
    if (!Number.isFinite(value)) return { ok: false, reason: "invalid" };
    if (value >= TRILLION) return { ok: false, reason: "too-large" };
    return { ok: true, value: value };
  }

  function fractionDigits(abs) {
    if (abs === 0 || abs >= 0.01) return 2;
    if (abs >= 0.0001) return 4;
    if (abs >= 0.000001) return 6;
    return 8;
  }

  function formatAbs(abs) {
    var digits = fractionDigits(abs);
    var rounded = Number(abs.toFixed(digits));
    if (rounded === 0) return "0.00";
    var minimum = digits === 2 ? 2 : Math.min(2, digits);
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: minimum,
      maximumFractionDigits: digits,
    }).format(rounded);
  }

  function formatSignedMoney(value) {
    if (!Number.isFinite(value)) return "—";
    var body = formatAbs(Math.abs(value));
    if (body === "0.00") return "$0.00";
    return (value > 0 ? "+" : "−") + "$" + body;
  }

  function formatMoney(value) {
    if (!Number.isFinite(value)) return "—";
    return "$" + formatAbs(Math.abs(value));
  }

  function formatPercent(value) {
    if (!Number.isFinite(value)) return "—";
    var abs = Math.abs(value);
    var digits = fractionDigits(abs);
    var rounded = Number(abs.toFixed(digits));
    if (rounded === 0) return "0.00%";
    var minimum = digits === 2 ? 2 : Math.min(2, digits);
    var body = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: minimum,
      maximumFractionDigits: digits,
    }).format(rounded);
    return (value > 0 ? "+" : "−") + body + "%";
  }

  function formatUnits(value) {
    if (!Number.isFinite(value)) return "—";
    var abs = Math.abs(value);
    if (abs >= 1e9) {
      return new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 2,
      }).format(value);
    }
    var digits = 8;
    if (abs >= 1000) digits = 2;
    else if (abs >= 1) digits = 4;
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: digits,
    }).format(value);
  }

  function formatPosition(quantity) {
    var text = formatUnits(quantity);
    return text + (text === "1" ? " unit" : " units");
  }

  return {
    calculate: calculate,
    sanitize: sanitize,
    plainDecimal: plainDecimal,
    parseAmount: parseAmount,
    formatSignedMoney: formatSignedMoney,
    formatMoney: formatMoney,
    formatPercent: formatPercent,
    formatUnits: formatUnits,
    formatPosition: formatPosition,
  };
});

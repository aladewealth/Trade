(function () {
  "use strict";

  var api = window.TradeCalc;
  var entry = document.getElementById("entry");
  var exit = document.getElementById("exit");
  var amount = document.getElementById("amount");
  var form = document.getElementById("form");
  var resetButton = document.getElementById("reset");
  var board = document.getElementById("board");
  var statusEl = document.getElementById("status");
  var pnlEl = document.getElementById("pnl");
  var roiEl = document.getElementById("roi");
  var exitValueEl = document.getElementById("exit-value");
  var sizeEl = document.getElementById("size");
  var errorEl = document.getElementById("error");
  var live = document.getElementById("live");

  var fields = { entry: entry, exit: exit, amount: amount };
  var labels = {
    entry: "Entry price",
    exit: "Exit price",
    amount: "Investment amount",
  };
  var announceTimer = 0;
  var lastSpoken = "";

  function announce(text) {
    window.clearTimeout(announceTimer);
    announceTimer = window.setTimeout(function () {
      if (text === lastSpoken) return;
      lastSpoken = text;
      live.textContent = text;
    }, 350);
  }

  function setInvalid(key) {
    Object.keys(fields).forEach(function (name) {
      var input = fields[name];
      var invalid = name === key;
      input.closest(".field").classList.toggle("is-invalid", invalid);
      input.setAttribute("aria-invalid", invalid ? "true" : "false");
      input.setAttribute(
        "aria-describedby",
        invalid ? name + "-hint error" : name + "-hint"
      );
    });
  }

  function showWaiting(message, invalidKey) {
    board.dataset.state = message ? "invalid" : "empty";
    statusEl.textContent = message ? "Check values" : "Awaiting position";
    pnlEl.textContent = "—";
    roiEl.textContent = "—";
    exitValueEl.textContent = "—";
    sizeEl.textContent = "—";
    errorEl.textContent = message || "";
    setInvalid(invalidKey);
    if (!message) announce("Awaiting entry price, exit price, and investment amount.");
  }

  function speakResult(position, state) {
    if (state === "flat") return "Breakeven. ROI 0 percent.";
    var word = state === "profit" ? "Profit" : "Loss";
    var money = api.formatSignedMoney(position.pnl).replace("−", "minus ").replace("+", "plus ");
    var percent = api
      .formatPercent(position.roi)
      .replace("−", "minus ")
      .replace("+", "plus ")
      .replace("%", " percent");
    return word + ". " + money + ". ROI " + percent + ".";
  }

  function showResult(position) {
    var money = api.formatSignedMoney(position.pnl);
    var state = money === "$0.00" ? "flat" : position.pnl > 0 ? "profit" : "loss";
    var status = state === "profit" ? "Profit" : state === "loss" ? "Loss" : "Breakeven";

    board.dataset.state = state;
    statusEl.textContent = status;
    pnlEl.textContent = money;
    roiEl.textContent = api.formatPercent(position.roi);
    exitValueEl.textContent = api.formatMoney(position.exitValue);
    sizeEl.textContent = api.formatPosition(position.quantity);
    errorEl.textContent = "";
    setInvalid(null);
    announce(speakResult(position, state));
  }

  function messageFor(key, reason) {
    if (reason === "too-large") return labels[key] + " must be under 1 trillion.";
    return labels[key] + " must be a number.";
  }

  function render() {
    resetButton.disabled = [entry, exit, amount].every(function (input) {
      return input.value.trim() === "";
    });

    var parsed = {
      entry: api.parseAmount(entry.value),
      exit: api.parseAmount(exit.value),
      amount: api.parseAmount(amount.value),
    };
    var order = ["entry", "exit", "amount"];
    var index;

    for (index = 0; index < order.length; index += 1) {
      var key = order[index];
      if (!parsed[key].ok && parsed[key].reason !== "empty") {
        showWaiting(messageFor(key, parsed[key].reason), key);
        return;
      }
    }

    if (!parsed.entry.ok || !parsed.exit.ok || !parsed.amount.ok) {
      showWaiting("", null);
      return;
    }

    if (parsed.entry.value <= 0) {
      showWaiting("Entry price must be greater than zero.", "entry");
      return;
    }
    if (parsed.amount.value <= 0) {
      showWaiting("Investment amount must be greater than zero.", "amount");
      return;
    }

    var position = api.calculate(parsed.entry.value, parsed.exit.value, parsed.amount.value);
    if (!position) {
      showWaiting("Those values can’t be calculated.", null);
      return;
    }
    showResult(position);
  }

  function onInput(event) {
    var input = event.target;
    var compact = input.value.replace(/[$,\s]/g, "");
    if (/^\d+(\.\d+)?e[+-]?\d+$/i.test(compact)) {
      var plain = api.plainDecimal(Number(compact));
      input.value = plain == null ? compact : plain;
      render();
      return;
    }

    var next = api.sanitize(input.value);
    if (next !== input.value) {
      var caret = input.selectionStart == null ? next.length : input.selectionStart;
      var removed = input.value.length - next.length;
      input.value = next;
      var pos = Math.max(0, caret - removed);
      input.setSelectionRange(pos, pos);
    }
    render();
  }

  function reset() {
    entry.value = "";
    exit.value = "";
    amount.value = "";
    render();
    entry.focus();
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
  });
  [entry, exit, amount].forEach(function (input) {
    input.addEventListener("input", onInput);
  });
  resetButton.addEventListener("click", reset);
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" || resetButton.disabled) return;
    event.preventDefault();
    reset();
  });

  render();
})();

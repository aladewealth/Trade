"use strict";

const assert = require("node:assert/strict");
const calc = require("./calc.js");

let passed = 0;

function test(name, fn) {
  fn();
  passed += 1;
  console.log("ok  " + name);
}

function close(actual, expected) {
  const scale = Math.max(1, Math.abs(actual), Math.abs(expected));
  assert.ok(Math.abs(actual - expected) <= scale * 1e-9, actual + " vs " + expected);
}

test("profit on a higher exit", () => {
  const result = calc.calculate(100, 150, 200);
  assert.equal(result.pnl, 100);
  assert.equal(result.roi, 50);
  assert.equal(result.exitValue, 300);
  assert.equal(result.quantity, 2);
  assert.equal(calc.formatSignedMoney(result.pnl), "+$100.00");
  assert.equal(calc.formatPercent(result.roi), "+50.00%");
  assert.equal(calc.formatMoney(result.exitValue), "$300.00");
  assert.equal(calc.formatPosition(result.quantity), "2 units");
});

test("loss on a lower exit", () => {
  const result = calc.calculate(100, 80, 500);
  assert.equal(result.pnl, -100);
  assert.equal(result.roi, -20);
  assert.equal(result.exitValue, 400);
  assert.equal(result.quantity, 5);
  assert.equal(calc.formatSignedMoney(result.pnl), "−$100.00");
  assert.equal(calc.formatPercent(result.roi), "−20.00%");
});

test("equal prices are breakeven", () => {
  const result = calc.calculate(7.5, 7.5, 3);
  assert.equal(result.pnl, 0);
  assert.equal(result.roi, 0);
  assert.equal(result.exitValue, 3);
  assert.equal(result.quantity, 0.4);
  assert.equal(calc.formatSignedMoney(result.pnl), "$0.00");
  assert.equal(calc.formatPercent(result.roi), "0.00%");
});

test("a zero exit is a total loss", () => {
  const result = calc.calculate(5, 0, 40);
  assert.equal(result.pnl, -40);
  assert.equal(result.roi, -100);
  assert.equal(result.exitValue, 0);
  assert.equal(result.quantity, 8);
  assert.equal(calc.formatSignedMoney(result.pnl), "−$40.00");
  assert.equal(calc.formatPercent(result.roi), "−100.00%");
  assert.equal(calc.formatMoney(result.exitValue), "$0.00");
});

test("repeating decimals round half up for display", () => {
  const result = calc.calculate(3, 2, 1000);
  close(result.pnl, -1000 / 3);
  close(result.roi, -100 / 3);
  assert.equal(calc.formatSignedMoney(result.pnl), "−$333.33");
  assert.equal(calc.formatPercent(result.roi), "−33.33%");
  assert.equal(calc.formatMoney(result.exitValue), "$666.67");
});

test("binary fractions still display as exact money", () => {
  const result = calc.calculate(0.1, 0.3, 10);
  assert.equal(calc.formatSignedMoney(result.pnl), "+$20.00");
  assert.equal(calc.formatPercent(result.roi), "+200.00%");
});

test("demo position: 64200 to 71500 on 2500", () => {
  const result = calc.calculate(64200, 71500, 2500);
  assert.equal(calc.formatSignedMoney(result.pnl), "+$284.27");
  assert.equal(calc.formatPercent(result.roi), "+11.37%");
  assert.equal(calc.formatMoney(result.exitValue), "$2,784.27");
  assert.equal(calc.formatPosition(result.quantity), "0.03894081 units");
});

test("demo loss: 64200 to 58000 on 2500", () => {
  const result = calc.calculate(64200, 58000, 2500);
  assert.equal(calc.formatSignedMoney(result.pnl), "−$241.43");
  assert.equal(calc.formatPercent(result.roi), "−9.66%");
});

test("small coin prices double the position", () => {
  const entry = 0.00001234;
  const result = calc.calculate(entry, entry * 2, 100);
  close(result.pnl, 100);
  close(result.roi, 100);
  close(result.exitValue, 200);
});

test("roi and exit value stay consistent with profit", () => {
  for (let i = 0; i < 200; i += 1) {
    const entry = Number((Math.random() * 1000 + 0.01).toFixed(4));
    const exit = Number((Math.random() * 1000).toFixed(4));
    const investment = Number((Math.random() * 50000 + 1).toFixed(2));
    const result = calc.calculate(entry, exit, investment);
    assert.ok(result);
    close(result.roi, (result.pnl / investment) * 100);
    close(result.exitValue, investment + result.pnl);
    close(result.quantity, investment / entry);
    if (exit > entry) assert.ok(result.pnl > 0);
    else if (exit < entry) assert.ok(result.pnl < 0);
    else assert.equal(result.pnl, 0);
  }
});

test("a higher exit increases profit", () => {
  const lower = calc.calculate(100, 110, 50);
  const higher = calc.calculate(100, 120, 50);
  assert.ok(higher.pnl > lower.pnl);
  assert.equal(higher.pnl, 10);
  assert.equal(lower.pnl, 5);
});

test("invalid positions are rejected", () => {
  assert.equal(calc.calculate(0, 10, 10), null);
  assert.equal(calc.calculate(-1, 10, 10), null);
  assert.equal(calc.calculate(10, -1, 10), null);
  assert.equal(calc.calculate(10, 12, 0), null);
  assert.equal(calc.calculate(Number.NaN, 1, 1), null);
});

test("parsing accepts currency paste and decimals", () => {
  assert.deepEqual(calc.parseAmount(""), { ok: false, reason: "empty" });
  assert.deepEqual(calc.parseAmount("   "), { ok: false, reason: "empty" });
  assert.deepEqual(calc.parseAmount("$1,234.50"), { ok: true, value: 1234.5 });
  assert.deepEqual(calc.parseAmount("0.5"), { ok: true, value: 0.5 });
  assert.deepEqual(calc.parseAmount(".5"), { ok: true, value: 0.5 });
  assert.deepEqual(calc.parseAmount("0"), { ok: true, value: 0 });
  assert.equal(calc.parseAmount("1e-8").ok, true);
  close(calc.parseAmount("1e-8").value, 1e-8);
  assert.equal(calc.parseAmount("1e20").reason, "too-large");
  assert.equal(calc.parseAmount("1e").reason, "invalid");
});

test("sanitize keeps a single decimal and drops symbols", () => {
  assert.equal(calc.sanitize("$1,234.50"), "1234.50");
  assert.equal(calc.sanitize("00.50"), "0.50");
  assert.equal(calc.sanitize(".5"), "0.5");
  assert.equal(calc.sanitize("12.3.4"), "12.34");
  assert.equal(calc.sanitize("abc"), "");
  assert.equal(calc.sanitize("-20"), "20");
  assert.equal(calc.sanitize("0."), "0.");
});

test("scientific paste becomes a plain decimal", () => {
  assert.equal(calc.plainDecimal(1e-8), "0.00000001");
  assert.equal(calc.plainDecimal(1e6), "1000000");
  assert.equal(calc.plainDecimal(1234.5), "1234.5");
  assert.equal(calc.plainDecimal(0.1), "0.1");
  assert.equal(calc.plainDecimal(1.25), "1.25");
  assert.equal(calc.plainDecimal(0), "0");
  assert.equal(calc.plainDecimal(1e13), null);
});

test("one coin is singular", () => {
  assert.equal(calc.formatPosition(1), "1 unit");
  assert.equal(calc.formatPosition(1.5), "1.5 units");
});

test("dust that rounds away displays as zero money", () => {
  assert.equal(calc.formatSignedMoney(1e-12), "$0.00");
  assert.equal(calc.formatSignedMoney(-1e-12), "$0.00");
  assert.equal(calc.formatPercent(1e-12), "0.00%");
});

console.log("\n" + passed + " tests passed");

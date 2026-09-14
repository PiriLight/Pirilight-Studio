import { describe, expect, it } from "vitest";

import type { Payment } from "@/types";

import { derivePaymentProgressView, derivePaymentStatus, getRemainingValue, summarizePayments } from "./payment";

const TODAY = "2026-03-29";

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "pay-1",
    businessId: "biz-1",
    projectId: null,
    totalValue: 400,
    amountReceived: 200,
    paymentStatus: "partial",
    expectedDate: TODAY,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("getRemainingValue", () => {
  it("é sempre total menos recebido", () => {
    expect(getRemainingValue({ totalValue: 400, amountReceived: 200 })).toBe(200);
    expect(getRemainingValue({ totalValue: 400, amountReceived: 0 })).toBe(400);
    expect(getRemainingValue({ totalValue: 400, amountReceived: 400 })).toBe(0);
  });

  it("arredonda a cêntimos, sem lixo de vírgula flutuante", () => {
    expect(getRemainingValue({ totalValue: 0.3, amountReceived: 0.1 })).toBe(0.2);
  });

  it("não esconde um valor negativo — isso é erro de dados, não caso normal", () => {
    expect(getRemainingValue({ totalValue: 100, amountReceived: 150 })).toBe(-50);
  });
});

describe("derivePaymentStatus", () => {
  it("marca como em atraso quando venceu e ainda há saldo", () => {
    expect(derivePaymentStatus(makePayment({ expectedDate: "2026-03-20" }), TODAY)).toBe("overdue");
  });

  it("não marca como em atraso quando está totalmente pago", () => {
    const paid = makePayment({
      expectedDate: "2026-01-01",
      amountReceived: 400,
      paymentStatus: "paid",
    });
    expect(derivePaymentStatus(paid, TODAY)).toBe("paid");
  });

  it("não marca como em atraso no próprio dia de vencimento", () => {
    expect(derivePaymentStatus(makePayment({ expectedDate: TODAY }), TODAY)).toBe("partial");
  });

  it("mantém o estado guardado quando ainda não venceu", () => {
    expect(derivePaymentStatus(makePayment({ expectedDate: "2026-04-10" }), TODAY)).toBe("partial");
  });
});

describe("summarizePayments", () => {
  it("agrega totais e sinaliza atrasos", () => {
    const summary = summarizePayments(
      [
        makePayment({ id: "a", totalValue: 400, amountReceived: 200, expectedDate: "2026-03-20" }),
        makePayment({
          id: "b",
          totalValue: 600,
          amountReceived: 600,
          paymentStatus: "paid",
          expectedDate: "2026-02-01",
        }),
      ],
      TODAY,
    );

    expect(summary).toEqual({
      totalValue: 1000,
      amountReceived: 800,
      remainingValue: 200,
      hasOverdue: true,
      hasPayments: true,
    });
  });

  it("uma lista vazia dá zeros e nenhum atraso", () => {
    expect(summarizePayments([], TODAY)).toEqual({
      totalValue: 0,
      amountReceived: 0,
      remainingValue: 0,
      hasOverdue: false,
      hasPayments: false,
    });
  });

  it("Round 5.1: distingue 'sem nenhum Payment' de 'um Payment real com total 0€'", () => {
    const noPayments = summarizePayments([], TODAY);
    const zeroValuePayment = summarizePayments(
      [makePayment({ totalValue: 0, amountReceived: 0, paymentStatus: "paid" })],
      TODAY,
    );

    expect(noPayments.hasPayments).toBe(false);
    expect(zeroValuePayment.hasPayments).toBe(true);
    // As duas têm totalValue === 0 — é precisamente o caso que totalValue
    // sozinho não conseguia distinguir.
    expect(noPayments.totalValue).toBe(0);
    expect(zeroValuePayment.totalValue).toBe(0);
  });
});

describe("derivePaymentProgressView (Round 5.1 — já não usa totalValue === 0 para inferir ausência de Payment)", () => {
  it("sem nenhum Payment: hasPayments false, sem percent/isPaid relevantes", () => {
    const view = derivePaymentProgressView(summarizePayments([], TODAY));
    expect(view.hasPayments).toBe(false);
  });

  it("um Payment real com total 0€ é tratado como pago, não como ausente", () => {
    const summary = summarizePayments(
      [makePayment({ totalValue: 0, amountReceived: 0, paymentStatus: "paid" })],
      TODAY,
    );
    const view = derivePaymentProgressView(summary);

    expect(view.hasPayments).toBe(true);
    expect(view.isPaid).toBe(true);
    expect(view.percent).toBe(100);
    expect(Number.isNaN(view.percent)).toBe(false);
  });

  it("um Payment parcial normal continua a calcular a percentagem certa", () => {
    const summary = summarizePayments([makePayment({ totalValue: 400, amountReceived: 100 })], TODAY);
    const view = derivePaymentProgressView(summary);

    expect(view.hasPayments).toBe(true);
    expect(view.isPaid).toBe(false);
    expect(view.percent).toBe(25);
  });
});

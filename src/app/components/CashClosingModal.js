"use client";

import { useState, useMemo } from "react";
import { summarizeCashClosing, printCashClosing } from "@/lib/thermalPrint";

function formatMoney(value) {
  return Number(value || 0)
    .toFixed(2)
    .replace(".", ",");
}

function getTodayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateBr(isoDate) {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

export default function CashClosingModal({
  isOpen,
  orders,
  store,
  paperWidth,
  onClose,
}) {
  const [selectedDate, setSelectedDate] = useState(() => getTodayIsoDate());

  const summary = useMemo(
    () => summarizeCashClosing(orders, selectedDate),
    [orders, selectedDate],
  );

  if (!isOpen) return null;

  const dateLabel = formatDateBr(selectedDate);

  function handlePrint() {
    printCashClosing({
      summary,
      store,
      dateLabel,
      paperWidth,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900 tracking-tight">
              Fechamento de Caixa
            </h2>
            <p className="text-xs text-zinc-500">
              Resumo diário de vendas por forma de pagamento
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-zinc-700 font-bold text-sm transition cursor-pointer"
            aria-label="Fechar fechamento de caixa"
          >
            ✕
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {/* Seletor de data */}
          <div className="flex items-center justify-between gap-3 bg-[#F8F7F5] px-4 py-3 rounded-2xl border border-stone-200/80">
            <label className="text-xs font-bold text-zinc-700">
              Data de referência:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none focus:border-[#BC0202]"
            />
          </div>

          {/* Cards de métricas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
              <p className="text-[10px] font-extrabold uppercase text-emerald-700">
                Total Válido
              </p>
              <p className="text-base font-black text-emerald-950 mt-0.5">
                R$ {formatMoney(summary.grandTotal)}
              </p>
              <p className="text-[11px] text-emerald-700 font-semibold">
                {summary.validCount} pedidos
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200">
              <p className="text-[10px] font-extrabold uppercase text-zinc-500">
                Já Recebido
              </p>
              <p className="text-base font-black text-zinc-900 mt-0.5">
                R$ {formatMoney(summary.paidTotal)}
              </p>
              <p className="text-[11px] text-zinc-500 font-semibold">
                Confirmados
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
              <p className="text-[10px] font-extrabold uppercase text-amber-800">
                A Receber
              </p>
              <p className="text-base font-black text-amber-950 mt-0.5">
                R$ {formatMoney(summary.unpaidTotal)}
              </p>
              <p className="text-[11px] text-amber-700 font-semibold">
                Pendentes
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200">
              <p className="text-[10px] font-extrabold uppercase text-zinc-500">
                Ticket Médio
              </p>
              <p className="text-base font-black text-zinc-900 mt-0.5">
                R$ {formatMoney(summary.averageTicket)}
              </p>
              <p className="text-[11px] text-zinc-500 font-semibold">
                {summary.canceledCount} cancelados
              </p>
            </div>
          </div>

          {/* Por forma de pagamento */}
          <div className="rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-200 text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
              Por Forma de Pagamento (Válidos)
            </div>
            {summary.methods.length === 0 ? (
              <p className="p-4 text-xs text-zinc-500 text-center">
                Nenhuma venda válida registrada em {dateLabel}.
              </p>
            ) : (
              <ul className="divide-y divide-stone-100 text-sm">
                {summary.methods.map((m) => (
                  <li
                    key={m.label}
                    className="px-4 py-2.5 flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-bold text-zinc-900 text-xs sm:text-sm">
                        {m.label}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {m.count} {m.count === 1 ? "pedido" : "pedidos"} • Pago:
                        R$ {formatMoney(m.paid)}
                      </p>
                    </div>
                    <span className="font-black text-zinc-900 text-sm">
                      R$ {formatMoney(m.total)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Detalhamento */}
          <div className="rounded-2xl bg-[#F8F7F5] border border-stone-200/80 p-4 space-y-1.5 text-xs">
            <div className="flex justify-between text-zinc-600">
              <span>Concluídos ({summary.deliveredCount})</span>
              <span className="font-bold text-zinc-900">
                R$ {formatMoney(summary.deliveredTotal)}
              </span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Em andamento ({summary.activeCount})</span>
              <span className="font-bold text-zinc-900">
                R$ {formatMoney(summary.activeTotal)}
              </span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Subtotal de produtos</span>
              <span className="font-bold text-zinc-900">
                R$ {formatMoney(summary.subtotalTotal)}
              </span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Taxas de entrega arrecadadas</span>
              <span className="font-bold text-zinc-900">
                R$ {formatMoney(summary.deliveryFeeTotal)}
              </span>
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-stone-200 bg-white flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-zinc-700 text-xs font-bold transition cursor-pointer"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 rounded-xl bg-gradient-to-b from-[#CF0606] to-[#A80000] hover:from-[#B00000] hover:to-[#830000] text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Imprimir Fechamento ({paperWidth})
          </button>
        </div>
      </div>
    </div>
  );
}

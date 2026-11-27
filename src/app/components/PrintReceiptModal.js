"use client";

import { useMemo } from "react";
import {
  buildThermalReceiptHtml,
  printThermalReceipt,
} from "@/lib/thermalPrint";

const COPY_OPTIONS = [
  { id: "full", label: "Via Completa (Cliente)" },
  { id: "kitchen", label: "Via Cozinha" },
  { id: "both", label: "Ambas (2 vias)" },
];

export default function PrintReceiptModal({
  order,
  store,
  prefs,
  onChangePrefs,
  onClose,
}) {
  const previewHtml = useMemo(() => {
    if (!order) return "";
    return buildThermalReceiptHtml({
      order,
      store,
      paperWidth: prefs.paperWidth,
      copyMode: prefs.copyMode,
    });
  }, [order, store, prefs.paperWidth, prefs.copyMode]);

  if (!order) return null;

  function handlePrint() {
    printThermalReceipt({
      order,
      store,
      paperWidth: prefs.paperWidth,
      copyMode: prefs.copyMode,
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
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900 tracking-tight">
              Imprimir Comanda — Pedido #{order.id}
            </h2>
            <p className="text-xs text-zinc-500">
              Pré-visualização para impressora térmica ({prefs.paperWidth})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-zinc-700 font-bold text-sm transition cursor-pointer"
            aria-label="Fechar pré-visualização"
          >
            ✕
          </button>
        </div>

        {/* Controles rápidos de papel e via */}
        <div className="px-5 py-3.5 bg-[#F8F7F5] border-b border-stone-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-zinc-600 mr-1">
                Bobina:
              </span>
              {["58mm", "80mm"].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onChangePrefs({ ...prefs, paperWidth: size })}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    prefs.paperWidth === size
                      ? "bg-zinc-900 text-white"
                      : "bg-white text-zinc-700 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {COPY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangePrefs({ ...prefs, copyMode: opt.id })}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    prefs.copyMode === opt.id
                      ? "bg-[#BC0202] text-white"
                      : "bg-white text-zinc-700 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={prefs.autoPrintOnAccept}
              onChange={(e) =>
                onChangePrefs({
                  ...prefs,
                  autoPrintOnAccept: e.target.checked,
                })
              }
              className="w-4 h-4 accent-[#BC0202] rounded cursor-pointer"
            />
            Imprimir automaticamente ao clicar em &quot;Aceitar e Preparar&quot;
          </label>
        </div>

        {/* Pré-visualização simulando o cupom térmico */}
        <div className="flex-1 overflow-y-auto bg-stone-200/70 p-5 flex justify-center">
          <div
            className="bg-white shadow-md border border-stone-300 rounded-sm overflow-hidden transition-all"
            style={{
              width: prefs.paperWidth === "58mm" ? "240px" : "325px",
            }}
          >
            <iframe
              title={`Pré-visualização do Pedido #${order.id}`}
              srcDoc={previewHtml}
              className="w-full border-0 bg-white block"
              style={{
                height: prefs.copyMode === "both" ? "540px" : "420px",
              }}
            />
          </div>
        </div>

        {/* Rodapé */}
        <div className="px-5 py-3.5 border-t border-stone-200 bg-white flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-zinc-500">
            Dica PDV: desative &quot;Cabeçalhos e rodapés&quot; no diálogo de
            impressão do navegador.
          </p>
          <div className="flex items-center gap-2 ml-auto">
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
              Imprimir Agora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

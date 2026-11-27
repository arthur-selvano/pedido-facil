const STORAGE_KEY = "pf_thermal_printer_prefs";

export const DEFAULT_PRINTER_PREFS = {
  paperWidth: "80mm", // "58mm" | "80mm"
  copyMode: "full", // "full" | "kitchen" | "both"
  autoPrintOnAccept: false,
};

export function loadPrinterPrefs() {
  if (typeof window === "undefined") return DEFAULT_PRINTER_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PRINTER_PREFS;
    const parsed = JSON.parse(raw);
    return {
      paperWidth: parsed.paperWidth === "58mm" ? "58mm" : "80mm",
      copyMode: ["full", "kitchen", "both"].includes(parsed.copyMode)
        ? parsed.copyMode
        : "full",
      autoPrintOnAccept: Boolean(parsed.autoPrintOnAccept),
    };
  } catch {
    return DEFAULT_PRINTER_PREFS;
  }
}

export function savePrinterPrefs(prefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignora erro de quota/privacidade do navegador
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(value) {
  return Number(value || 0)
    .toFixed(2)
    .replace(".", ",");
}

function formatDateTime(dateValue) {
  if (!dateValue) return "";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPaymentLabel(method) {
  const map = {
    online: "Online (Mercado Pago)",
    pix: "PIX",
    credit_card: "Cartao de Credito",
    debit_card: "Cartao de Debito",
    card: "Cartao",
    cash: "Dinheiro",
    money: "Dinheiro",
  };
  return map[method] || method || "Nao informado";
}

function formatDeliveryTypeLabel(type) {
  if (type === "delivery") return "ENTREGA";
  if (type === "counter") return "BALCAO / MESA";
  return "RETIRADA NO BALCAO";
}

function formatPaymentStatusLabel(paymentMethod, paymentStatus) {
  if (paymentStatus === "paid") {
    return paymentMethod === "online" ? "PAGO ONLINE" : "PAGO";
  }
  if (paymentMethod === "online" && paymentStatus === "pending") {
    return "AGUARDANDO PAGAMENTO ONLINE";
  }
  if (paymentStatus === "failed") return "PAGAMENTO RECUSADO";
  if (paymentStatus === "refunded") return "REEMBOLSADO";
  return "COBRAR DO CLIENTE";
}

function renderKitchenTicket(order) {
  const deliveryLabel = formatDeliveryTypeLabel(order.delivery_type);
  const createdAt = formatDateTime(order.created_at);
  const items = order.items || [];

  const itemsHtml = items
    .map(
      (item) => `
      <div class="kitchen-item">
        <span class="kitchen-qty">${escapeHtml(item.quantity)}x</span>
        <span class="kitchen-name">${escapeHtml(item.product_name)}</span>
      </div>`,
    )
    .join("");

  const notesHtml = order.notes
    ? `<div class="notes-box kitchen-notes">
        <div class="notes-title">OBSERVACAO:</div>
        <div>${escapeHtml(order.notes)}</div>
      </div>`
    : "";

  return `
    <section class="ticket">
      <div class="center bold badge-dark">VIA COZINHA</div>
      <div class="center order-number">PEDIDO #${escapeHtml(order.id)}</div>
      ${createdAt ? `<div class="center meta">${escapeHtml(createdAt)}</div>` : ""}
      <div class="center type-box">${deliveryLabel}</div>
      <div class="divider"></div>
      <div class="customer-line"><strong>Cliente:</strong> ${escapeHtml(order.customer_name)}</div>
      <div class="divider"></div>
      <div class="section-title">ITENS PARA PREPARO</div>
      <div class="kitchen-items">
        ${itemsHtml}
      </div>
      ${notesHtml}
      <div class="divider"></div>
    </section>
  `;
}

function renderFullTicket(order, store) {
  const isDelivery = order.delivery_type === "delivery";
  const deliveryLabel = formatDeliveryTypeLabel(order.delivery_type);
  const createdAt = formatDateTime(order.created_at);
  const items = order.items || [];
  const storeName = store?.name || "Pedido Facil";
  const storePhone = store?.phone || "";

  const itemsHtml = items
    .map((item) => {
      const qty = Number(item.quantity || 0);
      const unitPrice = Number(item.unit_price || 0);
      const lineTotal = qty * unitPrice;
      const unitHint =
        qty > 1
          ? `<div class="item-unit">${qty} x R$ ${formatMoney(unitPrice)}</div>`
          : "";

      return `
        <div class="item-block">
          <div class="row">
            <span class="item-desc"><strong>${escapeHtml(qty)}x</strong> ${escapeHtml(item.product_name)}</span>
            <span class="item-price">R$ ${formatMoney(lineTotal)}</span>
          </div>
          ${unitHint}
        </div>
      `;
    })
    .join("");

  const addressHtml =
    isDelivery && order.address
      ? `<div class="address-box">
          <div class="bold">ENDERECO DE ENTREGA:</div>
          <div>${escapeHtml(order.address)}</div>
        </div>`
      : "";

  const notesHtml = order.notes
    ? `<div class="notes-box">
        <div class="notes-title">OBSERVACAO:</div>
        <div>${escapeHtml(order.notes)}</div>
      </div>`
    : "";

  const paymentLabel = formatPaymentLabel(order.payment_method);
  const paymentStatusLabel = formatPaymentStatusLabel(
    order.payment_method,
    order.payment_status,
  );

  const changeForNum =
    order.payment_method === "cash" &&
    order.change_for !== null &&
    order.change_for !== undefined
      ? Number(order.change_for)
      : null;
  const changeAmount =
    changeForNum !== null && Number.isFinite(changeForNum)
      ? Math.max(0, changeForNum - Number(order.total || 0))
      : null;

  const changeHtml =
    changeForNum !== null && Number.isFinite(changeForNum)
      ? `<div class="row" style="margin-top:3px;">
          <span>Troco para:</span>
          <span>R$ ${formatMoney(changeForNum)}</span>
        </div>
        <div class="row bold">
          <span>LEVAR TROCO:</span>
          <span>R$ ${formatMoney(changeAmount)}</span>
        </div>`
      : "";

  return `
    <section class="ticket">
      <div class="center store-name">${escapeHtml(storeName)}</div>
      ${storePhone ? `<div class="center meta">Tel: ${escapeHtml(storePhone)}</div>` : ""}
      <div class="divider"></div>
      <div class="center order-number">PEDIDO #${escapeHtml(order.id)}</div>
      ${createdAt ? `<div class="center meta">${escapeHtml(createdAt)}</div>` : ""}
      <div class="center type-box">${deliveryLabel}</div>
      <div class="divider"></div>

      <div class="section-title">CLIENTE</div>
      <div class="bold">${escapeHtml(order.customer_name)}</div>
      ${order.customer_phone ? `<div>Tel: ${escapeHtml(order.customer_phone)}</div>` : ""}
      ${addressHtml}

      <div class="divider"></div>
      <div class="section-title">ITENS</div>
      ${itemsHtml}

      ${notesHtml}

      <div class="divider"></div>
      <div class="row">
        <span>Subtotal</span>
        <span>R$ ${formatMoney(order.subtotal)}</span>
      </div>
      ${
        isDelivery
          ? `<div class="row">
              <span>Taxa de entrega</span>
              <span>R$ ${formatMoney(order.delivery_fee)}</span>
            </div>`
          : ""
      }
      <div class="row total-row">
        <span>TOTAL</span>
        <span>R$ ${formatMoney(order.total)}</span>
      </div>

      <div class="divider"></div>
      <div class="row">
        <span>Pagamento:</span>
        <span class="bold">${escapeHtml(paymentLabel)}</span>
      </div>
      ${changeHtml}
      <div class="center payment-status">${escapeHtml(paymentStatusLabel)}</div>

      <div class="divider"></div>
      <div class="center footer">Obrigado pela preferencia!</div>
      <div class="center footer-sub">Pedido Facil</div>
    </section>
  `;
}

export function buildThermalReceiptHtml({
  order,
  store,
  paperWidth = "80mm",
  copyMode = "full",
}) {
  const is58 = paperWidth === "58mm";
  const pageWidth = is58 ? "58mm" : "80mm";
  const contentWidth = is58 ? "52mm" : "72mm";
  const baseFontSize = is58 ? "11px" : "12px";
  const kitchenFontSize = is58 ? "13px" : "15px";

  let bodyContent = "";
  if (copyMode === "kitchen") {
    bodyContent = renderKitchenTicket(order);
  } else if (copyMode === "both") {
    bodyContent = `
      ${renderKitchenTicket(order)}
      <div class="cut-line">- - - - - - CORTAR AQUI - - - - - -</div>
      ${renderFullTicket(order, store)}
    `;
  } else {
    bodyContent = renderFullTicket(order, store);
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Comanda #${escapeHtml(order.id)}</title>
  <style>
    @page {
      size: ${pageWidth} auto;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: ${pageWidth};
      background: #ffffff;
      color: #000000;
      font-family: "Courier New", Courier, "Liberation Mono", monospace;
      font-size: ${baseFontSize};
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .wrapper {
      width: ${contentWidth};
      margin: 0 auto;
      padding: 3mm 0 6mm 0;
    }
    .ticket {
      width: 100%;
    }
    .center {
      text-align: center;
    }
    .bold {
      font-weight: 700;
    }
    .store-name {
      font-size: ${is58 ? "14px" : "16px"};
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .order-number {
      font-size: ${is58 ? "16px" : "19px"};
      font-weight: 800;
      margin-top: 2px;
    }
    .meta {
      font-size: ${is58 ? "10px" : "11px"};
      margin-top: 2px;
    }
    .type-box {
      margin-top: 5px;
      padding: 3px 4px;
      border: 1.5px solid #000;
      font-weight: 800;
      font-size: ${is58 ? "11px" : "13px"};
      letter-spacing: 0.4px;
    }
    .badge-dark {
      background: #000;
      color: #fff;
      padding: 3px 6px;
      font-size: ${is58 ? "11px" : "12px"};
      letter-spacing: 0.8px;
      margin-bottom: 4px;
    }
    .divider {
      border-top: 1px dashed #000;
      margin: 6px 0;
    }
    .section-title {
      font-size: ${is58 ? "10px" : "11px"};
      font-weight: 800;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 6px;
    }
    .item-block {
      margin-bottom: 4px;
    }
    .item-desc {
      flex: 1;
      word-break: break-word;
    }
    .item-price {
      white-space: nowrap;
      font-weight: 700;
    }
    .item-unit {
      font-size: ${is58 ? "10px" : "11px"};
      padding-left: 10px;
    }
    .address-box {
      margin-top: 5px;
      padding: 4px;
      border: 1px solid #000;
      word-break: break-word;
    }
    .notes-box {
      margin-top: 6px;
      padding: 5px;
      border: 1.5px solid #000;
      word-break: break-word;
    }
    .notes-title {
      font-weight: 800;
      margin-bottom: 2px;
    }
    .kitchen-items {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .kitchen-item {
      font-size: ${kitchenFontSize};
      font-weight: 800;
      line-height: 1.25;
      word-break: break-word;
    }
    .kitchen-qty {
      display: inline-block;
      min-width: 28px;
    }
    .kitchen-notes {
      font-size: ${is58 ? "12px" : "13px"};
      font-weight: 700;
    }
    .customer-line {
      font-size: ${is58 ? "11px" : "12px"};
    }
    .total-row {
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px solid #000;
      font-size: ${is58 ? "14px" : "16px"};
      font-weight: 800;
    }
    .payment-status {
      margin-top: 4px;
      padding: 2px 4px;
      border: 1px solid #000;
      font-weight: 800;
      font-size: ${is58 ? "10px" : "11px"};
    }
    .cut-line {
      text-align: center;
      font-size: 10px;
      margin: 10mm 0;
      letter-spacing: 0.5px;
    }
    .footer {
      font-weight: 700;
      margin-top: 2px;
    }
    .footer-sub {
      font-size: 10px;
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    ${bodyContent}
  </div>
</body>
</html>`;
}

function triggerIframePrint(html) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";

  document.body.appendChild(iframe);

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 1000);
  };

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc || !iframe.contentWindow) {
    cleanup();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      console.error("Erro ao acionar impressão térmica:", err);
    } finally {
      cleanup();
    }
  };

  // Aguarda um frame para garantir layout renderizado antes de abrir o diálogo de impressão
  setTimeout(triggerPrint, 120);
}

export function printThermalReceipt({
  order,
  store,
  paperWidth = "80mm",
  copyMode = "full",
}) {
  const html = buildThermalReceiptHtml({ order, store, paperWidth, copyMode });
  triggerIframePrint(html);
}

function getLocalDateKey(dateValue) {
  if (!dateValue) return "";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function summarizeCashClosing(orders, dateKey) {
  const dayOrders = (orders || []).filter(
    (order) => getLocalDateKey(order.created_at) === dateKey,
  );

  const validOrders = dayOrders.filter((o) => o.status !== "canceled");
  const deliveredOrders = dayOrders.filter((o) => o.status === "delivered");
  const activeOrders = dayOrders.filter((o) =>
    ["pending", "preparing", "out_for_delivery"].includes(o.status),
  );
  const canceledOrders = dayOrders.filter((o) => o.status === "canceled");

  const methodBuckets = {
    online: { label: "Online (Mercado Pago)", count: 0, total: 0, paid: 0 },
    pix: { label: "PIX", count: 0, total: 0, paid: 0 },
    card: { label: "Cartão (Crédito/Débito)", count: 0, total: 0, paid: 0 },
    cash: { label: "Dinheiro", count: 0, total: 0, paid: 0 },
    other: { label: "Outros", count: 0, total: 0, paid: 0 },
  };

  let subtotalTotal = 0;
  let deliveryFeeTotal = 0;
  let grandTotal = 0;
  let paidTotal = 0;

  for (const order of validOrders) {
    const orderTotal = Number(order.total || 0);
    subtotalTotal += Number(order.subtotal || 0);
    deliveryFeeTotal += Number(order.delivery_fee || 0);
    grandTotal += orderTotal;

    const isPaid = order.payment_status === "paid";
    if (isPaid) paidTotal += orderTotal;

    let key = "other";
    if (order.payment_method === "online") key = "online";
    else if (order.payment_method === "pix") key = "pix";
    else if (
      ["card", "credit_card", "debit_card"].includes(order.payment_method)
    ) {
      key = "card";
    } else if (["cash", "money"].includes(order.payment_method)) {
      key = "cash";
    }

    methodBuckets[key].count += 1;
    methodBuckets[key].total += orderTotal;
    if (isPaid) methodBuckets[key].paid += orderTotal;
  }

  const deliveredTotal = deliveredOrders.reduce(
    (acc, o) => acc + Number(o.total || 0),
    0,
  );
  const activeTotal = activeOrders.reduce(
    (acc, o) => acc + Number(o.total || 0),
    0,
  );
  const canceledTotal = canceledOrders.reduce(
    (acc, o) => acc + Number(o.total || 0),
    0,
  );
  const averageTicket =
    validOrders.length > 0 ? grandTotal / validOrders.length : 0;

  return {
    totalOrders: dayOrders.length,
    validCount: validOrders.length,
    deliveredCount: deliveredOrders.length,
    deliveredTotal,
    activeCount: activeOrders.length,
    activeTotal,
    canceledCount: canceledOrders.length,
    canceledTotal,
    subtotalTotal,
    deliveryFeeTotal,
    grandTotal,
    paidTotal,
    unpaidTotal: Math.max(0, grandTotal - paidTotal),
    averageTicket,
    methods: Object.values(methodBuckets).filter((b) => b.count > 0),
  };
}

export function buildCashClosingHtml({
  summary,
  store,
  dateLabel,
  paperWidth = "80mm",
}) {
  const is58 = paperWidth === "58mm";
  const pageWidth = is58 ? "58mm" : "80mm";
  const contentWidth = is58 ? "52mm" : "72mm";
  const baseFontSize = is58 ? "11px" : "12px";
  const storeName = store?.name || "Pedido Facil";
  const printedAt = formatDateTime(new Date());

  const methodsHtml =
    summary.methods.length > 0
      ? summary.methods
          .map(
            (m) => `
          <div class="row" style="margin-bottom:3px;">
            <span>${escapeHtml(m.label)} (${m.count})</span>
            <span class="bold">R$ ${formatMoney(m.total)}</span>
          </div>`,
          )
          .join("")
      : `<div class="center meta">Nenhuma venda registrada.</div>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Fechamento de Caixa - ${escapeHtml(dateLabel)}</title>
  <style>
    @page { size: ${pageWidth} auto; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${pageWidth};
      background: #fff;
      color: #000;
      font-family: "Courier New", Courier, "Liberation Mono", monospace;
      font-size: ${baseFontSize};
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .wrapper { width: ${contentWidth}; margin: 0 auto; padding: 3mm 0 6mm 0; }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .store-name { font-size: ${is58 ? "14px" : "16px"}; font-weight: 800; text-transform: uppercase; }
    .title-box { margin-top: 4px; padding: 3px 4px; border: 1.5px solid #000; font-weight: 800; font-size: ${is58 ? "12px" : "13px"}; }
    .meta { font-size: ${is58 ? "10px" : "11px"}; margin-top: 2px; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .section-title { font-size: ${is58 ? "10px" : "11px"}; font-weight: 800; margin-bottom: 4px; }
    .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 6px; }
    .total-row { margin-top: 4px; padding-top: 4px; border-top: 1px solid #000; font-size: ${is58 ? "14px" : "16px"}; font-weight: 800; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="center store-name">${escapeHtml(storeName)}</div>
    <div class="center title-box">FECHAMENTO DE CAIXA</div>
    <div class="center meta">Referencia: ${escapeHtml(dateLabel)}</div>
    <div class="center meta">Emitido: ${escapeHtml(printedAt)}</div>
    <div class="divider"></div>

    <div class="section-title">RESUMO DE PEDIDOS</div>
    <div class="row"><span>Concluidos (${summary.deliveredCount})</span><span>R$ ${formatMoney(summary.deliveredTotal)}</span></div>
    <div class="row"><span>Em andamento (${summary.activeCount})</span><span>R$ ${formatMoney(summary.activeTotal)}</span></div>
    <div class="row"><span>Cancelados (${summary.canceledCount})</span><span>R$ ${formatMoney(summary.canceledTotal)}</span></div>
    <div class="row"><span>Ticket medio</span><span>R$ ${formatMoney(summary.averageTicket)}</span></div>

    <div class="divider"></div>
    <div class="section-title">POR FORMA DE PAGAMENTO</div>
    ${methodsHtml}

    <div class="divider"></div>
    <div class="section-title">CONSOLIDADO (VALIDOS)</div>
    <div class="row"><span>Subtotal produtos</span><span>R$ ${formatMoney(summary.subtotalTotal)}</span></div>
    <div class="row"><span>Taxas de entrega</span><span>R$ ${formatMoney(summary.deliveryFeeTotal)}</span></div>
    <div class="row"><span>Ja recebidos (Pago)</span><span>R$ ${formatMoney(summary.paidTotal)}</span></div>
    <div class="row"><span>A receber / Pendente</span><span>R$ ${formatMoney(summary.unpaidTotal)}</span></div>
    <div class="row total-row"><span>TOTAL DO DIA</span><span>R$ ${formatMoney(summary.grandTotal)}</span></div>

    <div class="divider"></div>
    <div class="center meta">Pedido Facil — PDV</div>
  </div>
</body>
</html>`;
}

export function printCashClosing({
  summary,
  store,
  dateLabel,
  paperWidth = "80mm",
}) {
  const html = buildCashClosingHtml({ summary, store, dateLabel, paperWidth });
  triggerIframePrint(html);
}

// server/services/notificationService.js
//
// Notifications here are computed LIVE from current data every time this
// is called — nothing is persisted, there's no read/unread state. This
// reuses StockService and ReportService instead of re-querying raw
// collections, same pattern as dashboardService.

const StockService = require("./stockService");
const ReportService = require("./reportService");

// Keep each category capped so the bell dropdown stays usable even with
// a large factory (hundreds of products/clients/workers).
const MAX_PER_CATEGORY = 5;

const getNotifications = async () => {
  const [lowStockProducts, outstandingClients, outstandingLabour] = await Promise.all([
    StockService.getLowStockProducts(),
    ReportService.getClientOutstandingBalanceReport({ minBalance: 1 }),
    ReportService.getLabourOutstandingBalanceReport({}),
  ]);

  const notifications = [];

  // --- Low stock alerts ---
  lowStockProducts.slice(0, MAX_PER_CATEGORY).forEach((product) => {
    notifications.push({
      id: `low-stock-${product.productId}`,
      type: "low_stock",
      severity: product.currentStock <= (product.minimumStock || 0) / 2 ? "critical" : "warning",
      title: "Low Stock",
      message: `${product.productName} is running low (${product.currentStock} left, minimum ${product.minimumStock})`,
      link: "/stock",
      relatedId: product.productId,
    });
  });

  // --- Client outstanding balances (already sorted desc by ReportService) ---
  outstandingClients.slice(0, MAX_PER_CATEGORY).forEach((client) => {
    notifications.push({
      id: `client-balance-${client._id}`,
      type: "client_balance",
      severity: "info",
      title: "Client Payment Pending",
      message: `${client.clientName} owes Rs. ${Number(client.outstandingBalance).toLocaleString()}`,
      // link: `/clients/${client._id}`,
      // link: `/client-profile/${client._id}`,
      link: "/clients",
      relatedId: client._id,
    });
  });

  // --- Labour outstanding balances ---
  outstandingLabour
    .filter((worker) => worker.remainingBalance > 0)
    .sort((a, b) => b.remainingBalance - a.remainingBalance)
    .slice(0, MAX_PER_CATEGORY)
    .forEach((worker) => {
      notifications.push({
        id: `labour-balance-${worker.workerId}`,
        type: "labour_balance",
        severity: "info",
        title: "Labour Payment Due",
        message: `${worker.name} is owed Rs. ${Number(worker.remainingBalance).toLocaleString()}`,
        link: "/labour",
        relatedId: worker.workerId,
      });
    });

  return {
    count: notifications.length,
    hasCritical: notifications.some((n) => n.severity === "critical"),
    notifications,
  };
};

module.exports = { getNotifications };
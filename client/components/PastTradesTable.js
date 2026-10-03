import { Text } from "@mantine/core";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function formatQuantity(value) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function displayName(trade) {
  if (trade?.name) return trade.name;
  const symbol = String(trade?.symbol || "");
  return symbol.includes(".") ? symbol.split(".")[0] : symbol || "—";
}

export default function PastTradesTable({ pastTrades = [] }) {
  const trades = Array.isArray(pastTrades) ? pastTrades : [];

  if (trades.length === 0) {
    return (
      <div className="pt-past-empty">
        <Text color="dimmed" size="sm" align="center">
          No closed trades yet — sells will appear here.
        </Text>
      </div>
    );
  }

  return (
    <div className="pt-holdings-scroll">
      <table className="pt-holdings-table">
        <thead>
          <tr>
            <th>Stock</th>
            <th>Qty</th>
            <th>Purchase</th>
            <th>Sell</th>
            <th>P&amp;L</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => {
            const qty = Number(trade.quantity) || 0;
            const buy = Number(trade.purchasePrice) || 0;
            const sell = Number(trade.sellPrice) || 0;
            const pnl = (sell - buy) * qty;
            const pnlPct = buy > 0 ? ((sell - buy) / buy) * 100 : 0;
            const positive = pnl >= 0;

            return (
              <tr key={trade._id || `${trade.symbol}-${trade.soldAt}`} className="pt-holdings-row">
                <td>
                  <div className="pt-holdings-name">{displayName(trade)}</div>
                </td>
                <td>{formatQuantity(qty)}</td>
                <td>{formatCurrency(buy)}</td>
                <td>{formatCurrency(sell)}</td>
                <td>
                  <div className="pt-holdings-stack">
                    <span
                      className={
                        positive ? "pt-holdings-pos" : "pt-holdings-neg"
                      }
                    >
                      {positive ? "+" : ""}
                      {pnlPct.toFixed(2)}%
                    </span>
                    <span
                      className={`pt-holdings-sub ${
                        positive ? "pt-holdings-pos" : "pt-holdings-neg"
                      }`}
                    >
                      {formatCurrency(pnl)}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

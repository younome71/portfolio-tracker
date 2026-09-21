import {
  Card,
  Text,
  Group,
  Select,
  Divider,
  Skeleton,
  Paper,
  Box,
  Container,
} from "@mantine/core";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useEffect, useState } from "react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function PerformanceChart({ portfolio }) {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    if (!portfolio?.assets?.length) return;

    const transactions = Array.isArray(portfolio.transactions)
      ? [...portfolio.transactions].sort(
          (a, b) => new Date(a.date) - new Date(b.date)
        )
      : [];

    const allDatesSet = new Set();
    const priceMapBySymbol = {};

    // Step 1: Collect all dates and map price history per symbol
    portfolio.assets.forEach((asset) => {
      const symbol = asset.symbol;
      if (!priceMapBySymbol[symbol]) priceMapBySymbol[symbol] = {};
      (asset.priceHistory || []).forEach(({ date, price }) => {
        const dateKey = new Date(date).toISOString().split("T")[0];
        priceMapBySymbol[symbol][dateKey] = price;
        allDatesSet.add(dateKey);
      });
    });

    // Transaction dates matter too: value/invested can change on those days
    transactions.forEach((t) => {
      if (t?.date) allDatesSet.add(new Date(t.date).toISOString().split("T")[0]);
    });

    // Step 2: Sort all unique dates
    const allDates = Array.from(allDatesSet).sort(
      (a, b) => new Date(a) - new Date(b)
    );
    if (!allDates.length) return;

    const carriedPrice = (symbol, date) => {
      const priceMap = priceMapBySymbol[symbol];
      if (!priceMap) return null;
      let last = null;
      for (const d of Object.keys(priceMap)) {
        if (new Date(d) <= new Date(date) && (!last || new Date(d) > new Date(last))) {
          last = d;
        }
      }
      return last ? priceMap[last] : null;
    };

    const labels = [];
    const values = [];
    const investedSeries = [];

    if (transactions.length > 0) {
      // Ledger mode: replay transactions so deposits/withdrawals move the
      // "Net Invested" line instead of looking like gains/losses.
      let txnIndex = 0;
      const qtyBySymbol = {};
      let netInvested = 0;

      allDates.forEach((date) => {
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        while (
          txnIndex < transactions.length &&
          new Date(transactions[txnIndex].date) <= dayEnd
        ) {
          const t = transactions[txnIndex];
          const signedQty = t.type === "SELL" ? -t.quantity : t.quantity;
          const signedAmount = t.type === "SELL" ? -1 : 1;
          qtyBySymbol[t.symbol] = (qtyBySymbol[t.symbol] || 0) + signedQty;
          netInvested += signedAmount * t.quantity * t.price;
          txnIndex += 1;
        }

        let totalValue = 0;
        Object.entries(qtyBySymbol).forEach(([symbol, qty]) => {
          if (qty <= 0) return;
          const price = carriedPrice(symbol, date);
          if (price) totalValue += qty * price;
        });

        labels.push(date);
        values.push(totalValue);
        investedSeries.push(netInvested);
      });
    } else {
      // Legacy mode (no ledger): value of current holdings over time
      const assetHistories = portfolio.assets.map((asset) => ({
        quantity: asset.quantity,
        priceMap: priceMapBySymbol[asset.symbol] || {},
      }));

      allDates.forEach((date) => {
        let totalValue = 0;
        assetHistories.forEach(({ quantity, priceMap }) => {
          const availableDates = Object.keys(priceMap).filter(
            (d) => new Date(d) <= new Date(date)
          );
          if (availableDates.length > 0) {
            const lastKnownDate = availableDates.sort(
              (a, b) => new Date(b) - new Date(a)
            )[0];
            totalValue += quantity * priceMap[lastKnownDate];
          }
        });
        labels.push(date);
        values.push(totalValue);
      });
    }

    const datasets = [
      {
        label: "Portfolio Value",
        data: values,
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.3)",
        tension: 0.3,
        fill: investedSeries.length === 0,
        pointRadius: 2,
      },
    ];

    if (investedSeries.length > 0) {
      datasets.push({
        label: "Net Invested",
        data: investedSeries,
        borderColor: "rgb(148, 163, 184)",
        backgroundColor: "transparent",
        borderDash: [6, 4],
        tension: 0,
        fill: false,
        pointRadius: 0,
        stepped: true,
      });
    }

    setChartData({ labels, datasets });
  }, [portfolio]);

  return (
    <Container size="lg" px="xs">
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group position="apart" mb="sm">
          <Text size="lg" weight={600}>
            📈 Performance Overview
          </Text>
          <Select
            data={["All Time", "Last 30 Days", "Last 7 Days"]}
            defaultValue="All Time"
            size="xs"
            w={140}
            disabled
          />
        </Group>

        <Divider my="sm" />

        <Paper withBorder radius="md" p="xs" style={{ height: 360 }}>
          {!portfolio?.assets?.length ? (
            <Box p="md">
              <Text color="dimmed" align="center" mt="xl" size="md">
                Add an asset to this portfolio
              </Text>
            </Box>
          ) : !chartData ? (
            <Box p="md">
              <Skeleton height={300} radius="md" />
              <Text color="dimmed" align="center" mt="md">
                Loading chart data...
              </Text>
            </Box>
          ) : (
            <Line
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "top",
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => `₹${context.raw.toFixed(2)}`,
                    },
                  },
                },
                scales: {
                  y: {
                    ticks: {
                      callback: (value) => `₹${value}`,
                    },
                  },
                },
              }}
            />
          )}
        </Paper>
      </Card>
    </Container>
  );
}

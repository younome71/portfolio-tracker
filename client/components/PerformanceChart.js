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

    const allDatesSet = new Set();
    const assetHistories = [];

    // Step 1: Collect all dates and map price history per asset
    portfolio.assets.forEach((asset) => {
      const priceMap = {};
      asset.priceHistory.forEach(({ date, price }) => {
        const dateKey = new Date(date).toISOString().split("T")[0];
        priceMap[dateKey] = price;
        allDatesSet.add(dateKey);
      });
      assetHistories.push({ quantity: asset.quantity, priceMap });
    });

    // Step 2: Sort all unique dates
    const allDates = Array.from(allDatesSet).sort(
      (a, b) => new Date(a) - new Date(b)
    );

    // Step 3: Carry forward prices and calculate portfolio value
    const dateValueMap = {};
    allDates.forEach((date) => {
      let totalValue = 0;
      assetHistories.forEach(({ quantity, priceMap }) => {
        // Find last known price up to this date
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
      dateValueMap[date] = totalValue;
    });

    // Step 4: Set chart data
    const labels = Object.keys(dateValueMap);
    const values = labels.map((d) => dateValueMap[d]);

    setChartData({
      labels,
      datasets: [
        {
          label: "Portfolio Value",
          data: values,
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.3)",
          tension: 0.3,
          fill: true,
          pointRadius: 2,
        },
      ],
    });
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

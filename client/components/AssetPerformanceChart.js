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
  Alert,
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
import { IconAlertCircle } from "@tabler/icons-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Enhanced date parser that handles more formats
const safeParseDate = (dateString) => {
  if (!dateString) return null;

  // Try multiple date formats
  const formats = [
    new Date(dateString), // ISO format
    new Date(Number(dateString)), // Timestamp
    new Date(dateString.replace(/(\d{2})-(\d{2})-(\d{4})/, "$2/$1/$3")), // DD-MM-YYYY
  ];

  for (const date of formats) {
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
};

// Function to extract the base symbol (part before the dot)
const getBaseSymbol = (symbol) => {
  if (!symbol) return "";
  return symbol.split(".")[0];
};

export default function AssetPerformanceChart({ portfolio, assetSymbol }) {
  const [chartData, setChartData] = useState(null);
  const [error, setError] = useState(null);
  const displaySymbol = getBaseSymbol(assetSymbol);

  useEffect(() => {
    if (!portfolio?.assets?.length || !assetSymbol) return;

    try {
      const matchingAssets = portfolio.assets.filter(
        (asset) => asset.symbol === assetSymbol
      );

      if (!matchingAssets.length) {
        setChartData(null);
        return;
      }

      const allDatesSet = new Set();
      const assetData = [];

      for (const asset of matchingAssets) {
        const purchaseDate = safeParseDate(asset.priceHistory?.[0]?.date);

        console.log("Asset:", asset);
        console.log(
          "Raw purchaseDate:",
          asset.purchaseDate,
          "Fallback createdAt:",
          asset.createdAt
        );

        if (!purchaseDate) {
          console.warn(
            `Skipping asset ${asset.symbol} - invalid purchase date`
          );
          continue;
        }

        const priceMap = {};
        let hasValidPrices = false;

        for (const { date, price } of asset.priceHistory) {
          const priceDate = safeParseDate(date);
          if (!priceDate) {
            console.warn(
              `Skipping price entry for ${asset.symbol} - invalid date`
            );
            continue;
          }

          const dateKey = priceDate.toISOString().split("T")[0];
          priceMap[dateKey] = price;
          allDatesSet.add(dateKey);
          hasValidPrices = true;
        }

        if (hasValidPrices) {
          assetData.push({
            purchaseDate: purchaseDate.toISOString().split("T")[0],
            quantity: asset.quantity,
            priceMap,
          });
        }
      }

      if (assetData.length === 0) {
        throw new Error(`No valid date data found for ${assetSymbol}`);
      }

      const allDates = Array.from(allDatesSet).sort(
        (a, b) => new Date(a) - new Date(b)
      );

      const dateValueMap = {};
      allDates.forEach((date) => {
        let totalValue = 0;
        assetData.forEach(({ quantity, priceMap }) => {
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

      const labels = Object.keys(dateValueMap);
      const values = labels.map((d) => dateValueMap[d]);

      setChartData({
        labels,
        datasets: [
          {
            label: `${displaySymbol} Value`,
            data: values,
            borderColor: "rgb(59, 130, 246)",
            backgroundColor: "rgba(59, 130, 246, 0.3)",
            tension: 0.3,
            fill: true,
            pointRadius: 2,
          },
        ],
      });
      setError(null);
    } catch (err) {
      console.error("Error processing asset data:", err);
      setError(err.message);
      setChartData(null);
    }
  }, [portfolio, assetSymbol, displaySymbol]);

  if (error) {
    return (
      <Alert
        icon={<IconAlertCircle size={16} />}
        title="Error"
        color="red"
        mb="md"
      >
        {error}
        <Text size="sm" mt="sm">
          Please check that all assets have valid date formats (YYYY-MM-DD
          recommended).
        </Text>
      </Alert>
    );
  }

  return (
    <Container size="lg" px="xs">
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group position="apart" mb="sm">
          <Text size="lg" weight={600}>
            📈 {displaySymbol} Performance
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
                No assets found in portfolio
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

import {
  Card,
  Group,
  Text,
  Badge,
  Button,
  Stack,
  Title,
  rem,
  Progress,
  Tooltip,
} from "@mantine/core";
import { useRouter } from "next/router";
import {
  IconPlus,
  IconArrowUpRight,
  IconArrowDownRight,
} from "@tabler/icons-react";

export default function IndividualPortfolioSummary({ title, portfolios, isFamily }) {
  const router = useRouter();

  const calculateTotalValue = (portfolio) => {
    return portfolio.assets.reduce((total, asset) => {
      return total + asset.quantity * asset.currentPrice;
    }, 0);
  };

  const calculateDayChange = (portfolio) => {
    if (portfolio.assets.length === 0) return 0;

    const totalValue = calculateTotalValue(portfolio);
    let weightedChange = 0;

    portfolio.assets.forEach((asset) => {
      if (asset.priceHistory.length >= 2) {
        const yesterdayPrice =
          asset.priceHistory[asset.priceHistory.length - 2].price;
        const assetChange =
          ((asset.currentPrice - yesterdayPrice) / yesterdayPrice) * 100;
        const assetWeight = (asset.quantity * asset.currentPrice) / totalValue;
        weightedChange += assetChange * assetWeight;
      }
    });

    return weightedChange;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const groupAssetsBySymbol = (assets) => {
    const grouped = {};

    for (const asset of assets) {
      const baseSymbol = asset.symbol.split(".")[0];
      const value = asset.quantity * asset.currentPrice;

      if (!grouped[baseSymbol]) {
        grouped[baseSymbol] = {
          symbol: baseSymbol,
          value,
        };
      } else {
        grouped[baseSymbol].value += value;
      }
    }

    return Object.values(grouped).sort((a, b) => b.value - a.value);
  };

  return (
    <Card withBorder radius="md" p="lg" shadow="sm">
      <Group position="apart" mb="md">
        <Title order={2} weight={600}>
          {title}
        </Title>
      </Group>

      {portfolios.length === 0 ? (
        <Text color="dimmed" align="center" py="lg">
          No portfolios found. Create your first portfolio to get started.
        </Text>
      ) : (
        <Stack spacing="sm">
          {portfolios.map((portfolio) => {
            const totalValue = calculateTotalValue(portfolio);
            const dayChange = calculateDayChange(portfolio);
            const isPositive = dayChange >= 0;

            return (
              <Card
                key={portfolio._id}
                withBorder
                radius="md"
                p="md"
                component="a"
                onClick={() => router.push(`/portfolio/${portfolio._id}`)}
                sx={(theme) => ({
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor:
                      theme.colorScheme === "dark"
                        ? theme.colors.dark[6]
                        : theme.colors.gray[0],
                  },
                })}
              >
                <Group position="apart">
                  <Text weight={600} size="lg">
                    {portfolio.name}
                  </Text>
                  <Text weight={700} size="xl">
                    {formatCurrency(totalValue)}
                  </Text>
                </Group>

                <Group position="apart" mt="xs">
                  <Badge
                    variant="light"
                    color={isPositive ? "teal" : "red"}
                    leftSection={
                      isPositive ? (
                        <IconArrowUpRight size={rem(14)} />
                      ) : (
                        <IconArrowDownRight size={rem(14)} />
                      )
                    }
                  >
                    {dayChange.toFixed(2)}% today
                  </Badge>

                  <Text size="sm" color="dimmed">
                    {groupAssetsBySymbol(portfolio.assets).length}{" "}
                    {groupAssetsBySymbol(portfolio.assets).length === 1
                      ? "asset"
                      : "assets"}
                  </Text>
                </Group>

                {portfolio.assets.length > 0 && (
                  <Progress
                    sections={groupAssetsBySymbol(portfolio.assets).map(
                      (groupedAsset) => ({
                        value: (groupedAsset.value / totalValue) * 100,
                        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
                        tooltip: `${groupedAsset.symbol}: ${(
                          (groupedAsset.value / totalValue) *
                          100
                        ).toFixed(1)}%`,
                      })
                    )}
                    size="sm"
                    mt="md"
                  />
                )}
              </Card>
            );
          })}
        </Stack>
      )}
    </Card>
  );
}

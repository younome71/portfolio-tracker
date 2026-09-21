import { Card, Group, Text, Badge, Stack, Title, rem } from '@mantine/core';
import { useRouter } from 'next/router';
import { IconArrowUpRight, IconArrowDownRight } from '@tabler/icons-react';
import dynamic from 'next/dynamic';
import {
  calculateTotalValue,
  calculateDayChange,
  calculateNetInvested,
  calculateOverallPnl,
  calculateRealizedPnl,
  calculateXirr,
  getTransactions,
  formatCurrency,
  groupAssetsBySymbol,
  allocColorByIndex,
  isPriceAvailable,
  formatLastUpdated,
} from '../utils/portfolioMath';

const ClientProgressChart = dynamic(() => import('./ClientProgressChart'), {
  ssr: false,
});

export default function IndividualPortfolioSummary({
  title,
  portfolios,
  isFamily,
}) {
  const router = useRouter();

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
            const assets = portfolio.assets || [];
            const totalValue = calculateTotalValue(portfolio);
            const dayChange =
              typeof portfolio.dayChange === 'number'
                ? portfolio.dayChange
                : calculateDayChange(portfolio);
            const isPositive = dayChange >= 0;
            const grouped = groupAssetsBySymbol(assets);
            const netInvested = calculateNetInvested(portfolio);
            const overallPnl = calculateOverallPnl(portfolio);
            const overallPnlPct =
              netInvested > 0 ? (overallPnl / netInvested) * 100 : 0;
            const isOverallProfit = overallPnl >= 0;
            const hasLedger = getTransactions(portfolio).length > 0;
            const realizedPnl = hasLedger ? calculateRealizedPnl(portfolio) : 0;
            const xirr = hasLedger ? calculateXirr(portfolio) : null;
            const unavailableCount = assets.filter((a) => !isPriceAvailable(a)).length;
            const lastUpdated = assets
              .map((a) => a.lastUpdated)
              .filter(Boolean)
              .sort((a, b) => new Date(b) - new Date(a))[0];

            return (
              <Card
                key={portfolio._id}
                withBorder
                radius="md"
                p="md"
                component="button"
                type="button"
                onClick={() => router.push(`/portfolio/${portfolio._id}`)}
                sx={(theme) => ({
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  '&:hover': {
                    backgroundColor:
                      theme.colorScheme === 'dark'
                        ? theme.colors.dark[6]
                        : theme.colors.gray[0],
                  },
                })}
              >
                <Group position="apart">
                  <Text weight={600} size="lg">
                    {portfolio.name || portfolio.portfolio}
                  </Text>
                  <Text weight={700} size="xl">
                    {formatCurrency(totalValue)}
                  </Text>
                </Group>

                <Group position="apart" mt="xs">
                  <Badge
                    variant="light"
                    color={isPositive ? 'teal' : 'red'}
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
                    {grouped.length} {grouped.length === 1 ? 'asset' : 'assets'}
                  </Text>
                </Group>

                <Group position="apart" mt="xs">
                  <Text size="sm" color="dimmed">
                    Invested {formatCurrency(netInvested)}
                  </Text>
                  <Text
                    size="sm"
                    weight={600}
                    color={isOverallProfit ? 'teal' : 'red'}
                  >
                    {isOverallProfit ? '+' : ''}
                    {formatCurrency(overallPnl)} ({overallPnlPct.toFixed(2)}%)
                  </Text>
                </Group>

                {hasLedger && (
                  <Group spacing="xs" mt={4} noWrap>
                    <Text size="xs" color="dimmed">
                      Realized {formatCurrency(realizedPnl)}
                    </Text>
                    <Text size="xs" color="dimmed">
                      ·
                    </Text>
                    <Text size="xs" color="dimmed">
                      Unrealized {formatCurrency(overallPnl - realizedPnl)}
                    </Text>
                    {xirr !== null && Number.isFinite(xirr) && (
                      <Badge
                        size="sm"
                        variant="outline"
                        color={xirr >= 0 ? 'teal' : 'red'}
                        ml="auto"
                      >
                        XIRR {(xirr * 100).toFixed(2)}%
                      </Badge>
                    )}
                  </Group>
                )}

                {unavailableCount > 0 && (
                  <Text size="xs" color="orange" mt="xs">
                    {unavailableCount} asset
                    {unavailableCount === 1 ? '' : 's'} missing live price
                    {formatLastUpdated(lastUpdated)
                      ? ` — ${formatLastUpdated(lastUpdated)}`
                      : ''}
                  </Text>
                )}

                {grouped.length > 0 && totalValue > 0 && (
                  <ClientProgressChart
                    sections={grouped.map((groupedAsset, index) => ({
                      value: (groupedAsset.value / totalValue) * 100,
                      color: allocColorByIndex(index),
                      tooltip: `${groupedAsset.symbol.split('.')[0]}: ${(
                        (groupedAsset.value / totalValue) *
                        100
                      ).toFixed(1)}%`,
                    }))}
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

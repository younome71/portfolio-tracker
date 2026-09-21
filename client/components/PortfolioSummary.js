import {
  Card,
  Group,
  Text,
  Badge,
  Button,
  Stack,
  Title,
  rem,
} from '@mantine/core';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  IconPlus,
  IconArrowUpRight,
  IconArrowDownRight,
} from '@tabler/icons-react';
import {
  calculateTotalValue,
  calculateDayChange,
  calculateNetInvested,
  calculateOverallPnl,
  formatCurrency,
  groupAssetsBySymbol,
  allocColorByIndex,
} from '../utils/portfolioMath';
import ClientProgressChart from './ClientProgressChart';

export default function PortfolioSummary({ title, portfolios, isFamily }) {
  const router = useRouter();

  return (
    <Card withBorder radius="md" p="lg" shadow="sm">
      <Group position="apart" mb="md">
        <Title order={2} weight={600}>
          {title}
        </Title>
        <Button
          component={Link}
          href={`/portfolio/new?isFamily=${isFamily}`}
          leftIcon={<IconPlus size={rem(16)} />}
          variant="light"
          radius="md"
        >
          Add New
        </Button>
      </Group>

      {portfolios.length === 0 ? (
        <Text color="dimmed" align="center" py="lg">
          No portfolios yet. Create your first portfolio to get started.
        </Text>
      ) : (
        <Stack spacing="sm">
          {portfolios.map((portfolio) => {
            const totalValue = calculateTotalValue(portfolio);
            const dayChange = calculateDayChange(portfolio);
            const isPositive = dayChange >= 0;
            const netInvested = calculateNetInvested(portfolio);
            const overallPnl = calculateOverallPnl(portfolio);
            const overallPnlPct =
              netInvested > 0 ? (overallPnl / netInvested) * 100 : 0;
            const isOverallProfit = overallPnl >= 0;
            const grouped = groupAssetsBySymbol(portfolio.assets || []);

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
                    {portfolio.name}
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

                  <Badge
                    variant="light"
                    color={isOverallProfit ? 'teal' : 'red'}
                    leftSection={
                      isOverallProfit ? (
                        <IconArrowUpRight size={rem(14)} />
                      ) : (
                        <IconArrowDownRight size={rem(14)} />
                      )
                    }
                  >
                    {overallPnlPct.toFixed(2)}% overall
                  </Badge>

                  <Text size="sm" color="dimmed">
                    {grouped.length} {grouped.length === 1 ? 'asset' : 'assets'}
                  </Text>
                </Group>

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

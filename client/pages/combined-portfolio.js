import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/router";
import {
  Container,
  Title,
  Text,
  Table,
  Group,
  Avatar,
  Card,
  Progress,
  Alert,
  Paper,
  LoadingOverlay,
  SimpleGrid,
  Button,
  Grid,
  Center,
} from "@mantine/core";
import {
  IconPigMoney,
  IconCoin,
  IconTrendingUp,
  IconTrendingDown,
  IconArrowLeft,
} from "@tabler/icons-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Sector,
} from "recharts";
import Layout from "../components/Layout";
import { fetchPortfolios } from "../store/portfolioSlice";

function CombinedPortfolio() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { portfolios, loading, error } = useSelector(
    (state) => state.portfolio
  );

  const [combinedAssets, setCombinedAssets] = useState([]);
  const [activeIndexInvested, setActiveIndexInvested] = useState(null);
  const [activeIndexCurrent, setActiveIndexCurrent] = useState(null);

  const formatName = (name) => name.split(".")[0];

  const renderActiveShape = (props) => {
    const {
      cx,
      cy,
      midAngle,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      fill,
      payload,
      percent,
      value,
    } = props;

    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;

    return (
      <>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <text
          x={sx}
          y={sy}
          fill="#333"
          textAnchor={cos >= 0 ? "start" : "end"}
          dominantBaseline="central"
          style={{ fontWeight: 600 }}
        >
          {`${formatName(payload.name)}: ₹${value.toLocaleString("en-IN")}`}
        </text>
      </>
    );
  };

  const handleClickInvested = (_, index) => {
    setActiveIndexInvested(index === activeIndexInvested ? null : index);
  };

  const handleClickCurrent = (_, index) => {
    setActiveIndexCurrent(index === activeIndexCurrent ? null : index);
  };

  // Generate a consistent color from string (basic hash function)
  const generateColorFromString = (str) => {
    // Simple DJB2 hash
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }

    // Normalize and extract components
    const hue = Math.abs(hash) % 360;
    const saturation = 60 + (Math.abs(hash) % 20); // 60–79%
    const lightness = 45 + (Math.abs(hash >> 3) % 10); // 45–54%

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
    } else {
      dispatch(fetchPortfolios());
    }
  }, [isAuthenticated, dispatch, router]);

  useEffect(() => {
    if (portfolios) {
      const allPortfolios = [
        ...(portfolios.ownPortfolios || []),
        ...(portfolios.familyPortfolios || []),
      ];

      // Combine assets with the same symbol
      const assetMap = new Map();

      allPortfolios.forEach((portfolio) => {
        portfolio.assets?.forEach((asset) => {
          if (!asset.symbol) return;

          if (assetMap.has(asset.symbol)) {
            const existing = assetMap.get(asset.symbol);
            const totalQuantity = existing.quantity + asset.quantity;
            const totalInvested =
              existing.invested + asset.quantity * asset.averagePrice;

            assetMap.set(asset.symbol, {
              ...existing,
              quantity: totalQuantity,
              invested: totalInvested,
              currentValue: totalQuantity * asset.currentPrice,
              averagePrice: totalInvested / totalQuantity, // Weighted average
            });
          } else {
            assetMap.set(asset.symbol, {
              name: asset.symbol.split(".")[0], // Remove exchange suffix
              symbol: asset.symbol,
              quantity: asset.quantity,
              averagePrice: asset.averagePrice,
              currentPrice: asset.currentPrice,
              invested: asset.quantity * asset.averagePrice,
              currentValue: asset.quantity * asset.currentPrice,
            });
          }
        });
      });

      // Convert map to array and calculate derived values
      const combined = Array.from(assetMap.values())
        .map((asset) => ({
          ...asset,
          profit: asset.currentValue - asset.invested,
          profitPercentage:
            asset.invested > 0
              ? ((asset.currentValue - asset.invested) / asset.invested) * 100
              : 0,
        }))
        .sort((a, b) => b.currentValue - a.currentValue); // Sort by currentValue descending

      setCombinedAssets(combined);
    }
  }, [portfolios]);

  if (!isAuthenticated || loading) {
    return (
      <Layout>
        <LoadingOverlay visible={true} overlayBlur={2} />
      </Layout>
    );
  }

  const totalValue = combinedAssets.reduce(
    (sum, asset) => sum + asset.currentValue,
    0
  );
  const totalInvested = combinedAssets.reduce(
    (sum, asset) => sum + asset.invested,
    0
  );
  const totalProfit = totalValue - totalInvested;
  const profitPercentage =
    totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  const pieDataInvested = combinedAssets.map((asset) => ({
    name: asset.symbol.split(".")[0],
    value: asset.invested,
    color: generateColorFromString(asset.symbol),
  }));

  const pieDataCurrent = combinedAssets.map((asset) => ({
    name: asset.symbol.split(".")[0],
    value: asset.currentValue,
    color: generateColorFromString(asset.symbol),
  }));

  return (
    <Layout>
      <Container size="xl" py="md">
        <Group position="apart" mb="xl">
          <Title order={2}>Combined Portfolio</Title>
          <Button
            leftIcon={<IconArrowLeft size={16} />}
            onClick={() => router.push("/")}
            variant="outline"
            size="md"
          >
            Back
          </Button>
        </Group>

        {error && (
          <Alert color="red" title="Error" mb="xl">
            {error}
          </Alert>
        )}

        {/* Summary Cards */}
        <SimpleGrid
          cols={3}
          breakpoints={[{ maxWidth: "sm", cols: 1 }]}
          mb="xl"
        >
          <Paper withBorder p="md" radius="md">
            <Group position="apart">
              <Text size="sm" color="dimmed">
                Total Value
              </Text>
              <IconCoin size={20} color="#4C6EF5" />
            </Group>
            <Text size="xl" weight={700} mt="sm">
              ₹
              {totalValue.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Group position="apart">
              <Text size="sm" color="dimmed">
                Total Invested
              </Text>
              <IconPigMoney size={20} color="#228BE6" />
            </Group>
            <Text size="xl" weight={700} mt="sm">
              ₹
              {totalInvested.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Group position="apart">
              <Text size="sm" color="dimmed">
                Profit/Loss
              </Text>
              {totalProfit >= 0 ? (
                <IconTrendingUp size={20} color="#40C057" />
              ) : (
                <IconTrendingDown size={20} color="#FA5252" />
              )}
            </Group>
            <Text
              size="xl"
              weight={700}
              mt="sm"
              color={totalProfit >= 0 ? "green" : "red"}
            >
              ₹
              {Math.abs(totalProfit).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              <Text
                component="span"
                ml="xs"
                size="sm"
                color={totalProfit >= 0 ? "green" : "red"}
              >
                ({profitPercentage.toFixed(2)}%)
              </Text>
            </Text>
          </Paper>
        </SimpleGrid>

        {/* Dual Pie Charts */}
        <Card withBorder shadow="sm" radius="md" mb="xl">
          <Card.Section withBorder inheritPadding py="xs">
            <Text weight={600}>Asset Allocation</Text>
          </Card.Section>
          <Grid gutter="xl">
            <Grid.Col md={6}>
              <Center>
                <Text weight={500} mb="sm">
                  Invested Amount
                </Text>
              </Center>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieDataInvested}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={60}
                    activeIndex={activeIndexInvested}
                    activeShape={renderActiveShape}
                    onClick={handleClickInvested}
                  >
                    {pieDataInvested.map((entry, index) => (
                      <Cell key={`cell-invested-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `₹${value.toLocaleString("en-IN")}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Grid.Col>
            <Grid.Col md={6}>
              <Center>
                <Text weight={500} mb="sm">
                  Current Value
                </Text>
              </Center>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieDataCurrent}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={60}
                    activeIndex={activeIndexCurrent}
                    activeShape={renderActiveShape}
                    onClick={handleClickCurrent}
                  >
                    {pieDataCurrent.map((entry, index) => (
                      <Cell key={`cell-current-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `₹${value.toLocaleString("en-IN")}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Grid.Col>
          </Grid>
        </Card>

        {/* Combined Assets Table */}
        <Card withBorder shadow="sm" radius="md">
          <Card.Section withBorder inheritPadding py="xs">
            <Text weight={600}>All Assets ({combinedAssets.length})</Text>
          </Card.Section>

          <Table verticalSpacing="sm" mt="md">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Quantity</th>
                <th>Avg. Price</th>
                <th>Current Price</th>
                <th>Invested</th>
                <th>Current Value</th>
                <th>Profit/Loss</th>
              </tr>
            </thead>
            <tbody>
              {combinedAssets.map((asset) => (
                <tr key={asset.symbol}>
                  <td>
                    <Group spacing="sm">
                      <Avatar size={30} radius={30}>
                        {asset.symbol.substring(0, 2)}
                      </Avatar>
                      <div>
                        <Text size="sm" weight={500}>
                          {asset.name}
                        </Text>
                      </div>
                    </Group>
                  </td>
                  <td>{asset.quantity.toFixed(2)}</td>
                  <td>₹{asset.averagePrice.toFixed(2)}</td>
                  <td>₹{asset.currentPrice.toFixed(2)}</td>
                  <td>₹{asset.invested.toFixed(2)}</td>
                  <td>₹{asset.currentValue.toFixed(2)}</td>
                  <td>
                    <Text color={asset.profit >= 0 ? "green" : "red"}>
                      ₹{Math.abs(asset.profit).toFixed(2)} (
                      {asset.profitPercentage.toFixed(2)}%)
                    </Text>
                    <Progress
                      value={Math.abs(asset.profitPercentage)}
                      color={asset.profit >= 0 ? "green" : "red"}
                      size="sm"
                      mt={5}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </Container>
    </Layout>
  );
}

export default CombinedPortfolio;

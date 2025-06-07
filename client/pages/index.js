import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  Container,
  Title,
  Text,
  Grid,
  Center,
  Loader,
  Space,
  Divider,
  Group,
  Avatar,
  Badge,
  Card,
  SimpleGrid,
  Progress,
  Alert,
  Paper,
  Box,
  ThemeIcon,
} from "@mantine/core";
import {
  IconPigMoney,
  IconUsers,
  IconCoin,
  IconTrendingUp,
  IconTrendingDown,
  IconArrowUpRight,
  IconArrowDownRight,
} from "@tabler/icons-react";
import Layout from "../components/Layout";
import PortfolioSummary from "../components/PortfolioSummary";
import { fetchPortfolios } from "../store/portfolioSlice";
import { fetchUserProfile } from "@/store/authSlice";

function getUserInitials(name) {
  if (!name || typeof name !== "string") return "US";
  const names = name.trim().split(" ");
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return `${names[0].charAt(0)}${names[names.length - 1].charAt(
    0
  )}`.toUpperCase();
}

export default function Home() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { portfolios, loading, error } = useSelector(
    (state) => state.portfolio
  );
  const [profileUser, setProfileUser] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
    } else {
      console.log("Fetching portfolios for user:", user.user);
      dispatch(fetchPortfolios());
      dispatch(fetchUserProfile(user.user.id)).then((res) => {
        if (res.payload) {
          console.log("Fetched user profile:", res.payload);
          setProfileUser(res.payload);
        } else {
          console.error("Failed to fetch user profile");
        }
      });
    }
  }, [isAuthenticated, user, dispatch, router]);

  // Calculate combined portfolio stats
  const allPortfolios = [
    ...(portfolios?.ownPortfolios || []),
    ...(portfolios?.familyPortfolios || []),
  ];
  const totalValue = allPortfolios.reduce((sum, portfolio) => {
    const portfolioValue = portfolio.assets.reduce(
      (acc, asset) => acc + asset.quantity * asset.currentPrice,
      0
    );
    return sum + portfolioValue;
  }, 0);

  const totalInvested = allPortfolios.reduce((sum, portfolio) => {
    const invested = portfolio.assets.reduce(
      (acc, asset) => acc + asset.quantity * asset.averagePrice,
      0
    );
    return sum + invested;
  }, 0);

  const totalProfit = totalValue - totalInvested;
  const profitPercentage =
    totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  // Collect all assets from all portfolios
  const allAssets = allPortfolios.flatMap((portfolio) => portfolio.assets);

  // Compute daily change from priceHistory
  const assetsWithDailyChange = allAssets
    .map((asset) => {
      if (!asset.priceHistory || asset.priceHistory.length < 2) return null;

      // Sort priceHistory just in case
      const sortedHistory = [...asset.priceHistory].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );

      const yesterday = sortedHistory[sortedHistory.length - 2]?.price;
      const today = sortedHistory[sortedHistory.length - 1]?.price;

      if (yesterday === 0 || !yesterday || !today) return null;

      const change = ((today - yesterday) / yesterday) * 100;

      return {
        ...asset,
        change,
        todayPrice: today,
        yesterdayPrice: yesterday,
      };
    })
    .filter(Boolean);

  // Sort by change
  const sortedByDailyChange = [...assetsWithDailyChange].sort(
    (a, b) => b.change - a.change
  );

  // Top 3 gainers and losers
  const topGainers = sortedByDailyChange
    .filter((a) => a.change > 0)
    .slice(0, 3);
  const topLosers = sortedByDailyChange
    .filter((a) => a.change < 0)
    .slice(-3)
    .reverse();

  useEffect(() => {
    console.log("All Portfolios:", allPortfolios);
    console.log("Portfolio: ", portfolios);
  }, [allPortfolios, portfolios]);

  if (!isAuthenticated || loading) {
    return (
      <Layout>
        <Container size="xl">
          <Center style={{ height: "60vh" }}>
            <Loader size="xl" variant="dots" />
          </Center>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container size="xl" py="md">
        <Group position="apart" align="center" mb="xl">
          <div>
            <Title order={1} weight={600}>
              Welcome back, {profileUser?.name || user?.name || "User"}!
            </Title>
            <Text color="dimmed" size="sm">
              Here&apos;s your financial dashboard
            </Text>
          </div>
          <Avatar
            src={user?.avatar}
            alt={profileUser?.name || user?.name || "User"}
            size="lg"
            radius="xl"
            color="indigo"
          >
            {getUserInitials(user?.name || profileUser?.name)}
          </Avatar>
        </Group>

        <Divider my="sm" />

        {error && (
          <Alert color="red" title="Error" mb="xl">
            {error}
          </Alert>
        )}

        {/* Combined Portfolio Overview */}
        <Link href="/combined-portfolio" legacyBehavior passHref>
          <Card
            component="a"
            withBorder
            shadow="sm"
            radius="md"
            mb="xl"
            sx={{
              cursor: "pointer",
              textDecoration: "none",
              color: "inherit",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 5px 15px rgba(0, 0, 0, 0.1)",
              },
              "& *": {
                textDecoration: "none !important",
              },
            }}
          >
            <Card.Section withBorder inheritPadding py="xs" bg="blue.0">
              <Group position="apart">
                <Text weight={600} color="blue.8">
                  Combined Portfolio Overview
                </Text>
                <Badge color="blue" variant="light" radius="sm">
                  {allPortfolios.length}{" "}
                  {allPortfolios.length === 1 ? "portfolio" : "portfolios"}
                </Badge>
              </Group>
            </Card.Section>

            <SimpleGrid
              cols={3}
              breakpoints={[{ maxWidth: "sm", cols: 1 }]}
              mt="md"
            >
              <Paper withBorder p="md" radius="md" shadow="xs">
                <Group position="apart">
                  <Text size="sm" color="dimmed">
                    Total Value
                  </Text>
                  <ThemeIcon variant="light" color="blue" size="lg" radius="xl">
                    <IconCoin size={18} />
                  </ThemeIcon>
                </Group>
                <Text size="xl" weight={700} mt="sm">
                  ₹
                  {totalValue.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <Text color="dimmed" size="sm">
                  Current market value
                </Text>
              </Paper>

              <Paper withBorder p="md" radius="md" shadow="xs">
                <Group position="apart">
                  <Text size="sm" color="dimmed">
                    Total Invested
                  </Text>
                  <ThemeIcon variant="light" color="cyan" size="lg" radius="xl">
                    <IconPigMoney size={18} />
                  </ThemeIcon>
                </Group>
                <Text size="xl" weight={700} mt="sm">
                  ₹
                  {totalInvested.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <Text color="dimmed" size="sm">
                  Original investment
                </Text>
              </Paper>

              <Paper withBorder p="md" radius="md" shadow="xs">
                <Group position="apart">
                  <Text size="sm" color="dimmed">
                    Profit/Loss
                  </Text>
                  {totalProfit >= 0 ? (
                    <ThemeIcon
                      variant="light"
                      color="green"
                      size="lg"
                      radius="xl"
                    >
                      <IconTrendingUp size={18} />
                    </ThemeIcon>
                  ) : (
                    <ThemeIcon
                      variant="light"
                      color="red"
                      size="lg"
                      radius="xl"
                    >
                      <IconTrendingDown size={18} />
                    </ThemeIcon>
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
                <Progress
                  value={Math.abs(profitPercentage)}
                  color={totalProfit >= 0 ? "green" : "red"}
                  size="sm"
                  mt="xs"
                  striped
                  animate={totalProfit !== 0}
                />
              </Paper>
            </SimpleGrid>
          </Card>
        </Link>

        {/* Market Movers Section */}
        <Title order={3} mb="md" weight={600}>
          Market Movers
        </Title>

        <SimpleGrid
          cols={2}
          spacing="lg"
          mb="xl"
          breakpoints={[{ maxWidth: "sm", cols: 1 }]}
        >
          {/* Top Gainers Card */}
          <Card withBorder shadow="sm" radius="md">
            <Card.Section withBorder inheritPadding py="xs" bg="green.0">
              <Group position="apart">
                <Group spacing="xs">
                  <IconArrowUpRight size={20} color="#40C057" />
                  <Text weight={600} color="green.8">
                    Top Gainers (24h)
                  </Text>
                </Group>
                <Badge color="green" variant="light" radius="sm">
                  {topGainers.length} assets
                </Badge>
              </Group>
            </Card.Section>

            <Box mt="md">
              {topGainers.length === 0 ? (
                <Text size="sm" color="dimmed" py="sm">
                  No significant gainers today.
                </Text>
              ) : (
                topGainers.map((asset, index) => (
                  <Box
                    key={index}
                    py="sm"
                    sx={(theme) => ({
                      borderBottom:
                        index !== topGainers.length - 1
                          ? `1px solid ${theme.colors.gray[2]}`
                          : "none",
                      "&:hover": {
                        backgroundColor: theme.colors.green[0],
                      },
                    })}
                  >
                    <Group position="apart">
                      <Group spacing="sm">
                        <Avatar
                          radius="xl"
                          size="sm"
                          color="green"
                          variant="light"
                        >
                          {asset.symbol?.slice(0, 2)}
                        </Avatar>
                        <div>
                          <Text size="sm" weight={500}>
                            {asset.name || asset.symbol.split(".")[0]}
                          </Text>
                        </div>
                      </Group>
                      <Badge
                        color="green"
                        variant="light"
                        leftSection={
                          <IconArrowUpRight
                            size={12}
                            style={{ marginRight: 4 }}
                          />
                        }
                      >
                        {asset.change.toFixed(2)}%
                      </Badge>
                    </Group>
                  </Box>
                ))
              )}
            </Box>
          </Card>

          {/* Top Losers Card */}
          <Card withBorder shadow="sm" radius="md">
            <Card.Section withBorder inheritPadding py="xs" bg="red.0">
              <Group position="apart">
                <Group spacing="xs">
                  <IconArrowDownRight size={20} color="#FA5252" />
                  <Text weight={600} color="red.8">
                    Top Losers (24h)
                  </Text>
                </Group>
                <Badge color="red" variant="light" radius="sm">
                  {topLosers.length} assets
                </Badge>
              </Group>
            </Card.Section>

            <Box mt="md">
              {topLosers.length === 0 ? (
                <Text size="sm" color="dimmed" py="sm">
                  No significant losers today.
                </Text>
              ) : (
                topLosers.map((asset, index) => (
                  <Box
                    key={index}
                    py="sm"
                    sx={(theme) => ({
                      borderBottom:
                        index !== topLosers.length - 1
                          ? `1px solid ${theme.colors.gray[2]}`
                          : "none",
                      "&:hover": {
                        backgroundColor: theme.colors.red[0],
                      },
                    })}
                  >
                    <Group position="apart">
                      <Group spacing="sm">
                        <Avatar
                          radius="xl"
                          size="sm"
                          color="red"
                          variant="light"
                        >
                          {asset.symbol?.slice(0, 2)}
                        </Avatar>
                        <div>
                          <Text size="sm" weight={500}>
                            {asset.name || asset.symbol}
                          </Text>
                          <Text size="xs" color="dimmed">
                            {asset.symbol}
                          </Text>
                        </div>
                      </Group>
                      <Badge
                        color="red"
                        variant="light"
                        leftSection={
                          <IconArrowDownRight
                            size={12}
                            style={{ marginRight: 4 }}
                          />
                        }
                      >
                        {Math.abs(asset.change).toFixed(2)}%
                      </Badge>
                    </Group>
                  </Box>
                ))
              )}
            </Box>
          </Card>
        </SimpleGrid>

        {/* Individual Portfolio Sections */}
        <Grid gutter="xl">
          <Grid.Col span={12} md={user?.role === "parent" ? 6 : 12}>
            <Card withBorder radius="md" shadow="xs" p="lg">
              <Group position="apart" mb="md">
                <Group>
                  <Avatar radius="xl" color="blue" size="md">
                    <IconPigMoney size={20} />
                  </Avatar>
                  <div>
                    <Text weight={600} size="lg">
                      Your Portfolios
                    </Text>
                    <Text size="xs" color="dimmed">
                      Personal investments overview
                    </Text>
                  </div>
                </Group>
                <Badge color="blue" variant="light" size="sm">
                  {portfolios?.ownPortfolios?.length || 0} portfolio
                  {portfolios?.ownPortfolios?.length === 1 ? "" : "s"}
                </Badge>
              </Group>

              <PortfolioSummary
                portfolios={portfolios?.ownPortfolios || []}
                isFamily={false}
                actionText="Manage Portfolio"
              />
            </Card>
          </Grid.Col>

          {user?.role === "parent" && (
            <Grid.Col span={12} md={6}>
              <Card withBorder radius="md" shadow="xs" p="lg">
                <Group position="apart" mb="md">
                  <Group>
                    <Avatar radius="xl" color="violet" size="md">
                      <IconUsers size={20} />
                    </Avatar>
                    <div>
                      <Text weight={600} size="lg">
                        Family Portfolios
                      </Text>
                      <Text size="xs" color="dimmed">
                        Shared investment accounts
                      </Text>
                    </div>
                  </Group>
                  <Badge color="violet" variant="light" size="sm">
                    {portfolios?.familyPortfolios?.length || 0} portfolio
                    {portfolios?.familyPortfolios?.length === 1 ? "" : "s"}
                  </Badge>
                </Group>

                <PortfolioSummary
                  portfolios={portfolios?.familyPortfolios || []}
                  isFamily={true}
                  actionText="View Family"
                />
              </Card>
            </Grid.Col>
          )}
        </Grid>

        <Space h="xl" />

        <Group position="right">
          <Badge
            variant="outline"
            color="indigo"
            size="lg"
            radius="sm"
            leftSection={
              <Avatar
                src={user?.avatar}
                alt={user?.name || "User"}
                size={24}
                radius="xl"
                mr={5}
              >
                {getUserInitials(profileUser?.name)}
              </Avatar>
            }
          >
            {user?.role === "parent" ? "Family Manager" : "Investor"}
          </Badge>
        </Group>
      </Container>
    </Layout>
  );
}

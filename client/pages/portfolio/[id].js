import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/router";
import {
  Container,
  Title,
  Text,
  Loader,
  Alert,
  Group,
  Button,
  Card,
  Space,
  useMantineTheme,
  Skeleton,
  Stack,
  Center,
  SimpleGrid,
  Modal,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconPlus,
  IconChartLine,
  IconArrowLeft,
  IconTrendingUp,
} from "@tabler/icons-react";
import Layout from "../../components/Layout";
import AssetTable from "../../components/AssetTable";
import PerformanceChart from "../../components/PerformanceChart";
import AssetPerformanceChart from "../../components/AssetPerformanceChart";
import IndividualPortfolioSummary from "@/components/IndividualPortfolioSummary";
import { fetchPortfolioDetails } from "../../store/portfolioSlice";

export default function PortfolioDetail() {
  const router = useRouter();
  const { id } = router.query;
  const dispatch = useDispatch();
  const theme = useMantineTheme();
  const { isAuthenticated, hydrated, loading: authLoading } = useSelector(
    (state) => state.auth
  );
  const { currentPortfolio, loading, error } = useSelector(
    (state) => state.portfolio
  );
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showAssetPerformance, setShowAssetPerformance] = useState(false);

  useEffect(() => {
    if (!hydrated || authLoading) return;
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }
    if (id) {
      dispatch(fetchPortfolioDetails(id));
    }
  }, [isAuthenticated, hydrated, authLoading, id, dispatch, router]);

  const getBaseSymbol = (symbol) => {
    if (!symbol) return "";
    return symbol.split(".")[0];
  };

  const handleViewAssetPerformance = (symbol) => {
    setSelectedAsset(symbol);
    setShowAssetPerformance(true);
  };

  if (!hydrated || authLoading || !isAuthenticated || loading) {
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

  if (error) {
    return (
      <Layout>
        <Container size="xl" py="md">
          <Alert
            icon={<IconAlertCircle size={18} />}
            title="Error"
            color="red"
            variant="filled"
          >
            {error}
          </Alert>
        </Container>
      </Layout>
    );
  }

  if (!currentPortfolio) {
    return (
      <Layout>
        <Container size="xl" py="md">
          <Alert
            icon={<IconAlertCircle size={18} />}
            title="Portfolio Not Found"
            color="yellow"
          >
            The requested portfolio could not be found.
          </Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout title={currentPortfolio.name}>
      <Container size="xl" py="md">
        <Stack spacing="xl">
          <Group position="apart" align="center">
            <div>
              <Title order={2} weight={600}>
                {currentPortfolio.name || "Portfolio Details"}
              </Title>
              <Text color="dimmed" size="sm">
                {currentPortfolio.description || "Your investment portfolio"}
              </Text>
            </div>
            <Group spacing="sm">
              <Button
                leftIcon={<IconArrowLeft size={16} />}
                onClick={() => router.push("/")}
                variant="outline"
                size="md"
              >
                Back
              </Button>
            </Group>
          </Group>

          <IndividualPortfolioSummary
            title="Portfolio Snapshot"
            portfolios={[currentPortfolio]}
            isFamily={false}
          />

          <Card withBorder shadow="sm" radius="md">
            <Card.Section withBorder inheritPadding py="xs">
              <Group spacing="xs">
                <IconChartLine size={18} />
                <Text weight={500}>Portfolio Performance</Text>
              </Group>
            </Card.Section>
            <Card.Section p="md">
              <PerformanceChart portfolio={currentPortfolio} />
            </Card.Section>
          </Card>

          <div className="pt-holdings-section">
            <div className="pt-holdings-section-head">
              <div>
                <h2 className="pt-holdings-section-title">Asset Holdings</h2>
                <p className="pt-holdings-section-sub">
                  Live values · grouped by security
                </p>
              </div>
              <Button
                leftIcon={<IconPlus size={16} />}
                onClick={() => router.push(`/portfolio/${id}/add-asset`)}
                color="teal"
                size="md"
                radius="md"
                styles={{
                  root: {
                    background: "var(--pt-teal)",
                    fontFamily: "var(--pt-display)",
                    fontWeight: 700,
                    "&:hover": { background: "var(--pt-teal-deep)" },
                  },
                }}
              >
                Add Asset
              </Button>
            </div>
            <div style={{ padding: "0.85rem" }}>
              <AssetTable
                portfolio={currentPortfolio}
                onViewPerformance={handleViewAssetPerformance}
              />
            </div>
          </div>
        </Stack>

        {/* Asset Performance Modal */}
        <Modal
          opened={showAssetPerformance}
          onClose={() => setShowAssetPerformance(false)}
          title={
            <Group spacing="xs">
              <IconTrendingUp size={20} />
              <Text size="xl" weight={600}>
                {selectedAsset ? selectedAsset.split('.')[0] : ''} Performance
              </Text>
            </Group>
          }
          size="xl"
          overlayProps={{ blur: 3 }}
          styles={(theme) => ({
            title: {
              fontSize: theme.fontSizes.xl,
              fontWeight: 600,
            },
            header: {
              padding: theme.spacing.md,
              borderBottom: `1px solid ${
                theme.colorScheme === "dark"
                  ? theme.colors.dark[5]
                  : theme.colors.gray[2]
              }`,
            },
            body: {
              padding: 0,
            },
          })}
        >
          {selectedAsset && (
            <AssetPerformanceChart
              portfolio={currentPortfolio}
              assetSymbol={selectedAsset}
            />
          )}
        </Modal>
      </Container>
    </Layout>
  );
}

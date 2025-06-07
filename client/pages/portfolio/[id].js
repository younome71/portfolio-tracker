import { useEffect } from "react";
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
} from "@mantine/core";
import {
  IconAlertCircle,
  IconPlus,
  IconChartLine,
  IconArrowLeft,
} from "@tabler/icons-react";
import Layout from "../../components/Layout";
import AssetTable from "../../components/AssetTable";
import PerformanceChart from "../../components/PerformanceChart";
import IndividualPortfolioSummary from "@/components/IndividualPortfolioSummary";
import { fetchPortfolioDetails } from "../../store/portfolioSlice";

export default function PortfolioDetail() {
  const router = useRouter();
  const { id } = router.query;
  const dispatch = useDispatch();
  const theme = useMantineTheme();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { currentPortfolio, loading, error } = useSelector(
    (state) => state.portfolio
  );

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
    } else if (id) {
      dispatch(fetchPortfolioDetails(id));
    }
  }, [isAuthenticated, id, dispatch, router]);

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

          {/* Add the PortfolioSummary component here */}
          <IndividualPortfolioSummary
            title="Portfolio Snapshot"
            portfolios={[currentPortfolio]} // Wrap currentPortfolio in an array
            isFamily={false} // Adjust based on your needs
          />

          <Card withBorder shadow="sm" radius="md">
            <Card.Section withBorder inheritPadding py="xs">
              <Group spacing="xs">
                <IconChartLine size={18} />
                <Text weight={500}>Performance Overview</Text>
              </Group>
            </Card.Section>
            <Card.Section p="md">
              <PerformanceChart portfolio={currentPortfolio} />
            </Card.Section>
          </Card>

          <Card withBorder shadow="sm" radius="md">
            <Card.Section withBorder inheritPadding py="xs">
              <Group position="apart" align="center">
                <Text weight={500}>Asset Holdings</Text>
                <Button
                  leftIcon={<IconPlus size={16} />}
                  onClick={() => router.push(`/portfolio/${id}/add-asset`)}
                  color="green"
                  size="md"
                >
                  Add Asset
                </Button>
              </Group>
            </Card.Section>

            <Card.Section p="md">
              <AssetTable portfolio={currentPortfolio} />
            </Card.Section>
          </Card>
        </Stack>
      </Container>
    </Layout>
  );
}
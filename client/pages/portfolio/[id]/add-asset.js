import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useDispatch } from "react-redux";
import {
  Container,
  Title,
  Text,
  Card,
  TextInput,
  NumberInput,
  Button,
  Group,
  Loader,
  Alert,
  Space,
  useMantineTheme,
  Select,
  Stack,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconPlus,
  IconAlertCircle,
  IconChartLine,
} from "@tabler/icons-react";
import Layout from "../../../components/Layout";
import { addAsset } from "../../../store/portfolioSlice";

export default function AddAssetPage() {
  const router = useRouter();
  const { id } = router.query;
  const dispatch = useDispatch();
  const theme = useMantineTheme();

  const [formData, setFormData] = useState({
    symbol: "",
    quantity: "",
    averagePrice: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stockOptions, setStockOptions] = useState([]);

  // Load BSE stock list
  useEffect(() => {
    fetch("/bse_stocks.json")
      .then((res) => res.json())
      .then((data) => {
        const options = data.map((stock) => ({
          value: stock.id,
          label: `${stock.name} (${stock.id})`,
        }));
        setStockOptions(options);
      })
      .catch((err) => console.error("Failed to load stock list:", err));
  }, []);


  const handleChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await dispatch(
        addAsset({
          portfolioId: id,
          assetData: {
            symbol: `${formData.symbol.toUpperCase()}.BSE`,
            quantity: parseFloat(formData.quantity),
            averagePrice: parseFloat(formData.averagePrice),
          },
        })
      ).unwrap();

      router.push(`/portfolio/${id}`);
    } catch (err) {
      setError(err.message || "Failed to add asset");
      setLoading(false);
    }
  };

  return (
    <Layout title="Add Asset">
      <Container size="sm" py="xl">
        <Card withBorder shadow="sm" radius="md">
          <Card.Section withBorder inheritPadding py="sm">
            <Group position="apart">
              <Title order={3} weight={600}>
                Add New Asset
              </Title>
              <Button
                leftIcon={<IconArrowLeft size={16} />}
                variant="subtle"
                color="gray"
                size="sm"
                onClick={() => router.push(`/portfolio/${id}`)}
              >
                Back to Portfolio
              </Button>
            </Group>
          </Card.Section>

          <Card.Section p="md">
            <Space h="md" />

            {error && (
              <Alert
                icon={<IconAlertCircle size={18} />}
                title="Error"
                color="red"
                mb="md"
              >
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Stack spacing="lg">
                {/* Stock Symbol Select */}
                <Select
                  label="Stock Symbol"
                  placeholder="Search or select a stock..."
                  data={stockOptions}
                  value={formData.symbol}
                  onChange={(value) => handleChange("symbol", value)}
                  searchable
                  nothingFound="No stocks found"
                  required
                  icon={<IconChartLine size={16} />}
                />

                {/* Quantity */}
                <NumberInput
                  label="Quantity"
                  placeholder="Enter quantity"
                  value={formData.quantity}
                  onChange={(value) => handleChange("quantity", value)}
                  min={0.0001}
                  step={0.0001}
                  precision={4}
                  required
                />

                {/* Average Price */}
                <NumberInput
                  label="Average Price (₹)"
                  placeholder="Enter average price"
                  value={formData.averagePrice}
                  onChange={(value) => handleChange("averagePrice", value)}
                  min={0.0001}
                  step={0.01}
                  precision={2}
                  required
                />

                <Group position="right" mt="xl">
                  <Button
                    type="submit"
                    leftIcon={<IconPlus size={16} />}
                    loading={loading}
                    loaderPosition="right"
                    color="blue"
                    size="md"
                  >
                    Add Asset
                  </Button>
                </Group>
              </Stack>
            </form>
          </Card.Section>
        </Card>
      </Container>
    </Layout>
  );
}

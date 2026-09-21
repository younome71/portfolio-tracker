import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useDispatch } from "react-redux";
import {
  Container,
  Title,
  Card,
  NumberInput,
  Button,
  Group,
  Alert,
  Space,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconPlus,
  IconAlertCircle,
  IconChartLine,
} from "@tabler/icons-react";
import Layout from "../../../components/Layout";
import { addAsset } from "../../../store/portfolioSlice";
import {
  toStoredSymbol,
  getBaseSymbol,
  isCommoditySymbol,
} from "../../../utils/symbols";

const INSTRUMENT_OPTIONS = [
  { value: "EQUITY", label: "Equity (Stock)" },
  { value: "FD", label: "Fixed Deposit" },
  { value: "BOND", label: "Bond" },
  { value: "GOLD", label: "Gold" },
  { value: "SILVER", label: "Silver" },
];

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function withPurchaseDate(payload, formData) {
  if (!formData.purchaseDate) return payload;
  return {
    ...payload,
    purchaseDate: new Date(formData.purchaseDate).toISOString(),
  };
}

function buildAssetPayload(instrument, formData) {
  if (instrument === "EQUITY") {
    return withPurchaseDate(
      {
        assetType: "EQUITY",
        symbol: toStoredSymbol(formData.symbol),
        quantity: parseFloat(formData.quantity),
        averagePrice: parseFloat(formData.averagePrice),
      },
      formData
    );
  }
  if (instrument === "GOLD" || instrument === "SILVER") {
    return withPurchaseDate(
      {
        assetType: "COMMODITY",
        symbol: instrument,
        quantity: parseFloat(formData.quantity),
        averagePrice: parseFloat(formData.averagePrice),
      },
      formData
    );
  }
  return withPurchaseDate(
    {
      assetType: instrument,
      name: formData.name,
      quantity: 1,
      averagePrice: parseFloat(formData.averagePrice),
      interestRate: parseFloat(formData.interestRate),
      maturityDate: formData.maturityDate
        ? new Date(formData.maturityDate).toISOString()
        : undefined,
    },
    formData
  );
}

function inferInstrument(querySymbol, queryType) {
  if (queryType === "FD" || queryType === "BOND") return queryType;
  if (queryType === "COMMODITY" || isCommoditySymbol(querySymbol)) {
    const metal = getBaseSymbol(querySymbol);
    if (metal === "GOLD" || metal === "SILVER") return metal;
  }
  if (querySymbol && isCommoditySymbol(querySymbol)) {
    return getBaseSymbol(querySymbol);
  }
  return "EQUITY";
}

export default function RepeatAssetPage() {
  const router = useRouter();
  const { id, symbol, assetType, name } = router.query;
  const dispatch = useDispatch();

  const [instrument, setInstrument] = useState("EQUITY");
  const [formData, setFormData] = useState({
    symbol: "",
    quantity: "",
    averagePrice: "",
    name: "",
    interestRate: "",
    maturityDate: "",
    purchaseDate: todayInputValue(),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stockOptions, setStockOptions] = useState([]);

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

  useEffect(() => {
    if (!router.isReady) return;
    const inferred = inferInstrument(symbol, assetType);
    setInstrument(inferred);

    if (inferred === "EQUITY" && symbol && stockOptions.length > 0) {
      const ticker = getBaseSymbol(symbol);
      const matched = stockOptions.find((opt) => opt.value === ticker);
      if (matched) {
        setFormData((prev) => ({ ...prev, symbol: matched.value }));
      }
    } else if (inferred === "GOLD" || inferred === "SILVER") {
      setFormData((prev) => ({ ...prev, symbol: inferred }));
    } else if (inferred === "FD" || inferred === "BOND") {
      setFormData((prev) => ({
        ...prev,
        name: typeof name === "string" ? name : "",
      }));
    }
  }, [router.isReady, symbol, assetType, name, stockOptions]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await dispatch(
        addAsset({
          portfolioId: id,
          assetData: buildAssetPayload(instrument, formData),
        })
      ).unwrap();

      router.push(`/portfolio/${id}`);
    } catch (err) {
      setError(
        typeof err === "string" ? err : err?.message || "Failed to add asset"
      );
      setLoading(false);
    }
  };

  const isFixedIncome = instrument === "FD" || instrument === "BOND";
  const isCommodity = instrument === "GOLD" || instrument === "SILVER";
  const isEquity = instrument === "EQUITY";

  return (
    <Layout title="Repeat Asset">
      <Container size="sm" py="xl">
        <Card withBorder shadow="sm" radius="md">
          <Card.Section withBorder inheritPadding py="sm">
            <Group position="apart">
              <Title order={3} weight={600}>
                Add Asset Again
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
                <Select
                  label="Instrument type"
                  data={INSTRUMENT_OPTIONS}
                  value={instrument}
                  onChange={(value) => setInstrument(value || "EQUITY")}
                  required
                />

                {isEquity && (
                  <Select
                    label="Stock Symbol (NSE)"
                    placeholder="Search or select a stock..."
                    data={stockOptions}
                    value={formData.symbol}
                    onChange={(value) => handleChange("symbol", value)}
                    searchable
                    nothingFound="No stocks found"
                    required
                    icon={<IconChartLine size={16} />}
                  />
                )}

                {isFixedIncome && (
                  <>
                    <TextInput
                      label={instrument === "FD" ? "FD name" : "Bond name"}
                      placeholder={
                        instrument === "FD"
                          ? "e.g. HDFC Bank FD"
                          : "e.g. RBI Floating Rate Bond"
                      }
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      required
                    />
                    <NumberInput
                      label="Principal (₹)"
                      placeholder="Amount invested"
                      value={formData.averagePrice}
                      onChange={(value) => handleChange("averagePrice", value)}
                      min={0.01}
                      step={100}
                      precision={2}
                      required
                    />
                    <NumberInput
                      label="Interest rate (% p.a.)"
                      placeholder="e.g. 7.1"
                      value={formData.interestRate}
                      onChange={(value) => handleChange("interestRate", value)}
                      min={0}
                      max={100}
                      step={0.1}
                      precision={2}
                      required
                    />
                    <TextInput
                      type="date"
                      label="Maturity date"
                      value={formData.maturityDate}
                      onChange={(e) =>
                        handleChange("maturityDate", e.target.value)
                      }
                      required
                      min={todayInputValue()}
                    />
                  </>
                )}

                {isCommodity && (
                  <>
                    <NumberInput
                      label="Quantity (grams)"
                      placeholder="Enter grams"
                      value={formData.quantity}
                      onChange={(value) => handleChange("quantity", value)}
                      min={0.0001}
                      step={0.1}
                      precision={4}
                      required
                    />
                    <NumberInput
                      label="Average price (₹ / gram)"
                      placeholder="Purchase price per gram"
                      value={formData.averagePrice}
                      onChange={(value) => handleChange("averagePrice", value)}
                      min={0.01}
                      step={1}
                      precision={2}
                      required
                    />
                  </>
                )}

                {isEquity && (
                  <>
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
                  </>
                )}

                <TextInput
                  type="date"
                  label={
                    isFixedIncome ? "Deposit / purchase date" : "Purchase date"
                  }
                  description="Use the real buy date if you are adding this holding late"
                  value={formData.purchaseDate}
                  onChange={(e) => handleChange("purchaseDate", e.target.value)}
                  max={todayInputValue()}
                  required
                />

                <Group position="right" mt="xl">
                  <Button
                    type="submit"
                    leftIcon={<IconPlus size={16} />}
                    loading={loading}
                    color="teal"
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

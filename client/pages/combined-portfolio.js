import { useEffect, useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/router";
import {
  Container,
  Text,
  Alert,
  LoadingOverlay,
  Button,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconArrowLeft } from "@tabler/icons-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Sector,
} from "recharts";
import Layout from "../components/Layout";
import { fetchPortfolios } from "../store/portfolioSlice";
import { calculateNetInvested, ALLOC_PALETTE } from "../utils/portfolioMath";

function formatINR(value, digits = 2) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function formatCompactINR(value) {
  const n = Number(value) || 0;
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return formatINR(n, 0);
}

/** Collapse long tails into "Others" and assign sequential brand colors. */
function buildAllocSlices(assets, valueKey, maxSlices = 7) {
  const sorted = [...assets]
    .map((a) => ({
      name: a.name,
      symbol: a.symbol,
      value: Number(a[valueKey]) || 0,
    }))
    .filter((a) => a.value > 0)
    .sort((a, b) => b.value - a.value);

  if (!sorted.length) return [];

  const head = sorted.slice(0, maxSlices);
  const tail = sorted.slice(maxSlices);
  const restSum = tail.reduce((s, d) => s + d.value, 0);

  const slices = head.map((item, i) => ({
    ...item,
    color: ALLOC_PALETTE[i % ALLOC_PALETTE.length],
  }));

  if (restSum > 0) {
    slices.push({
      name: "Others",
      symbol: "OTHERS",
      value: restSum,
      color: "#94a3b8",
    });
  }

  return slices;
}

function AllocTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const pct = total > 0 ? (item.value / total) * 100 : 0;
  return (
    <div className="pt-alloc-tooltip">
      <strong>{item.name}</strong>
      {formatINR(item.value)} · {pct.toFixed(1)}%
    </div>
  );
}

function renderActiveShape(props) {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
  } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 5}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={4}
      />
    </g>
  );
}

function AllocationDonut({
  title,
  subtitle,
  data,
  total,
  activeIndex,
  onSliceSelect,
  isMobile,
}) {
  const active = activeIndex != null ? data[activeIndex] : null;
  const centerValue = active ? active.value : total;
  const centerLabel = active ? active.name : "Total";

  return (
    <div className="pt-alloc-panel">
      <div className="pt-alloc-panel-intro">
        <h3 className="pt-alloc-panel-title">{title}</h3>
        <p className="pt-alloc-panel-sub">{subtitle}</p>
      </div>

      <div className="pt-alloc-chart-wrap">
        <div className="pt-alloc-center">
          <div className="pt-alloc-center-label">
            {active ? "Selected" : "Total"}
          </div>
          <div className="pt-alloc-center-value">
            {formatCompactINR(centerValue)}
          </div>
          {active && (
            <div className="pt-alloc-center-name">{centerLabel}</div>
          )}
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={isMobile ? 62 : 70}
              outerRadius={isMobile ? 86 : 96}
              paddingAngle={2.5}
              cornerRadius={5}
              stroke="transparent"
              strokeWidth={0}
              activeIndex={activeIndex ?? undefined}
              activeShape={renderActiveShape}
              onClick={(_, index) => onSliceSelect(index)}
              onMouseEnter={(_, index) => onSliceSelect(index)}
              onMouseLeave={() => onSliceSelect(null)}
              isAnimationActive
              animationDuration={600}
              animationBegin={80}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`${title}-${entry.name}-${index}`}
                  fill={entry.color}
                  fillOpacity={
                    activeIndex == null || activeIndex === index ? 1 : 0.35
                  }
                  style={{ cursor: "pointer", outline: "none" }}
                />
              ))}
            </Pie>
            <Tooltip
              content={<AllocTooltip total={total} />}
              wrapperStyle={{ outline: "none" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-alloc-legend">
        {data.map((item, index) => {
          const pct = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div
              key={item.name}
              className={`pt-alloc-legend-row ${
                activeIndex === index ? "is-active" : ""
              }`}
              onMouseEnter={() => onSliceSelect(index)}
              onMouseLeave={() => onSliceSelect(null)}
              onClick={() =>
                onSliceSelect(activeIndex === index ? null : index)
              }
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSliceSelect(activeIndex === index ? null : index);
                }
              }}
            >
              <span
                className="pt-alloc-swatch"
                style={{ background: item.color }}
              />
              <span className="pt-alloc-legend-name">{item.name}</span>
              <span className="pt-alloc-legend-pct">{pct.toFixed(1)}%</span>
              <div className="pt-alloc-legend-bar">
                <span
                  style={{
                    width: `${Math.min(pct, 100)}%`,
                    background: item.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CombinedPortfolio() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, hydrated, loading: authLoading } = useSelector(
    (state) => state.auth
  );
  const { portfolios, loading, error } = useSelector(
    (state) => state.portfolio
  );
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [combinedAssets, setCombinedAssets] = useState([]);
  const [activeIndexInvested, setActiveIndexInvested] = useState(null);
  const [activeIndexCurrent, setActiveIndexCurrent] = useState(null);

  useEffect(() => {
    if (!hydrated || authLoading) return;
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }
    dispatch(fetchPortfolios());
  }, [isAuthenticated, hydrated, authLoading, dispatch, router]);

  useEffect(() => {
    if (!portfolios) return;

    const allPortfolios = [
      ...(portfolios.ownPortfolios || []),
      ...(portfolios.familyPortfolios || []),
    ];

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
            averagePrice: totalInvested / totalQuantity,
            currentPrice: asset.currentPrice,
          });
        } else {
          assetMap.set(asset.symbol, {
            name: asset.symbol.split(".")[0],
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

    const combined = Array.from(assetMap.values())
      .map((asset) => ({
        ...asset,
        profit: asset.currentValue - asset.invested,
        profitPercentage:
          asset.invested > 0
            ? ((asset.currentValue - asset.invested) / asset.invested) * 100
            : 0,
      }))
      .sort((a, b) => b.currentValue - a.currentValue);

    setCombinedAssets(combined);
  }, [portfolios]);

  const pieDataInvested = useMemo(
    () => buildAllocSlices(combinedAssets, "invested"),
    [combinedAssets]
  );
  const pieDataCurrent = useMemo(
    () => buildAllocSlices(combinedAssets, "currentValue"),
    [combinedAssets]
  );
  const investedTotal = useMemo(
    () => pieDataInvested.reduce((s, d) => s + d.value, 0),
    [pieDataInvested]
  );

  if (!hydrated || authLoading || !isAuthenticated || loading) {
    return (
      <Layout>
        <LoadingOverlay visible overlayBlur={2} />
      </Layout>
    );
  }

  const totalValue = combinedAssets.reduce(
    (sum, asset) => sum + asset.currentValue,
    0
  );
  const totalInvested = [
    ...(portfolios?.ownPortfolios || []),
    ...(portfolios?.familyPortfolios || []),
  ].reduce((sum, p) => sum + calculateNetInvested(p), 0);
  const totalProfit = totalValue - totalInvested;
  const profitPercentage =
    totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  return (
    <Layout title="Combined Portfolio">
      <Container size="xl" py="md" px="sm">
        <div className="pt-combined-page">
          <div className="pt-combined-header">
            <div>
              <h1 className="pt-combined-title">Combined Portfolio</h1>
              <p className="pt-combined-sub">
                All personal and family holdings in one view
              </p>
            </div>
            <Button
              leftIcon={<IconArrowLeft size={16} />}
              onClick={() => router.push("/")}
              variant="default"
              radius="md"
              styles={{
                root: {
                  borderColor: "var(--pt-line)",
                  fontWeight: 600,
                },
              }}
            >
              Back
            </Button>
          </div>

          {error && (
            <Alert color="red" title="Error" radius="md">
              {error}
            </Alert>
          )}

          <div className="pt-combined-metrics">
            <div className="pt-combined-metric">
              <p className="pt-combined-metric-label">Total value</p>
              <p className="pt-combined-metric-value">{formatINR(totalValue)}</p>
              <p className="pt-combined-metric-hint">
                Across {combinedAssets.length} securities
              </p>
            </div>
            <div className="pt-combined-metric">
              <p className="pt-combined-metric-label">Net invested</p>
              <p className="pt-combined-metric-value">
                {formatINR(totalInvested)}
              </p>
              <p className="pt-combined-metric-hint">Buys minus sells</p>
            </div>
            <div className="pt-combined-metric">
              <p className="pt-combined-metric-label">Overall P&amp;L</p>
              <p
                className={`pt-combined-metric-value ${
                  totalProfit >= 0 ? "is-pos" : "is-neg"
                }`}
              >
                {totalProfit >= 0 ? "+" : "−"}
                {formatINR(Math.abs(totalProfit))}
              </p>
              <p
                className="pt-combined-metric-hint"
                style={{
                  color: totalProfit >= 0 ? "#047857" : "#b91c1c",
                  fontWeight: 600,
                }}
              >
                {totalProfit >= 0 ? "+" : ""}
                {profitPercentage.toFixed(2)}%
              </p>
            </div>
          </div>

          <div className="pt-alloc">
            <div className="pt-alloc-head">
              <h2 className="pt-holdings-section-title">Asset allocation</h2>
              <p className="pt-holdings-section-sub">
                Top holdings by cost basis and market value
              </p>
            </div>
            <div className="pt-alloc-grid">
              <AllocationDonut
                title="Invested"
                subtitle="Share of capital deployed"
                data={pieDataInvested}
                total={investedTotal}
                activeIndex={activeIndexInvested}
                onSliceSelect={setActiveIndexInvested}
                isMobile={isMobile}
              />
              <AllocationDonut
                title="Current value"
                subtitle="Share of portfolio today"
                data={pieDataCurrent}
                total={totalValue}
                activeIndex={activeIndexCurrent}
                onSliceSelect={setActiveIndexCurrent}
                isMobile={isMobile}
              />
            </div>
          </div>

          <div className="pt-holdings-section">
            <div className="pt-holdings-section-head">
              <div>
                <h2 className="pt-holdings-section-title">All holdings</h2>
                <p className="pt-holdings-section-sub">
                  {combinedAssets.length} securities · sorted by value
                </p>
              </div>
            </div>

            {combinedAssets.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <Text color="dimmed">
                  No holdings across your portfolios yet.
                </Text>
              </div>
            ) : (
              <>
                <div
                  className="pt-holdings-scroll pt-combined-desktop"
                  style={{ maxHeight: "none" }}
                >
                  <table className="pt-holdings-table">
                    <thead>
                      <tr>
                        <th style={{ width: "24%" }}>Security</th>
                        <th style={{ width: "9%" }}>Qty</th>
                        <th style={{ width: "12%" }}>Avg</th>
                        <th style={{ width: "12%" }}>LTP</th>
                        <th style={{ width: "13%" }}>Invested</th>
                        <th style={{ width: "14%" }}>Value</th>
                        <th style={{ width: "16%" }}>P&amp;L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {combinedAssets.map((asset, idx) => {
                        const positive = asset.profit >= 0;
                        const weight =
                          totalValue > 0
                            ? (asset.currentValue / totalValue) * 100
                            : 0;
                        const accent =
                          ALLOC_PALETTE[idx % ALLOC_PALETTE.length];
                        return (
                          <tr key={asset.symbol} className="pt-holdings-row">
                            <td>
                              <div className="pt-holdings-security">
                                <div
                                  className="pt-holdings-avatar"
                                  style={{
                                    background: `${accent}18`,
                                    color: accent,
                                    borderColor: `${accent}30`,
                                  }}
                                >
                                  {asset.name.slice(0, 2)}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div className="pt-holdings-name">
                                    {asset.name}
                                  </div>
                                  <div className="pt-holdings-meta">
                                    <span className="pt-holdings-lots">
                                      {weight.toFixed(1)}% of portfolio
                                    </span>
                                  </div>
                                  <div className="pt-combined-weight">
                                    <span
                                      style={{
                                        width: `${Math.min(weight, 100)}%`,
                                        background: accent,
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>{asset.quantity.toFixed(2)}</td>
                            <td>{formatINR(asset.averagePrice)}</td>
                            <td>{formatINR(asset.currentPrice)}</td>
                            <td>{formatINR(asset.invested)}</td>
                            <td>
                              <span className="pt-holdings-value">
                                {formatINR(asset.currentValue)}
                              </span>
                            </td>
                            <td>
                              <div className="pt-holdings-stack">
                                <span
                                  className={
                                    positive
                                      ? "pt-holdings-pos"
                                      : "pt-holdings-neg"
                                  }
                                >
                                  {positive ? "+" : ""}
                                  {asset.profitPercentage.toFixed(2)}%
                                </span>
                                <span
                                  className={`pt-holdings-sub ${
                                    positive
                                      ? "pt-holdings-pos"
                                      : "pt-holdings-neg"
                                  }`}
                                >
                                  {formatINR(asset.profit)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="pt-combined-mobile">
                  {combinedAssets.map((asset, idx) => {
                    const positive = asset.profit >= 0;
                    const weight =
                      totalValue > 0
                        ? (asset.currentValue / totalValue) * 100
                        : 0;
                    const accent = ALLOC_PALETTE[idx % ALLOC_PALETTE.length];
                    return (
                      <div key={asset.symbol} className="pt-combined-card">
                        <div className="pt-holdings-security">
                          <div
                            className="pt-holdings-avatar"
                            style={{
                              background: `${accent}18`,
                              color: accent,
                              borderColor: `${accent}30`,
                            }}
                          >
                            {asset.name.slice(0, 2)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="pt-holdings-name">{asset.name}</div>
                            <div className="pt-holdings-lots">
                              {weight.toFixed(1)}% of portfolio
                            </div>
                            <div className="pt-combined-weight">
                              <span
                                style={{
                                  width: `${Math.min(weight, 100)}%`,
                                  background: accent,
                                }}
                              />
                            </div>
                          </div>
                          <div className="pt-holdings-stack">
                            <span
                              className={
                                positive ? "pt-holdings-pos" : "pt-holdings-neg"
                              }
                            >
                              {positive ? "+" : ""}
                              {asset.profitPercentage.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                        <div className="pt-combined-card-grid">
                          <div>
                            <div className="pt-holdings-card-label">Value</div>
                            <div className="pt-holdings-value">
                              {formatINR(asset.currentValue)}
                            </div>
                          </div>
                          <div>
                            <div className="pt-holdings-card-label">
                              Invested
                            </div>
                            <Text size="sm" fw={600}>
                              {formatINR(asset.invested)}
                            </Text>
                          </div>
                          <div>
                            <div className="pt-holdings-card-label">LTP</div>
                            <Text size="sm" fw={600}>
                              {formatINR(asset.currentPrice)}
                            </Text>
                          </div>
                          <div>
                            <div className="pt-holdings-card-label">Qty</div>
                            <Text size="sm" fw={600}>
                              {asset.quantity.toFixed(2)}
                            </Text>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </Container>
    </Layout>
  );
}

export default CombinedPortfolio;

import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import { useDispatch } from "react-redux";
import {
  removeAsset,
  fetchPortfolioDetails,
  sellAsset,
} from "../store/portfolioSlice";
import {
  Group,
  Text,
  ActionIcon,
  Collapse,
  Box,
  Tooltip,
  LoadingOverlay,
  Modal,
  NumberInput,
  Button,
  Alert,
  Stack,
} from "@mantine/core";
import {
  IconTrash,
  IconChevronDown,
  IconChevronUp,
  IconTrendingUp,
  IconPlus,
  IconMinus,
  IconArrowUpRight,
  IconArrowDownRight,
  IconAlertCircle,
} from "@tabler/icons-react";
import React from "react";
import AssetPerformanceChart from "./AssetPerformanceChart";
import { getBaseSymbol } from "../utils/symbols";
import {
  isFixedIncomeType,
  expectedMaturityValue,
  daysUntil,
} from "../utils/fixedIncome";

const TYPE_LABEL = {
  EQUITY: "Equity",
  FD: "FD",
  BOND: "Bond",
  COMMODITY: "Metal",
};

function resolveAssetType(asset) {
  if (asset?.assetType) return asset.assetType;
  const base = getBaseSymbol(asset?.symbol);
  if (base === "GOLD" || base === "SILVER") return "COMMODITY";
  return "EQUITY";
}

function groupKey(asset) {
  return `${resolveAssetType(asset)}::${getBaseSymbol(asset.symbol)}`;
}

function displayLabel(asset) {
  const type = resolveAssetType(asset);
  if (isFixedIncomeType(type) && asset.name) return asset.name;
  if (type === "COMMODITY") {
    const base = getBaseSymbol(asset.symbol);
    return base === "GOLD" ? "Gold" : base === "SILVER" ? "Silver" : base;
  }
  return getBaseSymbol(asset.symbol);
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function avatarLetters(label) {
  const clean = String(label || "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim();
  if (!clean) return "•";
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

function TypeChip({ assetType }) {
  return (
    <span className="pt-holdings-chip" data-type={assetType || "EQUITY"}>
      {TYPE_LABEL[assetType] || "Equity"}
    </span>
  );
}

export default function AssetTable({ portfolio, canEdit = true }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const [isDeleting, setIsDeleting] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [loading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [sellTarget, setSellTarget] = useState(null);
  const [sellQuantity, setSellQuantity] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [sellLoading, setSellLoading] = useState(false);
  const [sellError, setSellError] = useState("");

  const calculateDailyChange = (asset) => {
    if (!asset.priceHistory || asset.priceHistory.length < 2) return null;
    const sortedHistory = [...asset.priceHistory].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    const yesterday = sortedHistory[sortedHistory.length - 2]?.price;
    const today = sortedHistory[sortedHistory.length - 1]?.price;
    if (!yesterday || !today || yesterday === 0) return null;
    return ((today - yesterday) / yesterday) * 100;
  };

  function calculateGroupTotals(assets) {
    return assets.reduce(
      (acc, asset) => {
        acc.totalQuantity += asset.quantity;
        acc.totalValue += asset.quantity * asset.currentPrice;
        acc.totalInvestment += asset.quantity * asset.averagePrice;
        return acc;
      },
      { totalQuantity: 0, totalValue: 0, totalInvestment: 0 }
    );
  }

  const groupedAndSortedAssets = useMemo(() => {
    const groups = {};

    (portfolio.assets || []).forEach((asset) => {
      const key = groupKey(asset);
      if (!groups[key]) groups[key] = [];
      const type = resolveAssetType(asset);
      const principal =
        (Number(asset.quantity) || 0) * (Number(asset.averagePrice) || 0);
      const maturityVal =
        isFixedIncomeType(type) && asset.maturityDate
          ? expectedMaturityValue(
              principal,
              asset.interestRate,
              asset.purchaseDate || asset.createdAt,
              asset.maturityDate
            )
          : asset.expectedMaturityValue ?? null;

      groups[key].push({
        ...asset,
        assetType: type,
        dailyChange: isFixedIncomeType(type)
          ? null
          : calculateDailyChange(asset),
        expectedMaturityValue:
          maturityVal ?? asset.expectedMaturityValue ?? null,
        daysToMaturity:
          asset.daysToMaturity ??
          (asset.maturityDate ? daysUntil(asset.maturityDate) : null),
      });
    });

    Object.keys(groups).forEach((key) => {
      groups[key].sort(
        (a, b) => b.currentPrice * b.quantity - a.currentPrice * a.quantity
      );
    });

    return Object.entries(groups)
      .map(([key, assets]) => {
        const totals = calculateGroupTotals(assets);
        const assetType = resolveAssetType(assets[0]);
        const dailyChanges = assets
          .map((a) => a.dailyChange)
          .filter((v) => v !== null && v !== undefined);
        const avgDailyChange =
          !isFixedIncomeType(assetType) && dailyChanges.length > 0
            ? dailyChanges.reduce((sum, val) => sum + val, 0) /
              dailyChanges.length
            : null;
        const maturityValues = assets
          .map((a) => a.expectedMaturityValue)
          .filter((v) => Number.isFinite(v));
        const totalMaturityValue =
          maturityValues.length > 0
            ? maturityValues.reduce((sum, v) => sum + v, 0)
            : null;

        return {
          key,
          symbol: getBaseSymbol(assets[0].symbol),
          label: displayLabel(assets[0]),
          assetType,
          assets,
          totals,
          avgDailyChange,
          totalMaturityValue,
        };
      })
      .sort((a, b) => b.totals.totalValue - a.totals.totalValue);
  }, [portfolio.assets]);

  const handleDelete = async (assetId) => {
    setIsDeleting(assetId);
    try {
      await dispatch(
        removeAsset({ portfolioId: portfolio._id, assetId })
      ).unwrap();
      await dispatch(fetchPortfolioDetails(portfolio._id));
    } catch (err) {
      console.error("Failed to delete asset:", err);
    } finally {
      setIsDeleting(null);
    }
  };

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const repeatUrl = (asset) => {
    const params = new URLSearchParams({
      symbol: asset.symbol,
      assetType: resolveAssetType(asset),
    });
    if (asset.name) params.set("name", asset.name);
    return `/portfolio/${portfolio._id}/repeatAsset?${params.toString()}`;
  };

  const calculatePnL = (current, average) => {
    if (!average) return 0;
    return ((current - average) / average) * 100;
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);

  const formatQuantity = (value) =>
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);

  const renderChange = (value) => {
    if (value === null || value === undefined) {
      return <span className="pt-holdings-muted">—</span>;
    }
    const positive = value >= 0;
    const Icon = positive ? IconArrowUpRight : IconArrowDownRight;
    return (
      <Group spacing={4} position="right" noWrap>
        <Icon size={14} className={positive ? "pt-holdings-pos" : "pt-holdings-neg"} />
        <Text size="sm" className={positive ? "pt-holdings-pos" : "pt-holdings-neg"}>
          {Math.abs(value).toFixed(2)}%
        </Text>
      </Group>
    );
  };

  const renderPnL = (pct, amount, fixedIncome) => {
    if (fixedIncome) {
      return <span className="pt-holdings-muted">Hold at cost</span>;
    }
    const positive = pct >= 0;
    return (
      <div className="pt-holdings-stack">
        <span className={positive ? "pt-holdings-pos" : "pt-holdings-neg"}>
          {positive ? "+" : ""}
          {pct.toFixed(2)}%
        </span>
        <span
          className={`pt-holdings-sub ${positive ? "pt-holdings-pos" : "pt-holdings-neg"}`}
        >
          {formatCurrency(amount)}
        </span>
      </div>
    );
  };

  const openSellModal = (group) => {
    const { assets, totals, assetType } = group;
    const fixedIncome = isFixedIncomeType(assetType);
    const defaultPrice =
      totals.totalQuantity > 0
        ? totals.totalValue / totals.totalQuantity
        : Number(assets[0]?.currentPrice) || 0;
    setSellTarget({
      symbol: assets[0].symbol,
      assetType,
      label: displayLabel(assets[0]),
      maxQuantity: totals.totalQuantity,
      defaultPrice,
      isFixedIncome: fixedIncome,
    });
    setSellQuantity(fixedIncome ? totals.totalQuantity : "");
    setSellPrice(defaultPrice > 0 ? Number(defaultPrice.toFixed(2)) : "");
    setSellError("");
  };

  const handleSellSubmit = async (e) => {
    e.preventDefault();
    if (!sellTarget) return;
    const qty = Number(sellQuantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setSellError("Enter a valid quantity");
      return;
    }
    if (qty > sellTarget.maxQuantity + 1e-9) {
      setSellError(`You only hold ${sellTarget.maxQuantity} units`);
      return;
    }
    if (sellTarget.isFixedIncome && !(Number(sellPrice) > 0)) {
      setSellError("Enter the redeem proceeds amount");
      return;
    }
    setSellLoading(true);
    setSellError("");
    try {
      await dispatch(
        sellAsset({
          portfolioId: portfolio._id,
          sellData: {
            symbol: sellTarget.symbol,
            assetType: sellTarget.assetType,
            quantity: qty,
            price: Number(sellPrice) > 0 ? Number(sellPrice) : undefined,
          },
        })
      ).unwrap();
      setSellTarget(null);
      await dispatch(fetchPortfolioDetails(portfolio._id));
    } catch (err) {
      setSellError(
        typeof err === "string" ? err : err?.message || "Failed to sell asset"
      );
    } finally {
      setSellLoading(false);
    }
  };

  const handleViewPerformance = (fullSymbol) => {
    setSelectedAsset(fullSymbol);
    setShowPerformanceModal(true);
  };

  const renderActions = (group, stopPropagation = true) => {
    const { assets, assetType } = group;
    const fixedIncome = isFixedIncomeType(assetType);
    if (!canEdit && fixedIncome) return null;

    return (
      <div
        className="pt-holdings-actions"
        onClick={(e) => stopPropagation && e.stopPropagation()}
      >
        {!fixedIncome && (
          <Tooltip label="View performance" withArrow>
            <ActionIcon
              className="pt-holdings-action is-teal"
              variant="subtle"
              onClick={() => handleViewPerformance(assets[0].symbol)}
            >
              <IconTrendingUp size={16} />
            </ActionIcon>
          </Tooltip>
        )}
        {canEdit && (
          <>
            <Tooltip label="Add more" withArrow>
              <ActionIcon
                className="pt-holdings-action is-teal"
                variant="subtle"
                onClick={() => router.push(repeatUrl(assets[0]))}
              >
                <IconPlus size={16} strokeWidth={2.5} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={fixedIncome ? "Redeem" : "Sell"} withArrow>
              <ActionIcon
                className="pt-holdings-action is-rose"
                variant="subtle"
                onClick={() => openSellModal(group)}
              >
                <IconMinus size={16} strokeWidth={2.5} />
              </ActionIcon>
            </Tooltip>
          </>
        )}
      </div>
    );
  };

  const renderDesktop = () => (
    <div className="pt-holdings pt-holdings-desktop">
      <LoadingOverlay visible={loading} overlayBlur={2} />
      <div className="pt-holdings-scroll">
        <table className="pt-holdings-table">
          <thead>
            <tr>
              <th style={{ width: "28%" }}>Security</th>
              <th style={{ width: "10%" }}>Qty</th>
              <th style={{ width: "12%" }}>Avg</th>
              <th style={{ width: "12%" }}>LTP</th>
              <th style={{ width: "14%" }}>Value</th>
              <th style={{ width: "10%" }}>24h</th>
              <th style={{ width: "12%" }}>P&amp;L</th>
              {canEdit && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {groupedAndSortedAssets.map((group) => {
              const {
                key,
                label,
                assetType,
                assets,
                totals,
                avgDailyChange,
                totalMaturityValue,
              } = group;
              const isOpen = Boolean(expandedGroups[key]);
              const fixedIncome = isFixedIncomeType(assetType);
              const avgPrice =
                totals.totalQuantity > 0
                  ? totals.totalInvestment / totals.totalQuantity
                  : 0;
              const currentPrice =
                totals.totalQuantity > 0
                  ? totals.totalValue / totals.totalQuantity
                  : 0;
              const groupPnL =
                avgPrice > 0 ? calculatePnL(currentPrice, avgPrice) : 0;
              const groupPnLValue = totals.totalValue - totals.totalInvestment;

              return (
                <React.Fragment key={key}>
                  <tr
                    className={`pt-holdings-row ${isOpen ? "is-open" : ""}`}
                    onClick={() => toggleGroup(key)}
                  >
                    <td>
                      <div className="pt-holdings-security">
                        <div
                          className="pt-holdings-avatar"
                          data-type={assetType}
                        >
                          {avatarLetters(label)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="pt-holdings-name">{label}</div>
                          <div className="pt-holdings-meta">
                            <TypeChip assetType={assetType} />
                            <span className="pt-holdings-lots">
                              {assets.length}{" "}
                              {assets.length > 1 ? "lots" : "lot"}
                            </span>
                            {isOpen ? (
                              <IconChevronUp size={14} color="#64748b" />
                            ) : (
                              <IconChevronDown size={14} color="#64748b" />
                            )}
                          </div>
                          {fixedIncome && (
                            <div className="pt-holdings-hint">
                              Matures {formatDate(assets[0]?.maturityDate)}
                              {Number.isFinite(totalMaturityValue)
                                ? ` · ${formatCurrency(totalMaturityValue)} expected`
                                : ""}
                              {assets[0]?.interestRate != null
                                ? ` · ${assets[0].interestRate}% p.a.`
                                : ""}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {fixedIncome ? "—" : formatQuantity(totals.totalQuantity)}
                    </td>
                    <td>
                      {formatCurrency(
                        fixedIncome ? totals.totalInvestment : avgPrice
                      )}
                    </td>
                    <td>
                      {fixedIncome ? "—" : formatCurrency(currentPrice)}
                    </td>
                    <td>
                      <span className="pt-holdings-value">
                        {formatCurrency(totals.totalValue)}
                      </span>
                    </td>
                    <td>
                      {fixedIncome
                        ? renderChange(null)
                        : renderChange(avgDailyChange)}
                    </td>
                    <td>{renderPnL(groupPnL, groupPnLValue, fixedIncome)}</td>
                    {canEdit && <td>{renderActions(group)}</td>}
                  </tr>
                  <tr>
                    <td
                      colSpan={canEdit ? 8 : 7}
                      style={{ padding: 0, border: "none" }}
                    >
                      <Collapse in={isOpen}>
                        <div className="pt-holdings-lots-panel">
                          {assets.map((asset) => {
                            const assetValue =
                              asset.quantity * asset.currentPrice;
                            const assetPnL = calculatePnL(
                              asset.currentPrice,
                              asset.averagePrice
                            );
                            const assetPnLValue =
                              (asset.currentPrice - asset.averagePrice) *
                              asset.quantity;
                            const rowFixed = isFixedIncomeType(
                              resolveAssetType(asset)
                            );

                            return (
                              <div key={asset._id} className="pt-holdings-lot">
                                <div>
                                  <Text size="sm" fw={600}>
                                    {displayLabel(asset)}
                                  </Text>
                                  {rowFixed && (
                                    <Text size="xs" color="dimmed">
                                      {formatDate(asset.maturityDate)}
                                      {Number.isFinite(
                                        asset.expectedMaturityValue
                                      )
                                        ? ` · ${formatCurrency(asset.expectedMaturityValue)} at maturity`
                                        : ""}
                                    </Text>
                                  )}
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  {rowFixed
                                    ? "—"
                                    : formatQuantity(asset.quantity)}
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  {formatCurrency(asset.averagePrice)}
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  {rowFixed
                                    ? "—"
                                    : Number(asset.currentPrice) > 0
                                      ? formatCurrency(asset.currentPrice)
                                      : "—"}
                                </div>
                                <div
                                  style={{ textAlign: "right" }}
                                  className="pt-holdings-value"
                                >
                                  {formatCurrency(assetValue)}
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  {rowFixed
                                    ? renderChange(null)
                                    : renderChange(asset.dailyChange)}
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  {canEdit ? (
                                    <Tooltip label="Remove lot" withArrow>
                                      <ActionIcon
                                        className="pt-holdings-action is-rose"
                                        variant="subtle"
                                        loading={isDeleting === asset._id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDelete(asset._id);
                                        }}
                                      >
                                        <IconTrash size={15} />
                                      </ActionIcon>
                                    </Tooltip>
                                  ) : rowFixed ? (
                                    <span className="pt-holdings-muted">—</span>
                                  ) : (
                                    renderPnL(assetPnL, assetPnLValue, false)
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Collapse>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderMobile = () => (
    <div className="pt-holdings-mobile">
      <LoadingOverlay visible={loading} overlayBlur={2} />
      {groupedAndSortedAssets.map((group) => {
        const {
          key,
          label,
          assetType,
          assets,
          totals,
          avgDailyChange,
          totalMaturityValue,
        } = group;
        const isOpen = Boolean(expandedGroups[key]);
        const fixedIncome = isFixedIncomeType(assetType);
        const avgPrice =
          totals.totalQuantity > 0
            ? totals.totalInvestment / totals.totalQuantity
            : 0;
        const currentPrice =
          totals.totalQuantity > 0
            ? totals.totalValue / totals.totalQuantity
            : 0;
        const groupPnL =
          avgPrice > 0 ? calculatePnL(currentPrice, avgPrice) : 0;
        const groupPnLValue = totals.totalValue - totals.totalInvestment;

        return (
          <div key={key} className="pt-holdings-card">
            <div
              className="pt-holdings-card-top"
              onClick={() => toggleGroup(key)}
            >
              <div className="pt-holdings-security">
                <div className="pt-holdings-avatar" data-type={assetType}>
                  {avatarLetters(label)}
                </div>
                <div>
                  <div className="pt-holdings-name">{label}</div>
                  <div className="pt-holdings-meta">
                    <TypeChip assetType={assetType} />
                    <span className="pt-holdings-lots">
                      {assets.length} {assets.length > 1 ? "lots" : "lot"}
                    </span>
                  </div>
                </div>
              </div>
              <Group spacing={4}>
                {renderActions(group)}
                {isOpen ? (
                  <IconChevronUp size={16} color="#64748b" />
                ) : (
                  <IconChevronDown size={16} color="#64748b" />
                )}
              </Group>
            </div>

            <div className="pt-holdings-card-grid">
              <div>
                <div className="pt-holdings-card-label">Value</div>
                <div className="pt-holdings-value">
                  {formatCurrency(totals.totalValue)}
                </div>
              </div>
              <div>
                <div className="pt-holdings-card-label">
                  {fixedIncome ? "At maturity" : "P&L"}
                </div>
                {fixedIncome ? (
                  <Text size="sm" fw={600}>
                    {Number.isFinite(totalMaturityValue)
                      ? formatCurrency(totalMaturityValue)
                      : "—"}
                  </Text>
                ) : (
                  renderPnL(groupPnL, groupPnLValue, false)
                )}
              </div>
              {!fixedIncome && (
                <>
                  <div>
                    <div className="pt-holdings-card-label">24h</div>
                    {renderChange(avgDailyChange)}
                  </div>
                  <div>
                    <div className="pt-holdings-card-label">LTP</div>
                    <Text size="sm" fw={600}>
                      {formatCurrency(currentPrice)}
                    </Text>
                  </div>
                </>
              )}
              {fixedIncome && (
                <div>
                  <div className="pt-holdings-card-label">Maturity</div>
                  <Text size="sm" fw={600}>
                    {formatDate(assets[0]?.maturityDate)}
                  </Text>
                </div>
              )}
            </div>

            <Collapse in={isOpen}>
              <div className="pt-holdings-card-lots">
                {assets.map((asset) => (
                  <Group key={asset._id} position="apart" align="center">
                    <div>
                      <Text size="sm" fw={600}>
                        {formatCurrency(asset.quantity * asset.currentPrice)}
                      </Text>
                      <Text size="xs" color="dimmed">
                        {isFixedIncomeType(resolveAssetType(asset))
                          ? formatDate(asset.maturityDate)
                          : `${formatQuantity(asset.quantity)} @ ${formatCurrency(asset.averagePrice)}`}
                      </Text>
                    </div>
                    {canEdit && (
                      <ActionIcon
                        className="pt-holdings-action is-rose"
                        variant="subtle"
                        loading={isDeleting === asset._id}
                        onClick={() => handleDelete(asset._id)}
                      >
                        <IconTrash size={15} />
                      </ActionIcon>
                    )}
                  </Group>
                ))}
              </div>
            </Collapse>
          </div>
        );
      })}
    </div>
  );

  if (!portfolio?.assets?.length) {
    return (
      <Box py="xl" style={{ textAlign: "center" }}>
        <Text color="dimmed">No holdings yet. Add your first asset.</Text>
      </Box>
    );
  }

  return (
    <>
      {renderDesktop()}
      {renderMobile()}

      <Modal
        opened={Boolean(sellTarget)}
        onClose={() => setSellTarget(null)}
        title={
          sellTarget
            ? `${sellTarget.isFixedIncome ? "Redeem" : "Sell"} ${sellTarget.label || sellTarget.symbol.split(".")[0]}`
            : ""
        }
        size="sm"
        overlayProps={{ blur: 3 }}
        radius="lg"
      >
        {sellTarget && (
          <form onSubmit={handleSellSubmit}>
            <Stack spacing="md">
              {sellError && (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  color="red"
                  variant="light"
                >
                  {sellError}
                </Alert>
              )}
              <Text size="sm" color="dimmed">
                {sellTarget.isFixedIncome
                  ? "Enter the proceeds you receive on redeeming this FD/Bond. Holdings are reduced FIFO."
                  : `You hold ${sellTarget.maxQuantity} units. Selling reduces holdings FIFO and books P&L.`}
              </Text>
              <NumberInput
                label={
                  sellTarget.isFixedIncome
                    ? "Quantity to redeem"
                    : "Quantity to sell"
                }
                placeholder={`Max ${sellTarget.maxQuantity}`}
                value={sellQuantity}
                onChange={setSellQuantity}
                min={0.0001}
                max={sellTarget.maxQuantity}
                step={0.0001}
                precision={4}
                required
              />
              <NumberInput
                label={
                  sellTarget.isFixedIncome
                    ? "Redeem proceeds (₹)"
                    : "Sell price (₹)"
                }
                placeholder={
                  sellTarget.isFixedIncome
                    ? "Amount received"
                    : "Leave empty to use live price"
                }
                value={sellPrice}
                onChange={setSellPrice}
                min={0.0001}
                step={0.01}
                precision={2}
                required={sellTarget.isFixedIncome}
              />
              <Group position="right" mt="xs">
                <Button variant="default" onClick={() => setSellTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit" color="red" loading={sellLoading}>
                  {sellTarget.isFixedIncome ? "Redeem" : "Sell"}
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </Modal>

      <Modal
        opened={showPerformanceModal}
        onClose={() => setShowPerformanceModal(false)}
        title={`${selectedAsset ? selectedAsset.split(".")[0] : ""} Performance`}
        size="xl"
        overlayProps={{ blur: 3 }}
        radius="lg"
      >
        {selectedAsset && (
          <AssetPerformanceChart
            portfolio={portfolio}
            assetSymbol={selectedAsset}
          />
        )}
      </Modal>
    </>
  );
}

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { useDispatch } from "react-redux";
import { removeAsset } from "../store/portfolioSlice";
import {
  Table,
  Group,
  Text,
  ActionIcon,
  Badge,
  Collapse,
  Box,
  Tooltip,
  LoadingOverlay,
  useMantineTheme,
  createStyles,
  MediaQuery,
  Progress,
  Stack,
} from "@mantine/core";
import {
  IconTrash,
  IconChevronDown,
  IconChevronUp,
  IconInfoCircle,
  IconTrendingUp,
  IconTrendingDown,
  IconPlus,
  IconArrowUpRight,
  IconArrowDownRight,
} from "@tabler/icons-react";
import React from "react";

const useStyles = createStyles((theme) => ({
  groupHeader: {
    cursor: "pointer",
    backgroundColor:
      theme.colorScheme === "dark"
        ? theme.colors.dark[6]
        : theme.colors.gray[0],
    transition: "all 150ms ease",
    "&:hover": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[5]
          : theme.colors.gray[1],
    },
  },

  expanded: {
    backgroundColor:
      theme.colorScheme === "dark"
        ? theme.colors.dark[5]
        : theme.colors.blue[0],
  },

  expandedRow: {
    backgroundColor:
      theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
    transition: "all 0.3s ease-in-out",
  },

  positivePnl: {
    color: theme.colors.green[6],
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
  },

  negativePnl: {
    color: theme.colors.red[6],
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
  },

  positiveChange: {
    color: theme.colors.green[6],
    fontWeight: 500,
  },

  negativeChange: {
    color: theme.colors.red[6],
    fontWeight: 500,
  },

  valueCell: {
    fontWeight: 500,
    textAlign: "right",
  },

  symbolCell: {
    minWidth: 120,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.xs,
  },

  exchangeBadge: {
    textTransform: "uppercase",
    fontSize: 10,
    backgroundColor:
      theme.colorScheme === "dark"
        ? theme.colors.dark[4]
        : theme.colors.gray[2],
    color: theme.colorScheme === "dark" ? theme.white : theme.black,
  },

  quantityCell: {
    textAlign: "right",
    whiteSpace: "nowrap",
  },

  priceCell: {
    textAlign: "right",
    whiteSpace: "nowrap",
  },

  pnlCell: {
    textAlign: "right",
    minWidth: 120,
    whiteSpace: "nowrap",
  },

  dayChangeCell: {
    textAlign: "right",
    minWidth: 100,
    whiteSpace: "nowrap",
  },

  mobileHidden: {
    [theme.fn.smallerThan("sm")]: {
      display: "none",
    },
  },

  mobileVisible: {
    [theme.fn.largerThan("sm")]: {
      display: "none",
    },
  },

  compactCell: {
    padding: "4px 8px !important",
    fontSize: theme.fontSizes.xs,
  },

  actionCell: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },

  addButton: {
    backgroundColor: theme.colors.green[0],
    borderRadius: theme.radius.sm,
    width: 24,
    height: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "&:hover": {
      backgroundColor: theme.colors.green[1],
    },
  },

  tableHeader: {
    position: "sticky",
    top: 0,
    backgroundColor:
      theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
    zIndex: 1,
    "&::after": {
      content: '""',
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      borderBottom: `1px solid ${
        theme.colorScheme === "dark"
          ? theme.colors.dark[4]
          : theme.colors.gray[2]
      }`,
    },
  },

  tableContainer: {
    maxHeight: "calc(100vh - 200px)",
    overflowY: "auto",
    borderRadius: theme.radius.md,
    border: `1px solid ${
      theme.colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[2]
    }`,
    [theme.fn.smallerThan("sm")]: {
      maxHeight: "none",
      border: "none",
      borderRadius: 0,
    },
  },

  // Mobile specific styles
  mobileRow: {
    display: "flex",
    flexDirection: "column",
    padding: theme.spacing.sm,
    borderBottom: `1px solid ${
      theme.colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[2]
    }`,
  },

  mobileRowHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },

  mobileRowDetails: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: theme.spacing.sm,
  },

  mobileLabel: {
    fontSize: theme.fontSizes.xs,
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[2]
        : theme.colors.gray[6],
    marginBottom: 2,
  },

  mobileValue: {
    fontSize: theme.fontSizes.sm,
    fontWeight: 500,
  },

  mobilePnl: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
}));

export default function AssetTable({ portfolio, canEdit = true }) {
  const { classes } = useStyles();
  const theme = useMantineTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const [isDeleting, setIsDeleting] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [loading, setLoading] = useState(false);
  const [stockNames, setStockNames] = useState({});

  useEffect(() => {
    const loadStockNames = async () => {
      try {
        const response = await fetch("/bse_stocks.json");
        const data = await response.json();
        const namesMap = {};
        data.forEach((stock) => {
          namesMap[stock.id] = stock.name;
        });
        setStockNames(namesMap);
      } catch (error) {
        console.error("Failed to load stock names:", error);
      }
    };
    loadStockNames();
  }, []);

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

  const groupedAndSortedAssets = useMemo(() => {
    const groups = {};

    portfolio.assets.forEach((asset) => {
      const baseSymbol = asset.symbol.split(".")[0];
      if (!groups[baseSymbol]) {
        groups[baseSymbol] = [];
      }
      groups[baseSymbol].push({
        ...asset,
        dailyChange: calculateDailyChange(asset),
      });
    });

    Object.keys(groups).forEach((symbol) => {
      groups[symbol].sort(
        (a, b) => b.currentPrice * b.quantity - a.currentPrice * a.quantity
      );
    });

    return Object.entries(groups)
      .map(([symbol, assets]) => {
        const totals = calculateGroupTotals(assets);
        const dailyChanges = assets.map((a) => a.dailyChange).filter(Boolean);
        const avgDailyChange =
          dailyChanges.length > 0
            ? dailyChanges.reduce((sum, val) => sum + val, 0) /
              dailyChanges.length
            : null;

        return {
          symbol,
          assets,
          totals,
          avgDailyChange,
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
    } catch (err) {
      console.error("Failed to delete asset:", err);
    } finally {
      setIsDeleting(null);
    }
  };

  const toggleGroup = (symbol) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [symbol]: !prev[symbol],
    }));
  };

  function calculateGroupTotals(assets) {
    return assets.reduce(
      (acc, asset) => {
        acc.totalQuantity += asset.quantity;
        acc.totalValue += asset.quantity * asset.currentPrice;
        acc.totalInvestment += asset.quantity * asset.averagePrice;
        return acc;
      },
      {
        totalQuantity: 0,
        totalValue: 0,
        totalInvestment: 0,
      }
    );
  }

  const calculatePnL = (current, average) => {
    return ((current - average) / average) * 100;
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const formatQuantity = (value) =>
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const getStockName = (symbol) => {
    const baseSymbol = symbol.split(".")[0];
    return stockNames[baseSymbol];
  };

  const renderChangeIndicator = (value) => {
    if (value === null || value === undefined)
      return (
        <Text size="sm" color="dimmed">
          -
        </Text>
      );

    const isPositive = value >= 0;
    const Icon = isPositive ? IconArrowUpRight : IconArrowDownRight;

    return (
      <Group spacing={4} position="right" noWrap>
        <Icon
          size={14}
          className={
            isPositive ? classes.positiveChange : classes.negativeChange
          }
        />
        <Text
          size="sm"
          className={
            isPositive ? classes.positiveChange : classes.negativeChange
          }
        >
          {Math.abs(value).toFixed(2)}%
        </Text>
      </Group>
    );
  };

  const renderMobileAssetRow = (asset) => {
    const assetValue = asset.quantity * asset.currentPrice;
    const assetPnL = calculatePnL(asset.currentPrice, asset.averagePrice);
    const assetPnLValue =
      (asset.currentPrice - asset.averagePrice) * asset.quantity;
    const isAssetProfit = assetPnL >= 0;

    return (
      <Box key={asset._id} className={classes.mobileRow}>
        <div className={classes.mobileRowHeader}>
          <Text weight={600}>{asset.symbol.split(".")[0]}</Text>
          {canEdit && (
            <Group spacing="xs">
              <Tooltip label="Delete asset" withArrow>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="red"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(asset._id);
                  }}
                  loading={isDeleting === asset._id}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          )}
        </div>

        <div className={classes.mobileRowDetails}>
          <div>
            <Text className={classes.mobileLabel}>Quantity</Text>
            <Text className={classes.mobileValue}>
              {formatQuantity(asset.quantity)}
            </Text>
          </div>

          <div>
            <Text className={classes.mobileLabel}>Avg Price</Text>
            <Text className={classes.mobileValue}>
              {formatCurrency(asset.averagePrice)}
            </Text>
          </div>

          <div>
            <Text className={classes.mobileLabel}>LTP</Text>
            <Text className={classes.mobileValue}>
              {formatCurrency(asset.currentPrice)}
            </Text>
          </div>

          <div>
            <Text className={classes.mobileLabel}>Value</Text>
            <Text className={classes.mobileValue}>
              {formatCurrency(assetValue)}
            </Text>
          </div>

          <div>
            <Text className={classes.mobileLabel}>24h Change</Text>
            {renderChangeIndicator(asset.dailyChange)}
          </div>

          <div>
            <Text className={classes.mobileLabel}>P&L</Text>
            <div className={classes.mobilePnl}>
              {isAssetProfit ? (
                <IconTrendingUp size={14} className={classes.positivePnl} />
              ) : (
                <IconTrendingDown size={14} className={classes.negativePnl} />
              )}
              <Text
                className={
                  isAssetProfit ? classes.positivePnl : classes.negativePnl
                }
              >
                {assetPnL.toFixed(2)}% ({formatCurrency(assetPnLValue)})
              </Text>
            </div>
          </div>
        </div>
      </Box>
    );
  };

  const renderMobileGroup = ({ symbol, assets, totals, avgDailyChange }) => {
    const isExpanded = expandedGroups[symbol];
    const avgPrice = totals.totalInvestment / totals.totalQuantity;
    const currentPrice = totals.totalValue / totals.totalQuantity;
    const groupPnL = calculatePnL(currentPrice, avgPrice);
    const groupPnLValue = totals.totalValue - totals.totalInvestment;
    const isProfit = groupPnL >= 0;

    return (
      <Box key={symbol} mb="sm">
        <Box
          className={classes.mobileRow}
          onClick={() => toggleGroup(symbol)}
          style={{ cursor: "pointer" }}
        >
          <div className={classes.mobileRowHeader}>
            <Group spacing="xs">
              <Text weight={600}>{symbol}</Text>
              <Badge
                color="blue"
                variant="light"
                leftSection={<IconInfoCircle size={12} />}
                radius="sm"
                size="xs"
                style={{ height: 18 }}
              >
                {assets.length} {assets.length > 1 ? "HOLDINGS" : "HOLDING"}
              </Badge>
            </Group>
            {isExpanded ? (
              <IconChevronUp size={16} />
            ) : (
              <IconChevronDown size={16} />
            )}
          </div>

          <div className={classes.mobileRowDetails}>
            <div>
              <Text className={classes.mobileLabel}>Total Value</Text>
              <Text className={classes.mobileValue}>
                {formatCurrency(totals.totalValue)}
              </Text>
            </div>

            <div>
              <Text className={classes.mobileLabel}>24h Change</Text>
              {renderChangeIndicator(avgDailyChange)}
            </div>

            <div>
              <Text className={classes.mobileLabel}>P&L</Text>
              <div className={classes.mobilePnl}>
                {isProfit ? (
                  <IconTrendingUp size={14} className={classes.positivePnl} />
                ) : (
                  <IconTrendingDown size={14} className={classes.negativePnl} />
                )}
                <Text
                  className={
                    isProfit ? classes.positivePnl : classes.negativePnl
                  }
                >
                  {groupPnL.toFixed(2)}% ({formatCurrency(groupPnLValue)})
                </Text>
              </div>
            </div>
          </div>
        </Box>

        <Collapse in={isExpanded}>
          <Box pl="md">
            {assets.map((asset) => renderMobileAssetRow(asset))}
          </Box>

          {canEdit && (
            <Box p="sm" style={{ textAlign: "center" }}>
              <Tooltip label="Add asset" withArrow>
                <ActionIcon
                  className={classes.addButton}
                  size="sm"
                  variant="subtle"
                  color="green"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(
                      `/portfolio/${portfolio._id}/repeatAsset?symbol=${symbol}`
                    );
                  }}
                >
                  <IconPlus size={16} strokeWidth={2.5} />
                </ActionIcon>
              </Tooltip>
            </Box>
          )}
        </Collapse>
      </Box>
    );
  };

  return (
    <>
      {/* Desktop View */}
      <MediaQuery smallerThan="sm" styles={{ display: "none" }}>
        <Box className={classes.tableContainer}>
          <LoadingOverlay visible={loading} overlayBlur={2} />

          <Table
            striped
            highlightOnHover
            withColumnBorders
            sx={{
              borderCollapse: "separate",
              borderSpacing: 0,
              tableLayout: "fixed",
            }}
          >
            <thead className={classes.tableHeader}>
              <tr>
                <th style={{ width: "22%" }}>Security</th>
                <th
                  className={classes.mobileHidden}
                  style={{ width: "10%", textAlign: "right" }}
                >
                  Quantity
                </th>
                <th
                  className={classes.mobileHidden}
                  style={{ width: "10%", textAlign: "right" }}
                >
                  Avg Price
                </th>
                <th
                  className={classes.mobileHidden}
                  style={{ width: "10%", textAlign: "right" }}
                >
                  LTP
                </th>
                <th style={{ width: "12%", textAlign: "right" }}>Value</th>
                <th
                  className={classes.dayChangeCell}
                  style={{ textAlign: "right" }}
                >
                  24h Change
                </th>
                <th className={classes.pnlCell} style={{ textAlign: "right" }}>
                  P&L
                </th>
                {canEdit && <th style={{ width: "8%" }}>Actions</th>}
              </tr>
            </thead>

            <tbody>
              {groupedAndSortedAssets.map((group) => {
                const { symbol, assets, totals, avgDailyChange } = group;
                const isExpanded = expandedGroups[symbol];
                const avgPrice = totals.totalInvestment / totals.totalQuantity;
                const currentPrice = totals.totalValue / totals.totalQuantity;
                const groupPnL = calculatePnL(currentPrice, avgPrice);
                const groupPnLValue =
                  totals.totalValue - totals.totalInvestment;
                const isProfit = groupPnL >= 0;

                return (
                  <React.Fragment key={symbol}>
                    <tr
                      className={`${classes.groupHeader} ${
                        isExpanded ? classes.expanded : ""
                      }`}
                      onClick={() => toggleGroup(symbol)}
                      aria-expanded={isExpanded}
                    >
                      <td className={classes.symbolCell}>
                        <Group spacing={4} align="center" noWrap>
                          <Text fw={600}>{symbol}</Text>
                          <Badge
                            color="blue"
                            variant="light"
                            leftSection={<IconInfoCircle size={12} />}
                            radius="sm"
                            size="xs"
                            style={{ height: 18 }}
                          >
                            {assets.length}{" "}
                            {assets.length > 1 ? "HOLDINGS" : "HOLDING"}
                          </Badge>
                          {isExpanded ? (
                            <IconChevronUp size={16} />
                          ) : (
                            <IconChevronDown size={16} />
                          )}
                        </Group>
                      </td>
                      <td
                        className={`${classes.quantityCell} ${classes.mobileHidden}`}
                      >
                        {formatQuantity(totals.totalQuantity)}
                      </td>
                      <td
                        className={`${classes.priceCell} ${classes.mobileHidden}`}
                      >
                        {formatCurrency(avgPrice)}
                      </td>
                      <td
                        className={`${classes.priceCell} ${classes.mobileHidden}`}
                      >
                        {formatCurrency(currentPrice)}
                      </td>
                      <td
                        className={`${classes.priceCell} ${classes.valueCell}`}
                      >
                        {formatCurrency(totals.totalValue)}
                      </td>
                      <td className={classes.dayChangeCell}>
                        {renderChangeIndicator(avgDailyChange)}
                      </td>
                      <td className={classes.pnlCell}>
                        <Group spacing={4} position="right" noWrap>
                          {isProfit ? (
                            <IconTrendingUp
                              size={16}
                              className={classes.positivePnl}
                            />
                          ) : (
                            <IconTrendingDown
                              size={16}
                              className={classes.negativePnl}
                            />
                          )}
                          <Text
                            className={
                              isProfit
                                ? classes.positivePnl
                                : classes.negativePnl
                            }
                          >
                            {groupPnL.toFixed(2)}%
                          </Text>
                          <Text
                            size="xs"
                            color="dimmed"
                            className={classes.mobileHidden}
                          >
                            ({formatCurrency(groupPnLValue)})
                          </Text>
                        </Group>
                      </td>
                      {canEdit && (
                        <td className={classes.actionCell}>
                          <Tooltip label="Add asset" withArrow>
                            <ActionIcon
                              className={classes.addButton}
                              size="sm"
                              variant="subtle"
                              color="green"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(
                                  `/portfolio/${portfolio._id}/repeatAsset?symbol=${symbol}`
                                );
                              }}
                            >
                              <IconPlus size={16} strokeWidth={2.5} />
                            </ActionIcon>
                          </Tooltip>
                        </td>
                      )}
                    </tr>

                    <tr>
                      <td colSpan={canEdit ? 8 : 7} style={{ padding: 0 }}>
                        <Collapse in={isExpanded}>
                          <Table striped highlightOnHover withColumnBorders>
                            <tbody>
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
                                const isAssetProfit = assetPnL >= 0;

                                return (
                                  <tr
                                    key={asset._id}
                                    className={classes.expandedRow}
                                  >
                                    <td style={{ paddingLeft: 40 }}>
                                      <Group spacing="sm" noWrap>
                                        <Text size="sm" color="dimmed">
                                          {asset.symbol.split(".")[0]}
                                        </Text>
                                        {asset.exchange && (
                                          <Badge
                                            size="xs"
                                            color="gray"
                                            variant="outline"
                                            className={classes.exchangeBadge}
                                          >
                                            {asset.exchange}
                                          </Badge>
                                        )}
                                      </Group>
                                    </td>
                                    <td
                                      className={`${classes.quantityCell} ${classes.mobileHidden}`}
                                    >
                                      {formatQuantity(asset.quantity)}
                                    </td>
                                    <td
                                      className={`${classes.priceCell} ${classes.mobileHidden}`}
                                    >
                                      {formatCurrency(asset.averagePrice)}
                                    </td>
                                    <td
                                      className={`${classes.priceCell} ${classes.mobileHidden}`}
                                    >
                                      {formatCurrency(asset.currentPrice)}
                                    </td>
                                    <td
                                      className={`${classes.priceCell} ${classes.valueCell}`}
                                    >
                                      {formatCurrency(assetValue)}
                                    </td>
                                    <td className={classes.dayChangeCell}>
                                      {renderChangeIndicator(asset.dailyChange)}
                                    </td>
                                    <td className={classes.pnlCell}>
                                      <Group
                                        spacing={4}
                                        position="right"
                                        noWrap
                                      >
                                        {isAssetProfit ? (
                                          <IconTrendingUp
                                            size={14}
                                            className={classes.positivePnl}
                                          />
                                        ) : (
                                          <IconTrendingDown
                                            size={14}
                                            className={classes.negativePnl}
                                          />
                                        )}
                                        <Text
                                          size="sm"
                                          className={
                                            isAssetProfit
                                              ? classes.positivePnl
                                              : classes.negativePnl
                                          }
                                        >
                                          {assetPnL.toFixed(2)}%
                                        </Text>
                                        <Text
                                          size="xs"
                                          color="dimmed"
                                          className={classes.mobileHidden}
                                        >
                                          ({formatCurrency(assetPnLValue)})
                                        </Text>
                                      </Group>
                                    </td>
                                    {canEdit && (
                                      <td>
                                        <Group position="right" spacing="xs">
                                          <Tooltip
                                            label="Delete asset"
                                            withArrow
                                          >
                                            <ActionIcon
                                              size="sm"
                                              variant="subtle"
                                              color="red"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(asset._id);
                                              }}
                                              loading={isDeleting === asset._id}
                                            >
                                              <IconTrash size={16} />
                                            </ActionIcon>
                                          </Tooltip>
                                        </Group>
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </Table>
                        </Collapse>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </Table>
        </Box>
      </MediaQuery>

      {/* Mobile View */}
      <MediaQuery largerThan="sm" styles={{ display: "none" }}>
        <Box>
          <LoadingOverlay visible={loading} overlayBlur={2} />
          {groupedAndSortedAssets.map(renderMobileGroup)}
        </Box>
      </MediaQuery>
    </>
  );
}

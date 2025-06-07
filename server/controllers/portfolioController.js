const Portfolio = require('../models/Portfolio');
const User = require('../models/User');
const { fetchStockPrice } = require('../services/stockService');

exports.getPortfolios = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's own portfolios
    const ownPortfolios = await Portfolio.find({ owner: userId, isFamilyPortfolio: false });
    
    // Get family portfolios if user is a parent
    const user = await User.findById(userId);
    let familyPortfolios = [];
    
    if (user.role === 'parent' && user.familyMembers.length > 0) {
      familyPortfolios = await Portfolio.find({
        owner: userId,
        isFamilyPortfolio: true
      }).populate('familyMember', 'name');
    }
    
    res.json({
      ownPortfolios,
      familyPortfolios
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.createPortfolio = async (req, res) => {
  try {
    const { name, isFamilyPortfolio, familyMemberId } = req.body;
    const userId = req.user.id;
    
    if (isFamilyPortfolio && !familyMemberId) {
      return res.status(400).json({ msg: 'Family member ID is required for family portfolio' });
    }
    
    const portfolio = new Portfolio({
      owner: userId,
      name,
      isFamilyPortfolio,
      familyMember: isFamilyPortfolio ? familyMemberId : null
    });
    
    await portfolio.save();
    res.json(portfolio);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.addAsset = async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { symbol, quantity, averagePrice } = req.body;
    const userId = req.user.id;
    
    const portfolio = await Portfolio.findOne({
      _id: portfolioId,
      owner: userId
    });
    
    if (!portfolio) {
      return res.status(404).json({ msg: 'Portfolio not found' });
    }
    
    // Fetch current price
    const currentPrice = await fetchStockPrice(symbol);
    
    const newAsset = {
      symbol,
      quantity,
      averagePrice,
      currentPrice,
      priceHistory: [{
        date: new Date(),
        price: currentPrice
      }]
    };
    
    portfolio.assets.push(newAsset);
    await portfolio.save();
    
    res.json(portfolio);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.removeAsset = async (req, res) => {
  try {
    const { portfolioId, assetId } = req.params;
    const userId = req.user.id;
    console.log("Removing asset:", assetId, "from portfolio:", portfolioId);
    const portfolio = await Portfolio.findOne({
      _id: portfolioId,
      owner: userId
    });
    
    if (!portfolio) {
      return res.status(404).json({ msg: 'Portfolio not found' });
    }
    
    portfolio.assets = portfolio.assets.filter(
      asset => asset._id.toString() !== assetId
    );
    
    await portfolio.save();
    res.json(portfolio);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.getPortfolioPerformance = async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const userId = req.user.id;
    
    const portfolio = await Portfolio.findOne({
      _id: portfolioId,
      $or: [
        { owner: userId },
        { familyMember: userId }
      ]
    });
    
    // console.log("Portfolio inside controller:", portfolio);
    if (!portfolio) {
      return res.status(404).json({ msg: 'Portfolio not found' });
    }
    
    // Calculate performance metrics
    let totalValue = 0;
    let totalCost = 0;
    let dayChange = 0;
    let assets = [];
    
    for (const asset of portfolio.assets) {
      const assetValue = asset.quantity * asset.currentPrice;
      const assetCost = asset.quantity * asset.averagePrice;
      const assetProfit = assetValue - assetCost;
      const profitPercentage = (assetProfit / assetCost) * 100;
      const priceHistory = asset.priceHistory;
      const _id = asset._id.toString();
      
      // Calculate day change if we have price history
      let assetDayChange = 0;
      if (asset.priceHistory.length >= 2) {
        const yesterdayPrice = asset.priceHistory[asset.priceHistory.length - 2].price;
        assetDayChange = ((asset.currentPrice - yesterdayPrice) / yesterdayPrice) * 100;
      }
      
      totalValue += assetValue;
      totalCost += assetCost;
      dayChange += assetDayChange * (assetValue / totalValue);
      
      assets.push({
        symbol: asset.symbol,
        quantity: asset.quantity,
        currentPrice: asset.currentPrice,
        averagePrice: asset.averagePrice,
        value: assetValue,
        profit: assetProfit,
        profitPercentage,
        dayChange: assetDayChange,
        priceHistory: priceHistory,
        _id
      });
    }
    
    const totalProfit = totalValue - totalCost;
    const totalProfitPercentage = (totalProfit / totalCost) * 100;

    
    res.json({
      portfolio: portfolio.name,
      totalValue,
      totalCost,
      totalProfit,
      totalProfitPercentage,
      dayChange,
      _id: portfolio._id.toString(),
      assets
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

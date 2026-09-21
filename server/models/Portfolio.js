const mongoose = require('mongoose');

const ASSET_TYPES = ['EQUITY', 'FD', 'BOND', 'COMMODITY'];

const AssetSchema = new mongoose.Schema(
  {
    assetType: {
      type: String,
      enum: ASSET_TYPES,
      default: 'EQUITY',
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 32,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    averagePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    currentPrice: {
      type: Number,
      default: 0,
    },
    maturityDate: {
      type: Date,
      default: null,
    },
    interestRate: {
      type: Number,
      min: 0,
      default: null,
    },
    /** Actual buy / deposit date (may differ from createdAt when backdated). */
    purchaseDate: {
      type: Date,
      default: null,
    },
    priceHistory: [
      {
        date: Date,
        price: Number,
      },
    ],
  },
  { timestamps: true }
);

const TransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['BUY', 'SELL'],
      required: true,
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 32,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const PortfolioSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      default: 'My Portfolio',
      trim: true,
      maxlength: 100,
    },
    isFamilyPortfolio: {
      type: Boolean,
      default: false,
    },
    familyMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    assets: [AssetSchema],
    transactions: [TransactionSchema],
  },
  { timestamps: true }
);

PortfolioSchema.index({ owner: 1, isFamilyPortfolio: 1 });

module.exports = mongoose.model('Portfolio', PortfolioSchema);
module.exports.ASSET_TYPES = ASSET_TYPES;

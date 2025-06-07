const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  averagePrice: {
    type: Number,
    required: true,
    min: 0
  },
  currentPrice: {
    type: Number,
    default: 0
  },
  priceHistory: [{
    date: Date,
    price: Number
  }]
}, { timestamps: true });

const PortfolioSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    default: 'My Portfolio'
  },
  isFamilyPortfolio: {
    type: Boolean,
    default: false
  },
  familyMember: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assets: [AssetSchema]
}, { timestamps: true });

module.exports = mongoose.model('Portfolio', PortfolioSchema);

const mongoose = require('mongoose');

const StockSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 32,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    series: {
      type: String,
      trim: true,
      maxlength: 16,
      default: 'EQ',
    },
    exchange: {
      type: String,
      enum: ['NSE'],
      default: 'NSE',
    },
    isin: {
      type: String,
      trim: true,
      maxlength: 16,
      default: '',
    },
    listingDate: {
      type: String,
      trim: true,
      maxlength: 32,
      default: '',
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

StockSchema.index({ symbol: 1 }, { unique: true });
StockSchema.index({ name: 'text', symbol: 'text' });

module.exports = mongoose.model('Stock', StockSchema);

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path'); // ← Add this
const { updateStockPrices } = require('./services/stockService');
const authRoutes = require('./routes/auth');
const portfolioRoutes = require('./routes/portfolio');
const userRoutes = require('./routes/user');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/user', userRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Schedule stock price updates every hour
cron.schedule('0 * * * *', () => {
  console.log('Running scheduled stock price update...');
  updateStockPrices().catch(console.error);
});

// Run once immediately
updateStockPrices()
  .then(() => console.log('Initial stock price update complete.'))
  .catch(console.error);

// ✅ Serve frontend after API routes
app.use(express.static(path.join(__dirname, '../client/build')));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

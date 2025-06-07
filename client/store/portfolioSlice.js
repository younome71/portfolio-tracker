import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

export const fetchPortfolios = createAsyncThunk(
  'portfolio/fetchPortfolios',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/portfolio');
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch portfolios');
    }
  }
);

export const fetchPortfolioDetails = createAsyncThunk(
  'portfolio/fetchPortfolioDetails',
  async (portfolioId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/portfolio/${portfolioId}/performance`);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch portfolio details');
    }
  }
);

export const createPortfolio = createAsyncThunk(
  'portfolio/createPortfolio',
  async (portfolioData, { rejectWithValue }) => {
    try {
      const response = await api.post('/portfolio', portfolioData);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create portfolio');
    }
  }
);

export const updatePortfolio = createAsyncThunk(
  'portfolio/updatePortfolio',
  async ({ portfolioId, ...portfolioData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/portfolio/${portfolioId}`, portfolioData);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update portfolio');
    }
  }
);

export const addAsset = createAsyncThunk(
  'portfolio/addAsset',
  async ({ portfolioId, assetData }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/portfolio/${portfolioId}/assets`, assetData);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to add asset');
    }
  }
);

export const removeAsset = createAsyncThunk(
  'portfolio/removeAsset',
  async ({ portfolioId, assetId }, { rejectWithValue }) => {
    try {
      await api.delete(`/portfolio/${portfolioId}/assets/${assetId}`);
      return { portfolioId, assetId };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to remove asset');
    }
  }
);

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState: {
    portfolios: {
      ownPortfolios: [],
      familyPortfolios: []
    },
    currentPortfolio: null,
    loading: false,
    error: null
  },
  reducers: {
    clearPortfolioError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch portfolios
      .addCase(fetchPortfolios.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPortfolios.fulfilled, (state, action) => {
        state.loading = false;
        state.portfolios = action.payload;
      })
      .addCase(fetchPortfolios.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch portfolio details
      .addCase(fetchPortfolioDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPortfolioDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPortfolio = action.payload;
      })
      .addCase(fetchPortfolioDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create portfolio
      .addCase(createPortfolio.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPortfolio.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.isFamilyPortfolio) {
          state.portfolios.familyPortfolios.push(action.payload);
        } else {
          state.portfolios.ownPortfolios.push(action.payload);
        }
      })
      .addCase(createPortfolio.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Add asset
      .addCase(addAsset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addAsset.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPortfolio = action.payload;
      })
      .addCase(addAsset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Remove asset
      .addCase(removeAsset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeAsset.fulfilled, (state, action) => {
        state.loading = false;
        if (state.currentPortfolio?._id === action.payload.portfolioId) {
          state.currentPortfolio.assets = state.currentPortfolio.assets.filter(
            asset => asset._id !== action.payload.assetId
          );
        }
      })
      .addCase(removeAsset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearPortfolioError } = portfolioSlice.actions;
export default portfolioSlice.reducer;

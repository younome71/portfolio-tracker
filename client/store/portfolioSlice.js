import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api, { getApiErrorMessage } from '../utils/api';

export const fetchPortfolios = createAsyncThunk(
  'portfolio/fetchPortfolios',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/portfolio');
      return response.data.data;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Failed to fetch portfolios'));
    }
  }
);

export const fetchPortfolioDetails = createAsyncThunk(
  'portfolio/fetchPortfolioDetails',
  async (portfolioId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/portfolio/${portfolioId}/performance`);
      return response.data.data;
    } catch (err) {
      return rejectWithValue(
        getApiErrorMessage(err, 'Failed to fetch portfolio details')
      );
    }
  }
);

export const createPortfolio = createAsyncThunk(
  'portfolio/createPortfolio',
  async (portfolioData, { rejectWithValue }) => {
    try {
      const response = await api.post('/portfolio', portfolioData);
      return response.data.data;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Failed to create portfolio'));
    }
  }
);

export const updatePortfolio = createAsyncThunk(
  'portfolio/updatePortfolio',
  async ({ portfolioId, ...portfolioData }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/portfolio/${portfolioId}`, portfolioData);
      return response.data.data;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Failed to update portfolio'));
    }
  }
);

export const addAsset = createAsyncThunk(
  'portfolio/addAsset',
  async ({ portfolioId, assetData }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/portfolio/${portfolioId}/assets`, assetData);
      return response.data.data;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Failed to add asset'));
    }
  }
);

export const sellAsset = createAsyncThunk(
  'portfolio/sellAsset',
  async ({ portfolioId, sellData }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/portfolio/${portfolioId}/sell`, sellData);
      return response.data.data;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Failed to sell asset'));
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
      return rejectWithValue(getApiErrorMessage(err, 'Failed to remove asset'));
    }
  }
);

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState: {
    portfolios: {
      ownPortfolios: [],
      familyPortfolios: [],
    },
    currentPortfolio: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearPortfolioError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPortfolios.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPortfolios.fulfilled, (state, action) => {
        state.loading = false;
        state.portfolios = action.payload || {
          ownPortfolios: [],
          familyPortfolios: [],
        };
      })
      .addCase(fetchPortfolios.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
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
      .addCase(updatePortfolio.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload;
        const ownIdx = state.portfolios.ownPortfolios.findIndex(
          (p) => p._id === updated._id
        );
        const famIdx = state.portfolios.familyPortfolios.findIndex(
          (p) => p._id === updated._id
        );
        if (ownIdx >= 0) state.portfolios.ownPortfolios[ownIdx] = updated;
        if (famIdx >= 0) state.portfolios.familyPortfolios[famIdx] = updated;
        if (state.currentPortfolio?._id === updated._id) {
          state.currentPortfolio = {
            ...state.currentPortfolio,
            ...updated,
            name: updated.name,
          };
        }
      })
      .addCase(addAsset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addAsset.fulfilled, (state, action) => {
        state.loading = false;
        // Raw portfolio doc from add — refresh details preferred; store interim
        state.currentPortfolio = action.payload;
      })
      .addCase(addAsset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(sellAsset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sellAsset.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPortfolio = action.payload;
      })
      .addCase(sellAsset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(removeAsset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeAsset.fulfilled, (state, action) => {
        state.loading = false;
        if (state.currentPortfolio?.assets) {
          state.currentPortfolio.assets = state.currentPortfolio.assets.filter(
            (asset) => asset._id !== action.payload.assetId
          );
        }
      })
      .addCase(removeAsset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearPortfolioError } = portfolioSlice.actions;
export default portfolioSlice.reducer;

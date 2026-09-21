import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api, { getApiErrorMessage } from '../utils/api';
import {
  setAuthToken,
  getAuthToken,
  isTokenExpired,
  normalizeUserFromToken,
} from '../utils/auth';

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, thunkAPI) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, 'Registration failed')
      );
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, thunkAPI) => {
    try {
      const response = await api.post('/auth/login', credentials);
      return response.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, 'Login failed')
      );
    }
  }
);

export const fetchUserProfile = createAsyncThunk(
  'auth/fetchUserProfile',
  async (_unused, thunkAPI) => {
    const token = thunkAPI.getState().auth.token;
    if (!token) {
      return thunkAPI.rejectWithValue('No token found');
    }

    try {
      const response = await api.get('/user/profile');
      return response.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, 'Failed to fetch user profile')
      );
    }
  }
);

export const fetchFamilyMembers = createAsyncThunk(
  'auth/fetchFamilyMembers',
  async (_, thunkAPI) => {
    try {
      const response = await api.get('/user/family');
      return response.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, 'Failed to fetch family members')
      );
    }
  }
);

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  familyMembers: [],
  hydrated: false,
};

function applyAuthSuccess(state, payload) {
  const token = payload.token;
  const user =
    payload.user ||
    normalizeUserFromToken(token);

  state.token = token;
  state.user = user;
  state.isAuthenticated = Boolean(token && user?.id);
  state.loading = false;
  state.error = null;
  setAuthToken(token);
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      state.familyMembers = [];
      setAuthToken(null);
    },
    clearError(state) {
      state.error = null;
    },
    rehydrateAuth(state) {
      const token = getAuthToken();
      if (token && !isTokenExpired(token)) {
        const user = normalizeUserFromToken(token);
        if (user?.id) {
          state.token = token;
          state.user = user;
          state.isAuthenticated = true;
        } else {
          setAuthToken(null);
        }
      } else if (token) {
        setAuthToken(null);
      }
      state.loading = false;
      state.hydrated = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        applyAuthSuccess(state, action.payload);
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        applyAuthSuccess(state, action.payload);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        const profile = action.payload;
        state.user = {
          id: profile._id || profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
        };
        state.familyMembers = profile.familyMembers || [];
      })
      .addCase(fetchFamilyMembers.fulfilled, (state, action) => {
        state.familyMembers = action.payload || [];
      });
  },
});

export const { logout, clearError, rehydrateAuth } = authSlice.actions;
export default authSlice.reducer;

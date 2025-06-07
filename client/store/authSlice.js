import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
const { jwtDecode } = require("jwt-decode");

const API_URL = "https://portfolio-tracker-ip4u.onrender.com/api/auth"; // Adjust as needed

// Async thunk for user registration
export const registerUser = createAsyncThunk(
  "auth/register",
  async (userData, thunkAPI) => {
    try {
      const response = await axios.post(
        "https://portfolio-tracker-ip4u.onrender.com/api/auth/register",
        userData
      );
      return response.data; // expected to contain a token
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Registration failed"
      );
    }
  }
);

// Async thunk for user login (optional but often used similarly)
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (credentials, thunkAPI) => {
    try {
      const response = await axios.post(
        "https://portfolio-tracker-ip4u.onrender.com/api/auth/login",
        credentials
      ); // adjust endpoint if needed
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Login failed"
      );
    }
  }
);

export const fetchUserProfile = createAsyncThunk(
  "auth/fetchUserProfile",
  async (id, thunkAPI) => {
    const token = thunkAPI.getState().auth.token;

    if (!token) {
      return thunkAPI.rejectWithValue("No token found");
    }

    try {
      const response = await axios.get(
        `https://portfolio-tracker-ip4u.onrender.com/api/user/profile/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to fetch user profile"
      );
    }
  }
);

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Register user
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        const { token } = action.payload;
        console.log("Token:", token);
        console.log("Decoded Token:", jwtDecode);
        const user = jwtDecode(token);
        state.token = token;
        state.user = user;
        state.isAuthenticated = true;
        state.loading = false;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Login user (optional thunk)
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        const { token } = action.payload;
        console.log("action.payload:", action.payload);
        console.log("Token:", token);
        console.log("Decoded Token:", jwtDecode(token));
        const user = jwtDecode(token);
        state.token = token;
        state.user = user;
        state.isAuthenticated = true;
        state.loading = false;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;

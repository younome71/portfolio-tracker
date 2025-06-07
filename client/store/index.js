import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import portfolioReducer from './portfolioSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    portfolio: portfolioReducer
  }
});

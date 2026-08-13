// frontend/src/redux/store.js

import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import firmReducer from './slices/firmSlice'
import moduleReducer from './slices/moduleSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    firm: firmReducer,
    module: moduleReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
})
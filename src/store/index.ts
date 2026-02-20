import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import workflowReducer from "./slices/workflowSlice";

export const createAppStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      workflow: workflowReducer,
    },
  });

export const store = createAppStore();

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

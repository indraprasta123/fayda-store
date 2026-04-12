import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  access_token: localStorage.getItem("access_token") || null,
  user: localStorage.getItem("user_role")
    ? { role: localStorage.getItem("user_role") }
    : null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setLoginSuccess: (state, action) => {
      state.access_token = action.payload.access_token;
      state.user = action.payload.user || null;

      if (action.payload.access_token) {
        localStorage.setItem("access_token", action.payload.access_token);
      }

      if (action.payload.user?.role) {
        localStorage.setItem("user_role", action.payload.user.role);
      }
    },
    logout: (state) => {
      state.access_token = null;
      state.user = null;
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_role");
    },
  },
});

export const { setLoginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;

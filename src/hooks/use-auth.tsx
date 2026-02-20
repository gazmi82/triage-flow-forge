import { useCallback } from "react";
import type { Role } from "@/data/mockData";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearAuthError, loginThunk, logout, registerThunk } from "@/store/slices/authSlice";

export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, isLoading, error } = useAppSelector((state) => state.auth);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await dispatch(loginThunk({ email, password }));
      if (loginThunk.fulfilled.match(result)) {
        return { ok: true as const };
      }
      return { ok: false as const, error: result.payload as string | undefined };
    },
    [dispatch]
  );

  const register = useCallback(
    async (payload: { name: string; email: string; password: string; role: Role; department: string }) => {
      const result = await dispatch(registerThunk(payload));
      if (registerThunk.fulfilled.match(result)) {
        return { ok: true as const };
      }
      return { ok: false as const, error: result.payload as string | undefined };
    },
    [dispatch]
  );

  const clearError = useCallback(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  const signOut = useCallback(() => {
    dispatch(logout());
  }, [dispatch]);

  return {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    error,
    login,
    register,
    logout: signOut,
    clearError,
  };
}

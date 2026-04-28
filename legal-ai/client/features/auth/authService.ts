import { api } from "../../lib/axiosInstance";

export interface User {
  id: string;
  name: string;
  email: string;
  token: string;
}

export const login = async (name: string, email: string): Promise<User> => {
  const response = await api.post("/auth/login", { name, email });
  return response.data;
};

export const getCurrentUser = (): User | null => {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

export const setCurrentUser = (user: User): void => {
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("token", user.token);
};

export const logout = (): void => {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
};

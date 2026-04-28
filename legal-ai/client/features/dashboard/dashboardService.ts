import { api } from "../../lib/axiosInstance";

export interface DashboardStats {
  totalDocuments: number;
  analyzedThisMonth: number;
  averageRiskScore: number;
  pendingReview: number;
}

export interface RecentDocument {
  id: string;
  name: string;
  date: string;
  status: "Analyzed" | "Pending" | "Processing";
  risk: number | null;
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const response = await api.get("/documents/stats");
    return response.data;
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    throw error;
  }
};

export const getRecentDocuments = async (limit: number = 5): Promise<RecentDocument[]> => {
  try {
    const response = await api.get(`/documents?limit=${limit}&sort=createdAt:desc`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch recent documents:", error);
    throw error;
  }
};

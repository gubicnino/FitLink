import type { User } from "../types/types";
import apiClient from "./apiClient";

export const trainerApi = {
  getAllTrainers: async (): Promise<User[]> => {
    const res = await apiClient.get<User[]>('/user/trainers');
    return res.data;
  },
};

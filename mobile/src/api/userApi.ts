import { User } from "../types/types";
import apiClient from "./apiClient";

export const userApi = {
  getUserById: async (id: string): Promise<User> => {
    const res = await apiClient.get<User>(`/user/${id}`);
    return res.data;
  },

  getUserByFirebaseUid: async (firebaseUid: string): Promise<User> => {
    const res = await apiClient.get<User>(`/user/firebase/${firebaseUid}`);
    return res.data;
  },
};

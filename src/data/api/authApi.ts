import type { AuthPayload, User } from "@/data/mockData";
import { ensureInitialized, mockStore, sleep, toAuthPayload } from "@/data/api/state";

export const authApi = {
  async login(email: string, password: string): Promise<AuthPayload> {
    await ensureInitialized();
    await sleep();
    const normalizedEmail = email.trim().toLowerCase();
    const credential = mockStore.credentials.find((c) => c.email.toLowerCase() === normalizedEmail);
    if (!credential || credential.password !== password) {
      throw new Error("Invalid email or password.");
    }
    const user = mockStore.users.find((u) => u.id === credential.userId && u.active);
    if (!user) {
      throw new Error("User not found or inactive.");
    }
    return toAuthPayload(user);
  },

  async register(payload: { name: string; email: string; password: string; role: User["role"]; department: string }): Promise<AuthPayload> {
    await ensureInitialized();
    await sleep();
    const normalizedEmail = payload.email.trim().toLowerCase();
    const exists = mockStore.users.some((u) => u.email.toLowerCase() === normalizedEmail);
    if (exists) {
      throw new Error("An account with this email already exists.");
    }

    const newUser: User = {
      id: `u${mockStore.users.length + 1}`,
      name: payload.name.trim(),
      email: normalizedEmail,
      role: payload.role,
      department: payload.department.trim(),
      active: true,
    };

    mockStore.users = [...mockStore.users, newUser];
    mockStore.credentials = [...mockStore.credentials, { email: normalizedEmail, password: payload.password, userId: newUser.id }];

    return toAuthPayload(newUser);
  },
};

import type { AdminCreateUserRequest, AdminCreateUserResponse, User } from "@/data/mockData";
import { deepClone } from "@/data/workflowLogic";
import { ensureInitialized, mockStore, sleep } from "@/data/api/state";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buildNextUserId = (): string => {
  const maxSuffix = mockStore.users.reduce((max, user) => {
    const match = /^u(\d+)$/.exec(user.id.trim());
    if (!match) return max;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
  }, 0);
  return `u${maxSuffix + 1}`;
};

export const adminApi = {
  async createUser(payload: AdminCreateUserRequest): Promise<AdminCreateUserResponse> {
    await ensureInitialized();
    await sleep();

    const name = payload.name.trim();
    const email = payload.email.trim().toLowerCase();
    const department = payload.department.trim();
    const password = payload.password;

    if (name.length < 2) {
      throw new Error("Name must be at least 2 characters.");
    }
    if (!EMAIL_REGEX.test(email)) {
      throw new Error("Please provide a valid email address.");
    }
    if (department.length < 2) {
      throw new Error("Department must be at least 2 characters.");
    }
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }

    const emailExists = mockStore.users.some((user) => user.email.toLowerCase() === email);
    if (emailExists) {
      throw new Error("A user with this email already exists.");
    }

    const newUser: User = {
      id: buildNextUserId(),
      name,
      email,
      role: payload.role,
      department,
      active: payload.active ?? true,
    };

    mockStore.users = [...mockStore.users, newUser];
    mockStore.credentials = [...mockStore.credentials, { email, password, userId: newUser.id }];

    return {
      users: deepClone(mockStore.users),
      createdUser: deepClone(newUser),
    };
  },
};

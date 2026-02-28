import { authApi } from "@/data/api/authApi";
import { adminApi } from "@/data/api/adminApi";
import { designerApi } from "@/data/api/designerApi";
import { readApi } from "@/data/api/readApi";
import { taskApi } from "@/data/api/taskApi";

export const inMemoryApi = {
  ...readApi,
  ...designerApi,
  ...taskApi,
  ...authApi,
  ...adminApi,
};

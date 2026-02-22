import { authApi } from "@/data/api/authApi";
import { designerApi } from "@/data/api/designerApi";
import { readApi } from "@/data/api/readApi";
import { taskApi } from "@/data/api/taskApi";

export const mockApi = {
  ...readApi,
  ...designerApi,
  ...taskApi,
  ...authApi,
};

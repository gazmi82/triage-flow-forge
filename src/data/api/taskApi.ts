import { claimTask, completeTask, saveTaskEdits } from "@/data/api/taskApi/taskMutations";
import { createTaskFromConsole } from "@/data/api/taskApi/taskCreation";

export const taskApi = {
  claimTask,
  completeTask,
  saveTaskEdits,
  createTaskFromConsole,
};

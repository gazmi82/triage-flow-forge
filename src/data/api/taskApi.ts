import { claimTask, completeTask, deleteTask, saveTaskEdits } from "@/data/api/taskApi/taskMutations";
import { createTaskFromConsole } from "@/data/api/taskApi/taskCreation";

export const taskApi = {
  claimTask,
  completeTask,
  deleteTask,
  saveTaskEdits,
  createTaskFromConsole,
};

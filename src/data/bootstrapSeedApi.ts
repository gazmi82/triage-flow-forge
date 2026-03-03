import axios from "axios";
import type { BootstrapSeed, WorkflowBootstrapPayload } from "@/data/contracts";

const endpoint = (path: string): string => {
  const base =
    import.meta.env.PROD ? (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() : "";
  if (!base || base === "/") return path;
  return `${base.replace(/\/$/, "")}${path}`;
};

export async function fetchBootstrapSeed(): Promise<BootstrapSeed> {
  const response = await axios.get<WorkflowBootstrapPayload>(endpoint("/api/bootstrap"), {
    withCredentials: true,
  });
  const payload = response.data;

  return {
    users: payload.users,
    authCredentials: [],
    definitions: payload.definitions,
    instances: payload.instances,
    tasks: payload.tasks,
    audit: payload.audit,
  };
}

import axios from "axios";
import type { MockDataSeed } from "@/data/mockData";

export async function fetchMockSeed(): Promise<MockDataSeed> {
  const response = await axios.get<MockDataSeed>("/mockData.json");
  return response.data;
}

export interface AxiosResponse<T> {
  data: T;
  status: number;
}

export interface AxiosLike {
  get<T>(url: string): Promise<AxiosResponse<T>>;
  post<T>(url: string, body?: unknown): Promise<AxiosResponse<T>>;
}

const axios: AxiosLike = {
  async get<T>(url: string) {
    const response = await fetch(url, { method: "GET" });
    if (!response.ok) {
      throw new Error(`GET ${url} failed (${response.status})`);
    }
    return { data: (await response.json()) as T, status: response.status };
  },
  async post<T>(url: string, body?: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`POST ${url} failed (${response.status})`);
    }
    return { data: (await response.json()) as T, status: response.status };
  },
};

export default axios;

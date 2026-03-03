export interface AxiosResponse<T> {
  data: T;
  status: number;
}

export interface AxiosRequestConfig {
  withCredentials?: boolean;
  headers?: Record<string, string>;
}

export interface AxiosLike {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  post<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
}

const axios: AxiosLike = {
  async get<T>(url: string, config?: AxiosRequestConfig) {
    const response = await fetch(url, {
      method: "GET",
      headers: config?.headers,
      credentials: config?.withCredentials ? "include" : "same-origin",
    });
    if (!response.ok) {
      throw new Error(`GET ${url} failed (${response.status})`);
    }
    return { data: (await response.json()) as T, status: response.status };
  },
  async post<T>(url: string, body?: unknown, config?: AxiosRequestConfig) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...config?.headers,
      },
      credentials: config?.withCredentials ? "include" : "same-origin",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`POST ${url} failed (${response.status})`);
    }
    return { data: (await response.json()) as T, status: response.status };
  },
};

export default axios;

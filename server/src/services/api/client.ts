import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = Config.API_URL || 'http://localhost:3000/api/v1';
  }

  async setAuthToken(token: string): Promise<void> {
    this.token = token;
    await AsyncStorage.setItem('authToken', token);
  }

  async clearAuthToken(): Promise<void> {
    this.token = null;
    await AsyncStorage.removeItem('authToken');
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (!this.token) {
      this.token = await AsyncStorage.getItem('authToken');
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = await this.getHeaders();

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'API request upadł -> api/client.ts');
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export default new ApiClient();
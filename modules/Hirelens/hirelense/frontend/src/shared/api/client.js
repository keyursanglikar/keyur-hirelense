// Strip trailing /api if it exists in VITE_API_URL, as the Hirelens endpoints already include /api/
const envBase = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : 'http://localhost:8000';
const BASE_URL = envBase;
const LATENCY_MS = 300;

export const mockClient = {
  request: async (method, url, data = null) => {
    console.log(`[API Client] ${method.toUpperCase()} ${url}`, data ? { data } : '');

    // 1. If it's an implemented endpoint, hit the real Django/MySQL backend!
    // Since the backend is now merged into SuperAdmin, we can use the live endpoints!
    const isLiveEndpoint = true;

    if (isLiveEndpoint) {
      const headers = {
        'Content-Type': 'application/json',
      };
      const token = sessionStorage.getItem('access_token') || sessionStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const config = {
        method: method.toUpperCase(),
        headers: headers,
      };

      if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        config.body = JSON.stringify(data);
      }

      try {
        const response = await fetch(`${BASE_URL}${url}`, config);
        const contentType = response.headers.get('content-type');
        let responseData = null;
        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json();
        }
        
        if (!response.ok) {
          const err = new Error(responseData?.error || `API Request failed with status ${response.status}`);
          err.status = response.status;
          throw err;
        }
        
        return {
          status: response.status,
          data: responseData
        };
      } catch (error) {
        console.error('[API Error]', error);
        throw error;
      }
    }

    // 2. Otherwise, fall back to the mock simulator for other pages
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          status: 200,
          data
        });
      }, LATENCY_MS);
    });
  },

  get: (url) => mockClient.request('GET', url),
  post: (url, data) => mockClient.request('POST', url, data),
  put: (url, data) => mockClient.request('PUT', url, data),
  patch: (url, data) => mockClient.request('PATCH', url, data),
  delete: (url) => mockClient.request('DELETE', url)
};

export default mockClient;

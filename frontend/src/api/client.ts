import axios from 'axios';

// En production sur Netlify/Vercel, appeler en chemin relatif '/api/v1' pour bénéficier du proxy transparent
export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sipat_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const refreshToken = localStorage.getItem('sipat_refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post('/api/v1/auth/refresh', { refreshToken });
          const newAccessToken = res.data.data.accessToken;
          localStorage.setItem('sipat_access_token', newAccessToken);
          error.config.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(error.config);
        } catch {
          localStorage.removeItem('sipat_access_token');
          localStorage.removeItem('sipat_refresh_token');
          window.location.href = '/login';
        }
      } else {
        localStorage.removeItem('sipat_access_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);


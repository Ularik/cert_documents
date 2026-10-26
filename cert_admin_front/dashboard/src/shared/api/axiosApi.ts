import axios from "axios";


const isBrowser = typeof window !== "undefined";

export const isDev = process.env.NODE_ENV === "development";

// dev — локальный backend; prod в браузере — тот же домен (/api через reverse-proxy);
// prod на сервере — имя сервиса из docker-compose
export const apiURL = isDev
  ? "http://localhost:8001/api"
  : isBrowser
    ? "/api"
    : "http://backend:8000/api";


const axiosApi = axios.create({
  baseURL: apiURL,
  withCredentials: true,
});

const logoutAndRedirect = async () => {
  try {
    await axios.post(`${apiURL}/users/logout`, null, {
      withCredentials: true,
      timeout: 2000,
    });
  } catch (e) {
    console.log("Could not notify services about logout", e);
  }

  if (
    typeof window !== "undefined" &&
    window.location.pathname !== "/auth/login"
  ) {
    window.location.replace("/login");
  }
};

axiosApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      originalRequest.url !== "/users/login"
    ) {
      originalRequest._retry = true;

      try {
        await logoutAndRedirect();

        return axiosApi(originalRequest);
      } catch (error) {
        // await logoutAndRedirect();
        console.log();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default axiosApi;

import axios from "axios";


// На сервере (SSR) переменные окружения читаются в рантайме:
// MODE=LOCAL -> NEXT_BACK_URL_LOCAL, иначе NEXT_BACK_URL (например http://backend:8000).
// В браузере переменные без префикса NEXT_PUBLIC_ недоступны, поэтому по умолчанию
// запросы идут на относительный /api (его проксирует nginx). Для `npm run dev` без nginx
// задайте NEXT_PUBLIC_API_URL=http://localhost:8001/api.
const serverBackUrl = (
  process.env.MODE === "LOCAL"
    ? process.env.NEXT_BACK_URL_LOCAL
    : process.env.NEXT_BACK_URL
)?.trim();

export const apiURL =
  typeof window === "undefined"
    ? `${serverBackUrl}/api`
    : process.env.NEXT_PUBLIC_API_URL?.trim() || "/api";


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

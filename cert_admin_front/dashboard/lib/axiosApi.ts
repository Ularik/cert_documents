import axios from "axios";


const MODE = process.env.MODE;
const NEXT_BACK_URL =
  MODE === "LOCAL"
    ? process.env.NEXT_BACK_URL_LOCAL?.trim()
    : process.env.NEXT_BACK_URL?.trim();

const NEXT_BACK_WEB_URL =
  MODE === "LOCAL"
    ? process.env.NEXT_BACK_URL_LOCAL_WEB?.trim()
    : process.env.NEXT_BACK_URL_WEB?.trim();


export const apiURL =
  typeof window === "undefined"
    ? NEXT_BACK_URL + "/api"
    : NEXT_BACK_WEB_URL?.trim();


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

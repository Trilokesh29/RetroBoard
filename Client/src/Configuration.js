import axios from "axios";
import { dispatchAuthExpired } from "./authEvents";
import { createDemoAdapter } from "./demo/demoApi";

var axiosInstance = null;
const cachedUserKey = "retroboard_user";
const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";
const demoJiraBridgeUrl = import.meta.env.VITE_DEMO_JIRA_BRIDGE_URL || "";

class Configuration {
    static getAxiosInstance() {
        if (axiosInstance === null) {
            axiosInstance = axios.create({
                baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
                withCredentials: true,
                timeout: 15000,
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                },
                adapter: isDemoMode ? createDemoAdapter({ jiraBridgeUrl: demoJiraBridgeUrl }) : undefined,
            });

            axiosInstance.interceptors.response.use(
                (response) => response,
                (error) => {
                    if (error.response && error.response.status === 401) {
                        dispatchAuthExpired();
                    }
                    return Promise.reject(error);
                }
            );
        }
        return axiosInstance;
    }

    static getBaseUrl() {
        return `${window.location.protocol}//${window.location.host}/`;
    }

    static getTeamName() {
        const res = window.location.pathname.replace(/^.*\/team\//, "");
        const tok = res.split("/");
        return tok[0];
    }

    static getSprintName() {
        const res = window.location.pathname.replace(/^.*\/team\/.*\/sprint\//, "");
        const tok = res.split("/");
        return tok[0];
    }

    static isBoardRoute() {
        return /\/team\/.+\/sprint\/.+/.test(window.location.pathname);
    }

    static cacheCurrentUser(user) {
        if (!user || !user.userName) {
            return;
        }

        window.localStorage.setItem(cachedUserKey, JSON.stringify(user));
        window.localStorage.setItem("userName", user.userName);
    }

    static clearCachedUser() {
        window.localStorage.removeItem(cachedUserKey);
        window.localStorage.removeItem("userName");
    }

    static getCachedUser() {
        const cachedUser = window.localStorage.getItem(cachedUserKey);

        if (!cachedUser) {
            return null;
        }

        try {
            return JSON.parse(cachedUser);
        } catch (error) {
            this.clearCachedUser();
            return null;
        }
    }

    static getCurrentUserName() {
        return window.localStorage.getItem("userName") || "";
    }

    static isDemoMode() {
        return isDemoMode;
    }

    static isDemoJiraBridgeEnabled() {
        return isDemoMode && Boolean(demoJiraBridgeUrl);
    }

    static getDemoJiraBridgeUrl() {
        return demoJiraBridgeUrl;
    }
}

export default Configuration;

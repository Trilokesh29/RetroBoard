import axios from "axios";

var axiosInstance = null;

class Configuration {
    static getAxiosInstance() {
        if (axiosInstance === null) {
            axiosInstance = axios.create({ baseURL: "http://localhost:3000" });
        }
        return axiosInstance;
    }

    static getBaseUrl() {
        const tok = window.location.href.split("/");
        return tok[0] + "/" + tok[1] + "/" + tok[2] + "/";
    }

    static getTeamName() {
        const res = window.location.href.replace(/^.*\/team\//, "");
        const tok = res.split("/");
        return tok[0];
    }

    static getSprintName() {
        const res = window.location.href.replace(/^.*\/team\/.*\/sprint\//, "");
        const tok = res.split("/");
        return tok[0];
    }
}

export default Configuration;

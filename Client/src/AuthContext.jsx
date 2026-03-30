import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import Configuration from "./Configuration";
import { AUTH_EXPIRED_EVENT } from "./authEvents";

const AuthContext = createContext({
  isLoading: true,
  user: null,
  login: async () => {},
  logout: async () => {},
  register: async () => {},
});

function sanitizeUser(user) {
  if (!user || !user.userName) {
    return null;
  }

  return {
    userName: user.userName,
    emailId: user.emailId || "",
    role: Array.isArray(user.role) ? user.role : [],
    teams: Array.isArray(user.teams) ? user.teams : [],
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => sanitizeUser(Configuration.getCachedUser()));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function hydrateSession() {
      try {
        const response = await Configuration.getAxiosInstance().get("/auth/session");
        const authenticatedUser = sanitizeUser(response.data.user);

        if (isMounted) {
          setUser(authenticatedUser);
          Configuration.cacheCurrentUser(authenticatedUser);
        }
      } catch (error) {
        if (isMounted) {
          setUser(null);
          Configuration.clearCachedUser();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    function handleAuthExpired() {
      if (!isMounted) {
        return;
      }

      setUser(null);
      Configuration.clearCachedUser();
      setIsLoading(false);
    }

    hydrateSession();
    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);

    return () => {
      isMounted = false;
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, []);

  const value = useMemo(
    () => ({
      isLoading,
      user,
      async login(credentials) {
        const response = await Configuration.getAxiosInstance().post("/authenticate", credentials);
        const authenticatedUser = sanitizeUser(response.data.user);
        setUser(authenticatedUser);
        Configuration.cacheCurrentUser(authenticatedUser);
        return authenticatedUser;
      },
      async register(payload) {
        const response = await Configuration.getAxiosInstance().post("/verifyAndSignUp", payload);
        const authenticatedUser = sanitizeUser(response.data.user);
        setUser(authenticatedUser);
        Configuration.cacheCurrentUser(authenticatedUser);
        return authenticatedUser;
      },
      async logout() {
        try {
          await Configuration.getAxiosInstance().post("/logout");
        } finally {
          setUser(null);
          Configuration.clearCachedUser();
        }
      },
    }),
    [isLoading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

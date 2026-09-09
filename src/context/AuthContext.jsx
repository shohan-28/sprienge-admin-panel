import { createContext, useContext, useState } from "react";
import { ADMINS, findAdminByCredentials, getAdminById } from "../config/admins.js";

const AuthContext = createContext(null);

const STORAGE_KEY = "bdmart_admin_session";

export const AuthProvider = ({ children }) => {
  const [adminId, setAdminId] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && getAdminById(stored) ? stored : null;
  });

  const currentAdmin = adminId ? getAdminById(adminId) : null;

  const login = (username, password) => {
    const match = findAdminByCredentials(username.trim(), password);
    if (match) {
      localStorage.setItem(STORAGE_KEY, match.id);
      setAdminId(match.id);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAdminId(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthed: !!currentAdmin,
        admin: currentAdmin,
        admins: ADMINS,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

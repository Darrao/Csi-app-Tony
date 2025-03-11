import React, { createContext, useContext, useEffect, useState } from "react";

interface AuthContextType {
  isAdmin: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const checkAdminStatus = () => {
    const token = localStorage.getItem("adminToken");
    if (!token) return false;

    try {
      const payloadBase64 = token.split(".")[1]; // Extrait le payload du JWT
      const decodedPayload = JSON.parse(atob(payloadBase64)); // Décode en JSON
      return decodedPayload.role === "admin"; // Vérifie si l'utilisateur est admin
    } catch (error) {
      console.error("❌ Erreur lors du décodage du token:", error);
      return false;
    }
  };

  const [isAdmin, setIsAdmin] = useState<boolean>(() => checkAdminStatus()); // ✅ Initialisation correcte

  useEffect(() => {
    setIsAdmin(checkAdminStatus()); // ✅ Vérification lors du chargement
  }, []);

  const login = (token: string) => {
    localStorage.setItem("adminToken", token);
    setIsAdmin(checkAdminStatus());
  };

  const logout = () => {
    console.log("🚪 Déconnexion...");
    localStorage.removeItem("adminToken"); // ✅ Supprime le token
    setIsAdmin(false); // ✅ Met à jour l'état d'authentification
  };

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
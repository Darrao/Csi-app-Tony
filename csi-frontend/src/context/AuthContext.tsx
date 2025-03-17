import React, { createContext, useContext, useEffect, useState } from "react";

interface AuthContextType {
  isAdmin: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Fonction pour décoder un Base64 URL-safe (JWT)
const decodeBase64UrlSafe = (base64: string) => {
  try {
    base64 = base64.replace(/-/g, "+").replace(/_/g, "/"); // Corrige le format URL-safe
    while (base64.length % 4 !== 0) base64 += "="; // Ajoute le padding manquant
    return atob(base64);
  } catch (error) {
    console.error("❌ Erreur de décodage Base64:", error);
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const checkAdminStatus = () => {
    const token = localStorage.getItem("adminToken");
    console.log("📌 Token JWT récupéré:", token);
    
    if (!token) return false;
    
    try {
      const parts = token.split(".");
      if (parts.length !== 3) throw new Error("JWT mal formé");
      
      const payloadBase64 = parts[1]; // Extrait le payload du JWT
      const decodedPayload = decodeBase64UrlSafe(payloadBase64);
      
      if (!decodedPayload) throw new Error("Échec du décodage du payload");
      
      const payloadJson = JSON.parse(decodedPayload);
      return payloadJson.role === "admin"; // Vérifie si l'utilisateur est admin
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
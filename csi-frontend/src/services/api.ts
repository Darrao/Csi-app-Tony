import axios from "axios";

const api = axios.create({
  // baseURL: "https://csi.edbiospc.fr/api",
  baseURL: "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔍 Intercepte chaque requête pour ajouter le token JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token"); // Récupère le token stocké
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ❌ Gestion des erreurs (si le token expire par ex.)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("🔒 Accès non autorisé, suppression du token...");
      localStorage.removeItem("access_token");
      window.location.href = "/login"; // Redirige vers la page de connexion
    }
    return Promise.reject(error);
  }
);

export default api;
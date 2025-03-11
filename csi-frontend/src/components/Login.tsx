import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../services/api"; // Assure-toi d'avoir une API configurée

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await api.post("/auth/login", { email, password });
      console.log("Réponse API :", response.data); // 🔍 Debug ici
      const token = response.data.access_token;

      login(token);
      navigate("/doctorants"); // Redirige après connexion
    } catch (error) {
      setError("❌ Email ou mot de passe incorrect");
    }
  };

  return (
    <div>
      <h2>Connexion Admin</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Se Connecter</button>
      </form>
    </div>
  );
};

export default Login;
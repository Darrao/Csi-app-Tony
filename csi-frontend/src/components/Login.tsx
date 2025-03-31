import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../services/api"; // Assure-toi d'avoir une API configurée
import "../styles/Login.css";

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
      console.log("Réponse API :", response.data);
      const token = response.data.access_token;

      login(token);
      navigate("/doctorants");
    } catch (error) {
      setError("❌ Email ou mot de passe incorrect");
    }
  };

  return (
    <div className="container-login">
      <h2 className="title">Connexion Admin</h2>

      {error && <p className="error-message">{error}</p>}

      <form className="login-form" onSubmit={handleSubmit}>
        <input
          type="email"
          className="input-field"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          className="input-field"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" className="btn">Se Connecter</button>
      </form>
    </div>
  );
};

export default Login;
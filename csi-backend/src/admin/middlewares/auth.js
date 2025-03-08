const config = require("../config");

const authenticateAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]; // Récupère le token après "Bearer"

    if (!token) {
        return res.status(401).json({ error: "Token manquant" });
    }

    if (token !== config.ADMIN_TOKEN) {
        return res.status(403).json({ error: "Accès interdit" });
    }

    next(); // Passe à l’étape suivante si le token est valide
};

module.exports = authenticateAdmin;
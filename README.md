# Csi-app-Tony
# Csi-app-Tony



Requete pour créer un admin en local : 

curl -X POST http://localhost:3000/admin/add \
     -H "Content-Type: application/json" \
     -H "Authorization: MonSuperTokenUltraSecret123" \
     -d '{"email": "nouveladmin@example.com", "password": "motdepasse"}'

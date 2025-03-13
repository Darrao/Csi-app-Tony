# Csi-app-Tony
# Csi-app-Tony



Requete pour créer un admin en local : 

curl -X POST http://localhost:3000/admin/add \
     -H "Content-Type: application/json" \
     -H "Authorization: MonSuperTokenUltraSecret123" \
     -d '{"email": "nouveladmin@example.com", "password": "motdepasse"}'


Requete pour créer un admin en ligne : 

curl -k -X POST https://csi.edbiospc.fr/api/admin/add \
-H "Content-Type: application/json" \
-H "Authorization: gFHLXmFihrxuOhqW4" \
-d '{
  "email": "nouveladmin@example.com",
  "password": "motdepasse"
}'

info sur Notion : 
user : https://juvenile-giraffe-09c.notion.site/Csi-Form-for-Tony-1b3de293f904801fad3edaf36600607d
dev : [https://www.notion.so/Csi-Form-for-Tony-1b3de293f904801fad3edaf36600607d](https://www.notion.so/Dev-CSI-Form-Tony-pour-moi-1b3de293f90480f3ad44d92aa59fab17?pvs=4)

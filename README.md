# TontineApp Backend (Node.js)

Bienvenue dans le code source du backend Node.js pour l'application **TontineApp**. Cette API REST gère toute la logique métier, la base de données, et l'authentification des utilisateurs pour la gestion de tontines (cagnottes/épargnes collaboratives).

## 🚀 Technologies Utilisées

*   **Runtime :** Node.js
*   **Framework :** Express.js
*   **Langage :** TypeScript
*   **ORM :** Prisma (Base de données MySQL)
*   **Validation :** Zod
*   **Authentification :** JWT (JSON Web Tokens) & bcryptjs
*   **Sécurité :** Helmet & CORS

## 🗄️ Modèles de Données Principaux

La base de données relationnelle s'articule autour de ces entités majeures :

*   **Users** : Gestion des utilisateurs avec système d'authentification et de vérification KYC (Know Your Customer).
*   **Tontines** : Les cagnottes collaboratives (paramétrables avec fréquence de versement, montants, pénalités de retard, etc).
*   **Members** : La relation entre un utilisateur et une tontine, gérant le rôle (admin, trésorier, membre) et le score de confiance.
*   **Contributions & Payments** : Suivi des versements attendus et des paiements réels effectués par les membres.
*   **Payouts** : La planification et la distribution des fonds récupérés aux bénéficiaires (par ordre manuel, séquentiel ou aléatoire).
*   **Notifications & OTPs** : Gestion des alertes utilisateurs et validation de numéro de téléphone.

## 🛠️ Scripts Disponibles

Dans le dossier du projet, vous pouvez lancer les commandes suivantes avec `npm` ou `yarn` :

*   `npm run dev` : Démarre le serveur de développement en mode watch (rechargement automatique) via `tsx`.
*   `npm run build` : Compile le projet TypeScript vers du JavaScript (dossier `dist`).
*   `npm start` : Démarre le serveur de production (nécessite un build préalable).
*   `npm run prisma:pull` : Synchronise le schéma Prisma avec la structure actuelle de votre base de données.
*   `npm run prisma:generate` : Génère le client Prisma pour être utilisé dans le code TypeScript.

## ⚙️ Configuration (Variables d'Environnement)

Pour faire fonctionner le projet localement, copiez ou créez un fichier `.env` à la racine de ce dossier `backend-node` contenant au minimum :

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
PORT=3000
JWT_SECRET="votre_secret_jwt_securise"
```

*(Assurez-vous de configurer correctement vos accès MySQL).*

## 📁 Structure du Projet

*   `prisma/` : Schéma de la base de données et configurations Prisma.
*   `src/controllers/` : Logique métier et gestion des requêtes par route.
*   `src/middlewares/` : Intercepteurs Express (auth, validation, gestion d'erreur).
*   `src/routes/` : Définition des endpoints de l'API.
*   `src/services/` : Logique complexe et accès externes détachés des contrôleurs.
*   `src/utils/` : Fonctions utilitaires (hash, JWT, formateurs).
*   `src/index.ts` : Point d'entrée de l'application Express.

## 🔒 Sécurité

*   Les mots de passe sont hashés avec `bcryptjs`.
*   Toutes les routes protégées nécessitent un token JWT valide passé en header `Authorization: Bearer <token>`.
*   Protection basique contre les vulnérabilités web grâce à `helmet`.
*   Toutes les requêtes entrantes sont validées dynamiquement et typées grâce à `zod`.

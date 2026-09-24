# Fork HomeBox de CanopeeGroup

Ce dépôt est un fork personnalisé de [sysadminsmedia/homebox](https://github.com/sysadminsmedia/homebox), adapté à une gestion d’inventaire simplifiée et orientée vers les objets, les modèles et les emplacements.

Les développements personnalisés sont publiés exclusivement sur la branche `main`.

## Changements récents — 24 septembre 2026

- **Création rapide mobile/tablette** : ajout dans l’en-tête de deux boutons visibles avec leur libellé, **Nouvel Emplacement** et **Nouvel Objet**, réutilisant les formulaires existants.
- **Navigation après création** : suppression de la redirection automatique vers la fiche créée ; après création d’un objet ou d’un emplacement, l’utilisateur reste sur la page courante.
- **Actualisation des emplacements** : un nouvel emplacement actualise immédiatement les listes, les parents, l’arbre et les caches associés sans dépendre uniquement du WebSocket.
- **Actualisation des objets** : un nouvel objet apparaît immédiatement dans l’emplacement courant ; le cache de la liste concernée est invalidé ou rafraîchi de façon ciblée.
- **Compteurs de sous-emplacements** : le compteur d’objets est mis à jour immédiatement dans l’arbre global et dans les cartes de sous-emplacements, puis réconcilié avec le serveur en arrière-plan.
- **Quantités** : les changements de quantité sont répercutés immédiatement dans la fiche, les cartes compactes et les caches des listes d’emplacements.
- **Navigation imbriquée** : cache mémoire des fiches d’emplacements, sous-emplacements et objets afin d’accélérer les parcours parent → enfant → sous-enfant → retour sur mobile et tablette.
- **Recherche** : pagination visible dans la vue compacte au-delà de 12 objets et affichage de l’emplacement sous chaque résultat.
- **CSV** : import UTF-8, UTF-8 avec BOM et Windows-1252/ANSI ; export inventaire en UTF-8 avec BOM et `charset=utf-8`.
- **Sauvegarde complète** : sauvegarde/restauration ZIP de l’instance pour les administrateurs, incluant utilisateurs, collections, paramètres persistants, inventaire, modèles, emplacements et pièces jointes.

## Fonctionnalités ajoutées

### Gestion des modèles

- Affichage exclusivement sous forme de liste compacte.
- Réduction de la taille de la police et de la hauteur des lignes.
- Sélection d’un modèle ou de tous les modèles.
- Suppression groupée des modèles sélectionnés.
- Import et export au format JSON.
- Import et export au format CSV avec séparateur point-virgule.
- Compatibilité avec les colonnes du format métier utilisé pour les modèles.
- Inclusion des modèles dans les résultats de recherche.

### Interface mobile et tablette

- Sélecteur de modèles adapté aux téléphones et tablettes.
- Sélecteur d’emplacement parent utilisant le même affichage tactile.
- Panneau de recherche plein écran qui reste visible avec le clavier virtuel.
- Résultats scrollables et actions de fermeture ou d’effacement de la sélection.
- Boutons **Nouvel Emplacement** et **Nouvel Objet** directement dans l’en-tête, à côté de la recherche.
- Après création, fermeture du formulaire sans changement de page, avec actualisation ciblée des données concernées.

### Quantités

- La quantité `0` est autorisée pour les objets et les modèles.
- La quantité par défaut est fixée à `0` dans le frontend et le backend.
- Des migrations SQLite et PostgreSQL assurent la cohérence des valeurs par défaut.

### Journal d’activité

- Ajout d’un menu **Journal** dans la barre latérale.
- Enregistrement des ajouts, modifications et suppressions.
- Conservation de la date, de l’utilisateur, de l’action et de la ressource concernée.
- Présentation des opérations sous forme de phrases lisibles, par exemple `Ajout Objet Serveur-01`.
- Stockage persistant dans la table `audit_logs`.
- Indexation du journal par collection et par date.

### Emplacements

- Présentation des emplacements de premier niveau sous forme de petites tuiles.
- Présentation des sous-emplacements sous forme de liste hiérarchique.
- Bouton escalier sur chaque tuile pour afficher ou masquer les sous-emplacements.
- Sous-emplacements repliés par défaut afin de réduire l’espace utilisé.
- Suppression du bloc Détails/Notes sur les pages d’emplacement.
- Suppression du champ Notes dans le formulaire de modification d’un emplacement.

### Navigation et réglages

- Suppression de la page et du menu Accueil.
- La page Emplacements devient la page affichée après la connexion.
- Les anciennes adresses `/home` sont redirigées vers `/locations`.
- La PWA démarre directement sur `/locations`.
- Menu **Réglages** simplifié :
  - Profil ;
  - Collection ;
  - Utilisateurs pour les administrateurs.
- La rubrique Entretien a été retirée des Réglages.

### Simplification de l’interface

- Suppression du menu Balises et de son utilisation dans les formulaires principaux.
- Suppression de l’interface de gestion des clés API.
- Suppression du menu Types d’entités.
- Création d’objets disponible par défaut sans sélection manuelle d’un type.
- Dans le formulaire **Créer un objet**, suppression de :
  - la description de l’objet ;
  - la photo de l’objet ;
  - l’action Numériser ;
  - l’action Importer un produit.

## Personnalisation administrateur et persistance

- Ajout dans **Profil** d’un avatar administrateur personnalisé.
- Ajout d’un titre d’application personnalisable depuis le profil administrateur.
- Ces paramètres sont conservés dans les réglages persistants du compte et rechargés sur ordinateur, téléphone et tablette.
- Le composable commun `useAdminBranding` centralise le chargement et la sauvegarde du branding.
- La synchronisation des préférences ne remplace plus l’objet complet des paramètres utilisateur : elle récupère d’abord les valeurs serveur et fusionne uniquement les préférences concernées. Cela empêche un navigateur neuf de réinitialiser l’avatar, le titre ou d’autres paramètres persistants.

## Optimisations de performances mobiles

Une passe d’optimisation a été réalisée pour améliorer la réactivité sur smartphones et tablettes sans modifier les fonctions métier.

### Emplacements et chargement global

- Déduplication des requêtes concurrentes `getLocations` et `getTree` dans le store Pinia.
- Le layout global ne recharge plus les emplacements lors de l’ouverture ou du déploiement de la barre latérale.
- L’arbre complet n’est plus téléchargé systématiquement depuis le layout global.
- La page Emplacements peut restituer immédiatement l’arbre présent dans Pinia ou IndexedDB, puis déclencher sa synchronisation serveur.
- Un bouton **Actualiser** permet de forcer uniquement le rafraîchissement de l’arbre des emplacements.
- Les fiches d’emplacements, leurs sous-emplacements et leurs objets disposent d’un cache mémoire de navigation pour accélérer les parcours répétés sur mobile et tablette.
- Lors d’un événement WebSocket, l’arbre affiché n’est plus remis à `null` : les données existantes restent visibles pendant le rafraîchissement.
- Après création d’un objet, les compteurs de l’arbre global et des cartes de sous-emplacements sont mis à jour immédiatement, puis vérifiés avec le serveur.
- Les rafraîchissements rapprochés sont regroupés afin de limiter le trafic API et les recalculs.

### Recherche et objets

- Protection par génération de recherche : une ancienne réponse réseau ne remplace plus les résultats d’une recherche plus récente.
- La liste des modèles utilisée par la recherche est conservée en cache mémoire pendant la vie de la page.
- Temporisation des recherches successives augmentée afin de limiter les requêtes pendant une saisie rapide sur clavier tactile.
- Images des cartes chargées avec `loading="lazy"` et décodées avec `decoding="async"`.
- Pagination de la recherche d’objets disponible dans la vue compacte, avec navigation entre les pages.
- Affichage sous chaque résultat de l’emplacement de l’objet, en utilisant le chemin hiérarchique lorsqu’il est disponible.
- Modification de quantité répercutée immédiatement dans l’affichage et dans le cache de l’emplacement concerné.
- Une modification complète d’un objet invalide le cache de liste afin d’éviter de réafficher des données obsolètes.

### Modèles et journal

- `content-visibility: auto` sur les lignes de modèles et du journal afin que le navigateur puisse différer le rendu des éléments hors écran.
- Le Journal conserve sa pagination de 1 000 opérations par page.
- Les tests d’appartenance aux modèles sélectionnés utilisent un `Set`, évitant les recherches linéaires répétées sur les grandes listes.

### Démarrage et bundle frontend

- L’initialisation OpenTelemetry ne bloque plus le démarrage de Nuxt : la vérification du statut du backend et l’activation OTel sont effectuées après le chargement initial.
- Les principales modales globales ont été converties en composants asynchrones afin de fractionner leur code hors du bundle JavaScript initial.
- Le plugin i18n ne charge plus les 44 fichiers de traduction au démarrage.
- Seuls `fr.json` et `en.json` sont chargés immédiatement ; les autres langues restent disponibles et sont importées dynamiquement lorsqu'elles sont sélectionnées.
- Avant cette optimisation, l’ensemble des fichiers JSON de traduction représentait environ 1,46 Mo de données brutes.

### Cache persistant IndexedDB

- Ajout d'une couche de cache applicatif dans IndexedDB pour conserver les données coûteuses entre deux ouvertures du navigateur ou de la PWA.
- Les clés de cache sont séparées par collection.
- Sont actuellement persistés :
  - la liste des emplacements ;
  - les emplacements parents ;
  - l'arbre d’emplacements sans objets ;
  - la liste des modèles.
- Les données en cache peuvent être utilisées pendant 24 heures maximum.
- Stratégie stale-while-revalidate : le cache local permet un affichage rapide, tandis qu'une requête API actualise ensuite Pinia, l'écran et IndexedDB.
- La page Emplacements restaure l’arbre depuis IndexedDB lorsqu’il existe, puis lance systématiquement un rafraîchissement réseau à chaque visite ; la réponse serveur actualise Pinia, l’écran et IndexedDB.
- La page Modèles restaure également la liste locale avant sa synchronisation serveur.
- Les réponses API ne sont volontairement pas placées dans Cache Storage par le Service Worker : la règle `NetworkOnly` reste active pour `/api`.
- Ce cache n’implémente pas un mode d'écriture hors ligne ; les mutations et l'authentification continuent de nécessiter le serveur.

## GitHub Actions

- Tous les fichiers sous `.github/workflows/` ont été supprimés du fork.
- Les anciens workflows Android/Capacitor ne font plus partie de la branche `main`.
- Aucun build, test, publication Docker ou autre automatisation GitHub Actions n’est actuellement exécuté.
- Après une modification importante, le build et les tests doivent être lancés manuellement avant déploiement.

## Installation avec Docker Compose

Cloner directement la branche personnalisée :

```bash
git clone --branch main https://github.com/canopeegroup/homebox.git
cd homebox
docker compose build --pull
docker compose up -d
```

## Mettre à jour une installation existante

```bash
git fetch origin
git switch main
git pull --ff-only origin main
docker compose down
docker compose build --pull --no-cache
docker compose up -d
```

Contrôler ensuite le démarrage :

```bash
docker compose ps
docker compose logs --tail=100
```

Une actualisation sans cache du navigateur peut être nécessaire après une modification du frontend ou de la PWA.

## Données et sauvegardes

Avant une mise à jour importante, sauvegarder le volume Docker contenant les données et le fichier SQLite `homebox.db`.

Exemples de contrôles SQLite :

```bash
sqlite3 homebox.db "PRAGMA integrity_check;"
sqlite3 homebox.db "PRAGMA foreign_key_check;"
sqlite3 homebox.db "PRAGMA optimize;"
```

Lancer `VACUUM` uniquement après l’arrêt de HomeBox et après avoir créé une copie de sauvegarde de la base.

## Compatibilité avec le projet officiel

Les personnalisations sont maintenues directement sur la branche `main` du fork. L’objectif reste de pouvoir intégrer régulièrement les mises à jour de `sysadminsmedia/homebox` en contrôlant les conflits.

Lors d’une synchronisation avec le dépôt officiel :

1. sauvegarder la base et le volume de données ;
2. récupérer les nouvelles versions du dépôt officiel ;
3. fusionner ou rebaser les changements officiels dans la branche `main` du fork ;
4. résoudre les éventuels conflits dans le frontend, les routes API et les migrations ;
5. reconstruire l’image Docker et tester les migrations sur une copie de la base.

Les modifications du schéma utilisent des migrations séparées pour SQLite et PostgreSQL afin de rester compatibles avec les deux moteurs pris en charge par HomeBox.

## Projet d’origine

- Projet officiel : [sysadminsmedia/homebox](https://github.com/sysadminsmedia/homebox)
- Fork : [canopeegroup/homebox](https://github.com/canopeegroup/homebox)
- Licence : identique à celle du projet HomeBox d’origine.

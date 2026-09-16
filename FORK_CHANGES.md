# Fork HomeBox de Canopee

Ce dépôt est un fork personnalisé de [sysadminsmedia/homebox](https://github.com/sysadminsmedia/homebox), adapté à une gestion d’inventaire simplifiée et orientée vers les objets, les modèles et les emplacements.

Les développements personnalisés sont publiés sur la branche Main

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

### Sélecteurs mobiles

- Sélecteur de modèles adapté aux téléphones et tablettes.
- Sélecteur d’emplacement parent utilisant le même affichage tactile.
- Panneau de recherche plein écran qui reste visible avec le clavier virtuel.
- Résultats scrollables et actions de fermeture ou d’effacement de la sélection.

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
- Ajout d’un menu **Réglages** regroupant :
  - Entretien ;
  - Profil ;
  - Collection.

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

## Installation avec Docker Compose

Cloner directement la branche personnalisée :

```bash
git clone --branch feature/template-import-export https://github.com/canopeegroup/homebox.git
cd homebox
docker compose build --pull
docker compose up -d
```

## Mettre à jour une installation existante

```bash
git fetch origin
git switch feature/template-import-export
git pull --ff-only origin feature/template-import-export
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

L’objectif est de conserver les personnalisations sur une branche dédiée afin de pouvoir intégrer régulièrement les mises à jour de `sysadminsmedia/homebox`.

Lors d’une synchronisation avec le dépôt officiel :

1. sauvegarder la base et le volume de données ;
2. récupérer les nouvelles versions du dépôt officiel ;
3. fusionner ou rebaser la branche personnalisée ;
4. résoudre les éventuels conflits dans le frontend, les routes API et les migrations ;
5. reconstruire l’image Docker et tester les migrations sur une copie de la base.

Les modifications du schéma utilisent des migrations séparées pour SQLite et PostgreSQL afin de rester compatibles avec les deux moteurs pris en charge par HomeBox.

## Projet d’origine

- Projet officiel : [sysadminsmedia/homebox](https://github.com/sysadminsmedia/homebox)
- Fork : [canopeegroup/homebox](https://github.com/canopeegroup/homebox)
- Licence : identique à celle du projet HomeBox d’origine.

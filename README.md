<div align="center">
  <img src="/docs/src/assets/lilbox.svg" height="200"/>
</div>

<h1 align="center" style="margin-top: -10px;"> HomeBox </h1>

> [!IMPORTANT]
> Ceci est le fork personnalisé de HomeBox maintenu par **leroyconstant**.
> Les différences avec le projet officiel, les instructions Docker et la stratégie de mise à jour sont détaillées dans [FORK_CHANGES.md](FORK_CHANGES.md).

## Personnalisations du fork

Les changements ci-dessous sont disponibles sur la branche `feature/template-import-export`.
Le dépôt conserve les sources du projet officiel ; les fonctionnalités et captures officielles
présentées plus bas ne reflètent donc pas nécessairement cette interface personnalisée.

### Modèles et recherche

- Vue exclusivement en liste compacte, avec une police réduite.
- Sélection individuelle ou de tous les modèles et suppression groupée.
- Import et export JSON et CSV avec séparateur point-virgule.
- Les modèles sont inclus dans les résultats de recherche.
- Quantité `0` autorisée et utilisée par défaut pour les objets et les modèles.

### Création et fiches des objets

- Sélection du modèle via le champ **Sélection Produit**.
- Sélecteurs Produit et Emplacement Parent adaptés aux téléphones, aux tablettes et au clavier tactile.
- Correction de la recherche dans les sélecteurs et des soumissions involontaires lors d’une sélection.
- Réinitialisation du produit et de l’emplacement après chaque création, avec notification de confirmation.
- Traduction en français des libellés des formulaires concernés.
- Suppression de la description, de la photo, de Numériser et d’Importer un produit dans le formulaire de création.
- Suppression des champs Assuré et Archivé de la fiche et du formulaire de modification ; les données existantes sont conservées.
- Suppression du bouton Afficher Vide et de l’onglet Entretien de la fiche.
- Suppression des actions Étiquettes, Télécharger l’étiquette, Imprimer et QR Code en haut de la fiche.
- Suppression du bouton de numérisation/QR Code dans l’en-tête global, en haut à droite.

### Emplacements et navigation

- Dans une fiche d’emplacement, les sous-emplacements sont affichés avant les articles.
- Fiches d’emplacement : retrait des actions Étiquettes, téléchargement, impression et QR Code.
- Objets d’un emplacement en petites tuiles sans photo, avec nom et quantité, sans choix Carte/Tableau ;
  pagination et sélection groupée conservées.
- Emplacements de premier niveau en petites tuiles ; sous-emplacements en liste hiérarchique.
- Bouton escalier pour afficher ou masquer les sous-emplacements, repliés par défaut.
- Retrait des blocs Détails/Notes des pages d’emplacement et simplification des formulaires Description/Photo.
- Aucun emplacement de démonstration créé automatiquement pour les nouveaux comptes, y compris OIDC.
  Les emplacements déjà présents ne sont pas supprimés.
- La page Emplacements remplace l’accueil après connexion ; les anciennes adresses d’accueil sont redirigées.
- Menu **Réglages** regroupant Entretien, Profil, Collection et, pour les administrateurs, Utilisateurs.
- Descriptions distinctes pour chaque module de Réglages.
- Retrait des menus Balises, Clés API et Types d’entités ; création d’objets disponible par défaut.
  Ces retraits d’interface ne constituent pas une suppression de toutes les API correspondantes.

### Utilisateurs et collections

- Sur une base vide, formulaire automatique de création du premier administrateur.
  Après initialisation, l’inscription publique est fermée côté serveur et le bouton S’enregistrer est masqué.
  Les comptes supplémentaires sont créés dans Réglages → Utilisateurs par un administrateur.
  Les comptes existants sont conservés ; l’initialisation locale nécessite que la connexion locale soit activée.
- Connexion avec le courriel ou le nom du profil, sans distinction de casse ; mot de passe inchangé.
  En cas de noms identiques, utiliser le courriel. Une correspondance de courriel reste prioritaire.
- Premier utilisateur administrateur de la solution ; sur une installation existante sans administrateur,
  une migration promeut le compte le plus ancien.
- Gestion des comptes dans **Réglages → Utilisateurs** : ajout, modification, suppression,
  changement facultatif du mot de passe et attribution du statut Administrateur.
- Routes d’administration protégées côté serveur.
- Protection contre la suppression de son propre compte depuis ce module et contre la suppression
  ou la rétrogradation du dernier administrateur.
- Retrait des boutons Invitations et Notifiants du module Collection.
- Paramètres et Outils visibles uniquement pour le propriétaire de la collection.
  Le renommage reste protégé côté serveur par le droit de propriété de la collection.
- Les droits d’administration globale et de propriété d’une collection sont distincts.
- Devise EUR par défaut pour les nouvelles collections ; migration des collections existantes vers EUR.

### Journal d’activité

- Journal persistant par collection, avec date, utilisateur, action, ressource et nombre d’éléments concernés.
- Opérations présentées sous forme de phrases lisibles ; détection de certains traitements groupés.
- Historique conservé sans suppression automatique liée à la limite d’affichage.
- Pagination de 1 000 opérations, compteur total et navigation entre pages.
- Export CSV UTF-8 avec séparateur point-virgule, récupérant toutes les pages de la collection sélectionnée.
- Tri stable par date et identifiant, et indexation du journal par collection et date.

### Actualisation de l’affichage

- Actualisation après les écritures réussies dans l’interface, en complément des événements WebSocket.
- Rafraîchissement des données des pages, des arbres d’emplacement et des résultats de recherche.
- Regroupement des rafraîchissements rapprochés et traitement du dernier événement WebSocket d’une série.
- Correction du client mis en cache dans le magasin d’emplacements pour utiliser la collection courante.
- Ces corrections ont passé le lint des fichiers frontend concernés ; leur validation fonctionnelle
  complète sur téléphone, tablette et installation Docker reste nécessaire.

### Déployer et mettre à jour ce fork

L’image officielle `ghcr.io/sysadminsmedia/homebox` ne contient pas ces personnalisations.
Construire l’image à partir de la branche du fork :

```bash
git clone --branch feature/template-import-export https://github.com/leroyconstant/homebox.git
cd homebox
docker compose build --no-cache
docker compose up -d
```

Pour mettre à jour un clone déjà installé :

```bash
git fetch origin
git switch feature/template-import-export
git pull --ff-only origin feature/template-import-export
docker compose build --no-cache
docker compose up -d
docker compose logs --tail=100 homebox
```

Sauvegarder les données avant chaque mise à jour importante. Utiliser un volume nommé ou un montage
persistant explicite pour `/data`, qui contient notamment la base SQLite et les fichiers joints.
Ne pas utiliser `docker compose down --volumes` pour une mise à jour : cette option supprime les volumes
du projet. Les montages de dossiers hôtes ne sont pas effacés par cette commande.
Les migrations de base sont appliquées au démarrage. Une actualisation sans cache du navigateur
peut être nécessaire après la reconstruction du frontend.

La branche dédiée facilite l’intégration des changements officiels, mais cette compatibilité nécessite
de résoudre les conflits et de tester les migrations sur une copie des données ; elle n’est pas automatique.

<p align="center" style="width: 100%;">
   <a href="https://homebox.software/en/">Docs</a>
   |
   <a href="https://demo.homebox.software">Demo</a>
   |
   <a href="https://discord.gg/aY4DCkpNA9">Discord</a>
</p>
<p align="center" style="width: 100%;">
    <img src="https://img.shields.io/github/check-runs/sysadminsmedia/homebox/main" alt="Github Checks"/>
    <img src="https://img.shields.io/github/license/sysadminsmedia/homebox"/>
    <img src="https://img.shields.io/github/v/release/sysadminsmedia/homebox?sort=semver&display_name=release"/>
    <img src="https://img.shields.io/weblate/progress/homebox?server=https%3A%2F%2Ftranslate.sysadminsmedia.com"/>
</p>
<p align="center" style="width: 100%;">
    <img src="https://img.shields.io/reddit/subreddit-subscribers/homebox"/>
    <img src="https://img.shields.io/mastodon/follow/110749314839831923?domain=infosec.exchange"/>
    <img src="https://img.shields.io/lemmy/homebox%40lemmy.world?label=lemmy"/>
</p>
<p align="center" style="width: 100%;">
  <a href="https://www.pikapods.com/pods?run=homebox"><img src="https://www.pikapods.com/static/run-button.svg"/></a>
</p>

## What is HomeBox

HomeBox is the inventory and organization system built for the Home User! With a focus on simplicity and ease of use, Homebox is the perfect solution for your home inventory, organization, and management needs. While developing this project, We've tried to keep the following principles in mind:

- 🧘 _Simple but Expandable_ - Homebox is designed to be simple and easy to use. No complicated setup or configuration required. But expandable to whatever level of infrastructure you want to put into it.
- 🚀 _Blazingly Fast_ - Homebox is written in Go, which makes it extremely fast and requires minimal resources to deploy. In general, idle memory usage is less than 50MB for the whole container.
- 📦 _Portable_ - Homebox is designed to be portable and run on anywhere. We use SQLite and an embedded Web UI to make it easy to deploy, use, and backup.

### Key Features
- 📇 Rich Organization - Organize your items into categories, locations, and tags. You can also create custom fields to store additional information about your items.
- 🔍 Powerful Search - Quickly find items in your inventory using the powerful search feature.
- 📸 Image Upload - Upload images of your items to make it easy to identify them.
- 📄 Document and Warranty Tracking - Keep track of important documents and warranties for your items.
- 💰 Purchase & Maintenance Tracking - Track purchase dates, prices, and maintenance schedules for your items.
- 📱 Responsive Design - Homebox is designed to work on any device, including desktops, tablets, and smartphones.

## Screenshots
![Login Screen](.github/screenshots/1.png)
![Dashboard](.github/screenshots/2.png)
![Item View](.github/screenshots/3.png)
![Create Item](.github/screenshots/9.png)
![Search](.github/screenshots/8.png)

You can also try the demo instances of Homebox:
- [Demo](https://demo.homebox.software)
- [Nightly](https://nightly.homebox.software)

## Quick Start

[Configuration & Docker Compose](https://homebox.software/en/quick-start/)

```bash
# Save pepper to local file
openssl rand -base64 48 > hbox.pepper
chmod 400 hbox.pepper
# If using the rootless or hardened image, ensure data 
# folder has correct permissions
mkdir -p /path/to/data/folder
chown 65532:65532 -R /path/to/data/folder
docker run -d \
  --name homebox \
  --restart unless-stopped \
  --publish 3100:7745 \
  --env TZ=Europe/Bucharest \
  --env HBOX_AUTH_API_KEY_PEPPER=$(cat hbox.pepper) \
  --volume /path/to/data/folder/:/data \
  ghcr.io/sysadminsmedia/homebox:latest
# ghcr.io/sysadminsmedia/homebox:latest-rootless
# ghcr.io/sysadminsmedia/homebox:latest-hardened
```

<!-- CONTRIBUTING -->

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

To get started with code based contributions, please see our [contributing guide](https://homebox.software/en/contribute/).

If you are not a coder and can't help translate, you can still contribute financially. Financial contributions help us maintain the project and keep demos running.

## Help us Translate
We want to make sure that Homebox is available in as many languages as possible. If you are interested in helping us translate Homebox, please help us via our [Weblate instance](https://translate.sysadminsmedia.com/projects/homebox/).

[![Translation status](https://translate.sysadminsmedia.com/widget/homebox/multi-auto.svg)](https://translate.sysadminsmedia.com/engage/homebox/)

## Credits
- Original project by [@hay-kot](https://github.com/hay-kot)
- Logo by [@lakotelman](https://github.com/lakotelman)

### Contributors
<a href="https://github.com/sysadminsmedia/homebox/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=sysadminsmedia/homebox" />
</a>

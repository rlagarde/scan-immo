# Décisions techniques — DVF Dashboard

## 1. Choix de la stack

### Contraintes du projet

- **PWA** : installable sur smartphone, utilisable offline → impose un vrai frontend web (pas de Streamlit/Gradio/Panel)
- **Pas de serveur** : données publiques, pas d'auth → on peut tout faire côté client
- **Volume de données** : ~200k lignes pour 2 depts sur 5 ans → gérable côté navigateur
- **Cartographie** : géolocalisation des transactions → besoin d'une lib carto performante

### Alternatives considérées

#### Framework frontend

| Option | Pour | Contre | Verdict |
|--------|------|--------|---------|
| **Next.js (React)** | Écosystème immense, SSG pour le shell PWA, excellent support PWA, déploiement trivial sur Vercel | Plus lourd qu'un framework léger | **Retenu** |
| **Nuxt (Vue)** | Aussi mature, bon SSG | Écosystème carto/data moins riche côté Vue | Viable |
| **SvelteKit** | Plus léger, très performant, syntaxe simple | Écosystème plus petit, moins de composants UI prêts à l'emploi | Viable mais plus risqué |
| **Astro** | Excellent pour du contenu statique, multi-framework | Moins adapté pour une app interactive lourde (dashboard) | Non retenu |

#### Moteur de données côté client

| Option | Pour | Contre | Verdict |
|--------|------|--------|---------|
| **DuckDB-WASM** | SQL complet sur Parquet dans le navigateur, très rapide (columnar), gère des millions de lignes | WASM = ~5 MB de téléchargement initial | **Retenu** |
| **Arquero** | Léger (~50 KB), API style dplyr en JS | Pas de SQL, moins performant sur gros volumes | Non retenu |
| **pandas (backend)** | Familier en Python | Impose un serveur → pas de PWA offline | Non retenu |
| **Données pré-agrégées en JSON** | Ultra léger, pas de lib | Perd la flexibilité (filtres dynamiques impossibles) | Non retenu |

DuckDB-WASM est le choix clé du projet : il permet de faire des requêtes SQL complexes (GROUP BY commune, filtres croisés, percentiles...) directement dans le navigateur, sur des fichiers Parquet servis en statique. Zéro backend, zéro API, offline-capable.

#### Cartographie

| Option | Pour | Contre | Verdict |
|--------|------|--------|---------|
| **MapLibre GL JS** | Open source, rendu WebGL, tuiles vectorielles, très fluide | API un peu plus bas niveau | **Retenu** |
| **Leaflet** | Simple, bien documenté, léger | Rendu raster (moins fluide), clusters moins performants sur gros volumes | Non retenu |
| **Mapbox GL JS** | Très puissant, beau rendu | Propriétaire, clé API obligatoire, coût au-delà du tier gratuit | Non retenu |
| **Deck.gl** | Rendu GPU, millions de points | Overkill pour notre volume, complexité d'intégration | Non retenu |

MapLibre est un fork open source de Mapbox GL — mêmes performances, sans les restrictions de licence ni les coûts.

#### UI / composants

| Option | Pour | Contre | Verdict |
|--------|------|--------|---------|
| **shadcn/ui + Tailwind** | Composants copiés dans le projet (pas de dépendance), accessibles, responsive, personnalisables | Setup initial un peu plus long | **Retenu** |
| **Material UI** | Complet, familier | Lourd (~300 KB), style très "Google", difficile à personnaliser | Non retenu |
| **Ant Design** | Très complet pour les dashboards | Lourd, style moins moderne | Non retenu |
| **Radix + CSS custom** | Primitives accessibles | Plus de travail de styling | Viable |

shadcn/ui n'est pas une librairie — ce sont des composants copiés localement qu'on possède et modifie librement. Basé sur Radix (accessibilité) + Tailwind (styling utilitaire, responsive mobile-first).

#### Graphiques

| Option | Pour | Contre | Verdict |
|--------|------|--------|---------|
| **Recharts** | Simple, bien intégré React, responsive | Moins flexible pour des charts exotiques | **Retenu** |
| **Observable Plot** | Concis, grammaire des graphiques | Intégration React moins directe | Alternative viable |
| **Chart.js** | Léger, populaire | API impérative, moins naturel en React | Non retenu |
| **D3.js** | Puissance totale | Bas niveau, beaucoup de code pour un simple bar chart | Non retenu |

#### Pipeline de données (Python)

| Option | Pour | Contre | Verdict |
|--------|------|--------|---------|
| **DuckDB (Python)** | SQL direct sur CSV, export Parquet natif, ultra rapide | Moins de docs que pandas | **Retenu** |
| **Polars** | Très rapide, API moderne | Un outil de plus à apprendre | Alternative viable |
| **pandas** | Universel, bien connu | Plus lent, API parfois confuse | Non retenu (overkill inversé) |

DuckDB côté Python aussi : on utilise le même moteur des deux côtés. Un simple script SQL lit les CSV, nettoie, et exporte en Parquet.

### Stack finale retenue

```
┌─────────────────────────────────────────────────┐
│                   PIPELINE (Python)              │
│  CSV DVF (Etalab) → DuckDB → Parquet optimisé   │
└──────────────────────┬──────────────────────────┘
                       │ fichiers .parquet
                       ▼
┌─────────────────────────────────────────────────┐
│              FRONTEND (Next.js PWA)              │
│                                                  │
│  ┌───────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ shadcn/ui │  │ Recharts │  │ MapLibre GL  │  │
│  │ Tailwind  │  │          │  │ react-map-gl │  │
│  └───────────┘  └──────────┘  └──────────────┘  │
│                      │                           │
│              ┌───────┴───────┐                   │
│              │  DuckDB-WASM  │                   │
│              │  (SQL sur     │                   │
│              │   Parquet)    │                   │
│              └───────────────┘                   │
│                                                  │
│  Service Worker (PWA offline)                    │
└─────────────────────────────────────────────────┘
                       │
                       ▼
              Vercel / GitHub Pages
```

---

## 2. Style de carte (tuiles)

| Style | Aperçu | Avantages | Inconvénients | Coût |
|-------|--------|-----------|---------------|------|
| **OSM Classique** | Carte colorée type Google Maps | Familier, riche en détails (routes, bâtiments, POIs) | Visuellement chargé, les données DVF se noient dans le bruit | Gratuit |
| **Carto Positron** (clair) | Fond blanc/gris épuré | Excellent contraste pour les données, look pro et moderne | Moins de repères visuels pour se situer | Gratuit (CARTO) |
| **Carto Dark Matter** (sombre) | Fond noir | Très esthétique, points de données très visibles | Peut fatiguer les yeux en usage prolongé, moins lisible en extérieur sur mobile | Gratuit (CARTO) |
| **Stadia Alidade Smooth** | Fond pastel doux | Bon compromis lisibilité/esthétique | Nécessite une clé API (gratuit jusqu'à 200k tiles/mois) | Freemium |

**Recommandation** : **Carto Positron** — c'est le standard des dashboards data. Fond neutre qui met en valeur les points colorés (transactions). Parfait pour un usage mobile en extérieur (bonne lisibilité au soleil). On peut facilement ajouter un toggle clair/sombre plus tard.

### Visualisation des transactions sur la carte

| Mode | Description | Adapté pour |
|------|-------------|-------------|
| **Cercles colorés** | Un point par transaction, couleur = prix/m² (gradient bleu→rouge) | Voir chaque transaction, idéal quand on zoome |
| **Clusters** | Regroupe les points proches, affiche le nombre | Vue dézoomée, évite la surcharge visuelle |
| **Heatmap** | Densité colorée, zones chaudes/froides | Visualiser les zones de forte activité |
| **Combo clusters + cercles** | Clusters au dézoom, cercles au zoom | Meilleure UX globale |

**Recommandation** : **Combo clusters + cercles colorés** — clusters quand on voit tout le département, puis cercles individuels colorés par prix/m² quand on zoome sur une commune.

---

## 3. Déploiement : Vercel vs GitHub Pages

| Critère | Vercel | GitHub Pages |
|---------|--------|--------------|
| **Setup** | Connecter le repo GitHub, auto-deploy | Configurer GitHub Actions pour le build |
| **Build** | Build côté Vercel (rien à configurer) | Build via GitHub Actions, deploy l'artifact |
| **HTTPS** | Automatique | Automatique |
| **Domaine custom** | Oui, gratuit | Oui, gratuit |
| **URL par défaut** | `projet.vercel.app` | `user.github.io/projet` |
| **Preview deployments** | Oui (chaque PR = une URL preview) | Non (sauf config manuelle) |
| **Limites gratuites** | 100 GB bandwidth/mois, 6000 min build/mois | 1 GB stockage, 100 GB bandwidth/mois |
| **SSR / API Routes** | Oui (serverless functions) | Non (statique uniquement) |
| **Coût** | Gratuit (plan Hobby) | Gratuit |

### Impact sur le projet

- **Vercel** : on garde Next.js tel quel, tout fonctionne out of the box. Si un jour on veut ajouter un backend léger (API route pour un proxy de données, auth...), c'est possible sans changer de stack.
- **GitHub Pages** : il faut exporter le site en statique (`next export` / `output: 'export'`). Pas de SSR, pas d'API routes. Pour notre cas (données Parquet chargées côté client via DuckDB-WASM), **c'est suffisant** — on n'a pas besoin de backend.

**Recommandation** : **Vercel** — setup plus simple, preview deployments très pratiques pendant le dev, et on garde la porte ouverte pour des fonctionnalités serveur si besoin. Mais GitHub Pages est tout à fait viable si tu veux rester 100% sur GitHub.

---

## 4. Résumé des choix

| Décision | Choix retenu |
|----------|-------------|
| Données | DVF 2020-2025, depts 40 + 64 |
| Types de biens | Maisons, Appartements, Terrains |
| Package manager | npm (déjà installé) |
| Node | v22.17 |
| Python | 3.13 |
| Tuiles carte | Carto Positron (clair) |
| Visu carte | Clusters + cercles colorés par prix/m² |
| Déploiement | Vercel |
| Langue UI | Français |

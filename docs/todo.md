# TODO — scan-immo

Backlog des idées et améliorations. Voir `decisions.md` pour les choix d'architecture actés.

## UX / Frontend

- [x] **Multi-sélection commune via la carte : la rendre explicite.** _(fait 2026-06-07)_
  - Barre d'aide rassemblée avec la carte (overlay bas, icône curseur).
  - Texte adapté à la sélection multiple et au toggle : « Cliquez sur la carte pour
    filtrer une ou plusieurs communes », au survol « X — cliquer pour ajouter/retirer »,
    et compteur « N sélectionnées — cliquez-en d'autres pour les ajouter ».
  - Chips retirables (×) des communes sélectionnées sous la carte.
  Fichier : `frontend/src/components/map/commune-picker.tsx`.

## Données / Pipeline

- [ ] **Réintégrer les années plus anciennes** sortant de la fenêtre glissante geo-dvf
  au fil du temps (mécanisme d'archive déjà en place, cf. `pipeline/archive/`).

## Grand chantier

- [ ] **Couverture nationale (96 départements).** Plan détaillé en mémoire Claude
  (`project_all_departments.md`) : un parquet par département, sélecteur unique,
  chargement dynamique, GeoJSON communes par dept, cache PWA. 6 questions ouvertes
  à trancher avant implémentation.

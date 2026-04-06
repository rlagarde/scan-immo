"""
Pipeline DVF : télécharge les CSV géolocalisés et exporte en Parquet optimisé.
Départements 40 (Landes) et 64 (Pyrénées-Atlantiques), années 2018-2025.

Deux sources combinées :
- 2020-2025 : geo-dvf Etalab "latest" (à jour mensuellement)
- 2018-2019 : dataset "Compilation DVF par département" (snapshot 2023-05, gelé)

Agrégation par id_mutation (une ligne par vente) :
- type_local dérivé par priorité : Maison > Appartement > Terrain
- surfaces et pièces sommées
- nb_batis pour détecter les ventes promoteurs (vente_multiple)
- nature_culture pour les terrains
"""

import duckdb
import os
import sys

DEPARTMENTS = ["33", "40", "64"]
GEO_YEARS = range(2020, 2026)
GEO_URL = "https://files.data.gouv.fr/geo-dvf/latest/csv/{year}/departements/{dep}.csv.gz"

# Dataset "Compilation DVF par département" (snapshot 2023-05-05, couvre 2018-2022)
# On l'utilise uniquement pour 2018-2019 (geo-dvf couvre 2020+)
COMPILATION_URLS = {
    "33": "https://static.data.gouv.fr/resources/compilation-des-donnees-de-valeurs-foncieres-dvf-par-departement/20230505-170440/dvf-33.csv",
    "40": "https://static.data.gouv.fr/resources/compilation-des-donnees-de-valeurs-foncieres-dvf-par-departement/20230505-170401/dvf-40.csv",
    "64": "https://static.data.gouv.fr/resources/compilation-des-donnees-de-valeurs-foncieres-dvf-par-departement/20230505-170215/dvf-64.csv",
}
COMPILATION_YEARS = {"2018", "2019"}

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "data")

# Colonnes extraites de chaque source (identiques dans les deux schémas)
COMMON_COLS = [
    "id_mutation", "date_mutation", "nature_mutation", "valeur_fonciere",
    "code_postal", "code_commune", "nom_commune", "code_departement",
    "type_local", "surface_reelle_bati", "nombre_pieces_principales",
    "nature_culture", "surface_terrain", "longitude", "latitude",
]


def run_pipeline():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output_path = os.path.join(OUTPUT_DIR, "dvf.parquet")

    con = duckdb.connect()

    # Activer le téléchargement HTTP
    con.execute("INSTALL httpfs; LOAD httpfs;")

    cols_select = ", ".join(COMMON_COLS)

    # Source 1 : geo-dvf (2020-2025), un fichier par (dep, year), gzip
    geo_parts = []
    for year in GEO_YEARS:
        for dep in DEPARTMENTS:
            url = GEO_URL.format(year=year, dep=dep)
            geo_parts.append(
                f"SELECT {cols_select} FROM read_csv_auto('{url}', "
                f"compression='gzip', all_varchar=true, header=true, ignore_errors=true)"
            )

    # Source 2 : compilation par dept (2018-2022), un fichier par dep, CSV non compressé
    # On filtre sur les années 2018-2019 uniquement (les autres sont déjà dans geo-dvf)
    compilation_years_sql = ", ".join(f"'{y}'" for y in sorted(COMPILATION_YEARS))
    compilation_parts = []
    for dep, url in COMPILATION_URLS.items():
        compilation_parts.append(
            f"SELECT {cols_select} FROM read_csv_auto('{url}', "
            f"all_varchar=true, header=true, ignore_errors=true) "
            f"WHERE annee IN ({compilation_years_sql})"
        )

    all_parts = geo_parts + compilation_parts
    print(f"Téléchargement de {len(all_parts)} sources CSV...")

    union_query = " UNION ALL ".join(all_parts)

    # Nettoyage et typage
    transform_query = f"""
    CREATE OR REPLACE TABLE dvf_raw AS
    SELECT * FROM ({union_query});
    """

    print("Chargement des données brutes...")
    con.execute(transform_query)

    row_count = con.execute("SELECT COUNT(*) FROM dvf_raw").fetchone()[0]
    print(f"  -> {row_count} lignes brutes chargées")

    # Nettoyage : sélection des colonnes utiles, typage, filtrage
    # On garde bâtis ET terrains dans la même table
    print("Nettoyage et transformation...")
    con.execute("""
    CREATE OR REPLACE TABLE dvf_clean AS
    SELECT
        id_mutation,
        TRY_CAST(date_mutation AS DATE) AS date_mutation,
        TRY_CAST(valeur_fonciere AS DOUBLE) AS valeur_fonciere,
        code_postal,
        nom_commune,
        code_departement,
        code_commune,
        COALESCE(NULLIF(TRIM(type_local), ''), 'Terrain') AS type_local,
        TRY_CAST(surface_reelle_bati AS DOUBLE) AS surface_reelle_bati,
        TRY_CAST(nombre_pieces_principales AS INTEGER) AS nombre_pieces_principales,
        TRY_CAST(surface_terrain AS DOUBLE) AS surface_terrain,
        TRY_CAST(longitude AS DOUBLE) AS longitude,
        TRY_CAST(latitude AS DOUBLE) AS latitude,
        YEAR(TRY_CAST(date_mutation AS DATE)) AS annee,
        NULLIF(TRIM(nature_culture), '') AS nature_culture
    FROM dvf_raw
    WHERE
        nature_mutation = 'Vente'
        AND TRY_CAST(valeur_fonciere AS DOUBLE) >= 500
        AND TRY_CAST(longitude AS DOUBLE) IS NOT NULL
        AND TRY_CAST(latitude AS DOUBLE) IS NOT NULL
        AND (
            -- Bâtis principaux + dépendances (garage, cave, etc.)
            type_local IN ('Maison', 'Appartement', 'Dépendance')
            -- Terrains (pas de type_local, mais surface > 0)
            OR (
                (type_local IS NULL OR TRIM(type_local) = '')
                AND TRY_CAST(surface_terrain AS DOUBLE) > 0
            )
        )
    """)

    clean_count = con.execute("SELECT COUNT(*) FROM dvf_clean").fetchone()[0]
    print(f"  -> {clean_count} lignes nettoyées")

    # Agrégation par id_mutation (une ligne par vente)
    print("Agrégation par mutation...")
    con.execute("""
    CREATE OR REPLACE TABLE dvf_final AS
    WITH agg AS (
        SELECT
            id_mutation,
            FIRST(date_mutation) AS date_mutation,
            -- valeur_fonciere est identique pour toutes les lignes d'une mutation
            MAX(valeur_fonciere) AS valeur_fonciere,
            FIRST(code_postal) AS code_postal,
            MODE() WITHIN GROUP (ORDER BY nom_commune) AS nom_commune,
            MODE() WITHIN GROUP (ORDER BY code_departement) AS code_departement,
            MODE() WITHIN GROUP (ORDER BY code_commune) AS code_commune,
            -- Type principal : Maison > Appartement > Terrain
            CASE
                WHEN COUNT(*) FILTER (WHERE type_local = 'Maison') > 0 THEN 'Maison'
                WHEN COUNT(*) FILTER (WHERE type_local = 'Appartement') > 0 THEN 'Appartement'
                ELSE 'Terrain'
            END AS type_local,
            SUM(surface_reelle_bati) AS surface_reelle_bati,
            SUM(nombre_pieces_principales)::INTEGER AS nombre_pieces_principales,
            SUM(surface_terrain) AS surface_terrain,
            AVG(longitude) AS longitude,
            AVG(latitude) AS latitude,
            FIRST(annee) AS annee,
            -- Nombre total de lots dans la mutation
            COUNT(*)::INTEGER AS nb_lots,
            -- Nombre de bâtis principaux dans la mutation
            COUNT(*) FILTER (WHERE type_local IN ('Maison', 'Appartement'))::INTEGER AS nb_batis,
            -- nature_culture : priorité "terrains à bâtir" si présent dans la mutation
            COALESCE(
                FIRST(nature_culture) FILTER (WHERE nature_culture = 'terrains à bâtir'),
                FIRST(nature_culture) FILTER (WHERE nature_culture IS NOT NULL)
            ) AS nature_culture
        FROM dvf_clean
        GROUP BY id_mutation
    )
    SELECT
        id_mutation,
        date_mutation,
        valeur_fonciere,
        code_postal,
        nom_commune,
        code_departement,
        code_commune,
        type_local,
        surface_reelle_bati,
        nombre_pieces_principales,
        surface_terrain,
        longitude,
        latitude,
        annee,
        nb_lots,
        nb_batis,
        -- Vente multiple : plusieurs bâtis principaux OU (terrain avec 4+ parcelles)
        -- Terrains : 2-3 parcelles attenantes = vente normale entre particuliers
        CASE
            WHEN type_local IN ('Maison', 'Appartement') THEN nb_batis > 1
            ELSE nb_lots > 3
        END AS vente_multiple,
        nature_culture,
        -- Prix au m²
        CASE
            WHEN type_local IN ('Maison', 'Appartement') AND surface_reelle_bati > 0
                THEN ROUND(valeur_fonciere / surface_reelle_bati, 0)
            WHEN type_local = 'Terrain' AND surface_terrain > 0
                THEN ROUND(valeur_fonciere / surface_terrain, 0)
            ELSE NULL
        END AS prix_m2
    FROM agg
    """)

    final_count = con.execute("SELECT COUNT(*) FROM dvf_final").fetchone()[0]
    print(f"  -> {final_count} mutations uniques")

    # Stats rapides
    stats = con.execute("""
    SELECT
        type_local,
        COUNT(*) AS nb_total,
        COUNT(*) FILTER (WHERE NOT vente_multiple) AS nb_simple,
        COUNT(*) FILTER (WHERE vente_multiple) AS nb_multiple,
        ROUND(MEDIAN(valeur_fonciere) FILTER (WHERE NOT vente_multiple), 0) AS prix_median_simple,
        ROUND(MEDIAN(prix_m2) FILTER (WHERE NOT vente_multiple), 0) AS prix_m2_median_simple
    FROM dvf_final
    GROUP BY type_local
    ORDER BY nb_total DESC
    """).fetchdf()
    print("\nStats par type de bien :")
    print(stats.to_string(index=False))

    # Export Parquet
    con.execute(f"""
    COPY dvf_final TO '{output_path.replace(os.sep, '/')}'
    (FORMAT PARQUET, COMPRESSION ZSTD)
    """)

    file_size = os.path.getsize(output_path) / (1024 * 1024)
    print(f"\nExport : {output_path} ({file_size:.1f} MB)")

    con.close()


if __name__ == "__main__":
    run_pipeline()

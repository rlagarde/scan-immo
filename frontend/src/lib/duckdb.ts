import * as duckdb from "@duckdb/duckdb-wasm";

let db: duckdb.AsyncDuckDB | null = null;
let initPromise: Promise<duckdb.AsyncDuckDB> | null = null;

export async function getDB(): Promise<duckdb.AsyncDuckDB> {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Use jsdelivr CDN for DuckDB WASM bundles (not bundled in git/deploy)
    const CDN = "https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.33.1-dev20.0/dist";
    const DUCKDB_BUNDLES = await duckdb.selectBundle({
      mvp: {
        mainModule: `${CDN}/duckdb-mvp.wasm`,
        mainWorker: `${CDN}/duckdb-browser-mvp.worker.js`,
      },
      eh: {
        mainModule: `${CDN}/duckdb-eh.wasm`,
        mainWorker: `${CDN}/duckdb-browser-eh.worker.js`,
      },
    });

    const logger = new duckdb.ConsoleLogger();
    // Create worker via blob URL to bypass cross-origin restrictions with COEP
    const workerUrl = DUCKDB_BUNDLES.mainWorker!;
    const workerScript = await fetch(workerUrl).then((r) => r.text());
    const blob = new Blob([workerScript], { type: "application/javascript" });
    const worker = new Worker(URL.createObjectURL(blob));
    db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(DUCKDB_BUNDLES.mainModule);

    return db;
  })();

  return initPromise;
}

export interface DvfRow {
  id_mutation: string;
  date_mutation: string;
  valeur_fonciere: number;
  code_postal: string;
  nom_commune: string;
  code_departement: string;
  code_commune: string;
  type_local: string;
  surface_reelle_bati: number | null;
  nombre_pieces_principales: number | null;
  surface_terrain: number | null;
  longitude: number;
  latitude: number;
  annee: number;
  prix_m2: number | null;
}

export async function queryDvf<T = Record<string, unknown>>(
  sql: string
): Promise<T[]> {
  const database = await getDB();
  const conn = await database.connect();
  try {
    const result = await conn.query(sql);
    // Convert BigInt values to Number (DuckDB-WASM returns BigInt for INTEGER casts)
    return result.toArray().map((row) => {
      const obj = row.toJSON();
      for (const key in obj) {
        if (typeof obj[key] === "bigint") {
          obj[key] = Number(obj[key]);
        }
      }
      return obj as T;
    });
  } finally {
    await conn.close();
  }
}

export async function loadParquet(url: string): Promise<void> {
  const database = await getDB();
  const conn = await database.connect();
  try {
    // Fetch parquet as buffer and register it (works with COEP)
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    await database.registerFileBuffer("dvf.parquet", new Uint8Array(buffer));
    await conn.query(
      `CREATE OR REPLACE TABLE dvf AS SELECT * FROM parquet_scan('dvf.parquet')`
    );
    const count = await conn.query("SELECT COUNT(*) as cnt FROM dvf");
    console.log(
      `DuckDB: ${count.toArray()[0].toJSON().cnt} rows loaded from parquet`
    );
  } finally {
    await conn.close();
  }
}

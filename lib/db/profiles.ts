import "server-only";
import { sql } from "@/lib/db/client";
import type { MorphoType } from "@/lib/db/types";

/**
 * Profils du Pilier 2 (Mise en valeur) — colorimétrie & morphologie.
 * Relation 1-1 avec la cliente (UNIQUE(cliente_id)) → upsert ON CONFLICT.
 */

export interface ColorProfile {
  season: string | null;
  palette: Record<string, unknown>;
  makeup_reco: string | null;
  hair_reco: string | null;
}

export interface MorphoProfile {
  type: MorphoType;
  measurements: Record<string, unknown>;
  reco: Record<string, unknown>;
}

export async function getColorProfile(clienteId: string): Promise<ColorProfile | null> {
  const rows = await sql<ColorProfile[]>`
    SELECT season, palette, makeup_reco, hair_reco
      FROM color_profiles WHERE cliente_id = ${clienteId} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function upsertColorProfile(
  clienteId: string,
  input: {
    season: string | null;
    palette: Record<string, unknown>;
    makeupReco: string | null;
    hairReco: string | null;
  }
): Promise<void> {
  await sql`
    INSERT INTO color_profiles (cliente_id, season, palette, makeup_reco, hair_reco)
    VALUES (
      ${clienteId}, ${input.season}, ${sql.json(input.palette as Record<string, never>)},
      ${input.makeupReco}, ${input.hairReco}
    )
    ON CONFLICT (cliente_id) DO UPDATE
      SET season = EXCLUDED.season,
          palette = EXCLUDED.palette,
          makeup_reco = EXCLUDED.makeup_reco,
          hair_reco = EXCLUDED.hair_reco
  `;
}

export async function getMorphoProfile(clienteId: string): Promise<MorphoProfile | null> {
  const rows = await sql<MorphoProfile[]>`
    SELECT type, measurements, reco
      FROM morpho_profiles WHERE cliente_id = ${clienteId} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function upsertMorphoProfile(
  clienteId: string,
  input: {
    type: MorphoType;
    measurements: Record<string, unknown>;
    reco: Record<string, unknown>;
  }
): Promise<void> {
  await sql`
    INSERT INTO morpho_profiles (cliente_id, type, measurements, reco)
    VALUES (
      ${clienteId}, ${input.type}, ${sql.json(input.measurements as Record<string, never>)},
      ${sql.json(input.reco as Record<string, never>)}
    )
    ON CONFLICT (cliente_id) DO UPDATE
      SET type = EXCLUDED.type,
          measurements = EXCLUDED.measurements,
          reco = EXCLUDED.reco
  `;
}

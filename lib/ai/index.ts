import "server-only";
import { getEnv } from "@/lib/env";

/**
 * Abstraction IA Mistral — appels SERVEUR UNIQUEMENT (clé API jamais exposée
 * au client). Phase 0 : interface + stub. Phase 3 implémentera les analyses
 * (colorimétrie/morpho, conseils looks, suivi avant-après), journalisées dans
 * `ai_requests` / `ai_outputs`. Rappel produit : les sorties IA NE débloquent
 * jamais un pilier — seul `validate_pilier` (la coach) avance le parcours.
 * Tout envoi de photo exige le consentement `ai_photo_processing`.
 */

export interface AiClient {
  readonly model: string;
  isConfigured(): boolean;
}

class MistralStub implements AiClient {
  readonly model = "mistral-large-latest";
  private readonly apiKey: string;
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }
}

let cached: AiClient | null = null;

export function getAi(): AiClient {
  if (cached) return cached;
  cached = new MistralStub(getEnv().MISTRAL_API_KEY);
  return cached;
}

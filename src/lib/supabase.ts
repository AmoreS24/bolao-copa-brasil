import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export type DatabaseGame = {
  id: string;
  time_da_casa: string;
  time_visitante: string;
  "data_de_correspondência": string;
  apostas_encerram_em: string;
};

export type DatabaseProfile = {
  id: string;
  name: string;
  phone: string;
  whatsapp_phone: string;
  created_at: string;
};

export type DatabaseGuess = {
  id: string;
  user_id: string;
  match_id: string;
  brazil_goals: number;
  opponent_goals: number;
  first_to_score: string;
  corner_range: string;
  card_range: string;
  payment_status: "pending" | "approved" | "rejected";
  proof_url?: string;
};

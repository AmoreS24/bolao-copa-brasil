import "server-only";
import type { AuthUser } from "@/lib/auth";

export const MASTER_PHONE = "93992071492";

export function isMasterUser(user: AuthUser | null) {
  return user?.telefone?.replace(/\D/g, "") === MASTER_PHONE;
}

import type { UsuarioToken } from "../types.js";

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioToken;
    }
  }
}

export {};

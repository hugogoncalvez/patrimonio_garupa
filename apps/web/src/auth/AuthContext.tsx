import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, TOKEN_KEY, USUARIO_KEY } from "../lib/api";
import type { Rol, Usuario } from "../types";

interface AuthContextValue {
  usuario: Usuario | null;
  token: string | null;
  cargando: boolean;
  login: (usuario: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function leerUsuario(): Usuario | null {
  const raw = localStorage.getItem(USUARIO_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Usuario;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => leerUsuario());
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );
  const [cargando, setCargando] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setCargando(false);
      return;
    }

    let activo = true;

    api
      .get<Usuario>("/auth/me")
      .then(({ data }) => {
        if (activo) {
          setUsuario(data);
          localStorage.setItem(USUARIO_KEY, JSON.stringify(data));
        }
      })
      .catch(() => {
        if (activo) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USUARIO_KEY);
          setToken(null);
          setUsuario(null);
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [token]);

  const login = async (nombreUsuario: string, password: string) => {
    const { data } = await api.post<{ token: string; usuario: Usuario }>(
      "/auth/login",
      { usuario: nombreUsuario, password },
    );

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USUARIO_KEY, JSON.stringify(data.usuario));
    setToken(data.token);
    setUsuario(data.usuario);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    setToken(null);
    setUsuario(null);
  };

  const value = useMemo(
    () => ({ usuario, token, cargando, login, logout }),
    [usuario, token, cargando],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}

export function puedeVer(rol: Rol | undefined, roles?: Rol[]) {
  return !roles || (rol ? roles.includes(rol) : false);
}

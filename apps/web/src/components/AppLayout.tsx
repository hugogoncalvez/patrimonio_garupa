import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SettingsIcon from "@mui/icons-material/Settings";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import HistoryIcon from "@mui/icons-material/History";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth, puedeVer } from "../auth/AuthContext";
import { ThemeToggle } from "./ThemeToggle";
import type { Rol } from "../types";

const drawerWidth = 264;

const navegacion: {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles?: Rol[];
}[] = [
  { to: "/", label: "Panel", icon: <DashboardIcon /> },
  { to: "/bienes", label: "Bienes registrables", icon: <Inventory2Icon /> },
  { to: "/consumibles", label: "Consumibles", icon: <WarehouseIcon /> },
  { to: "/entregas", label: "Entregas de consumibles", icon: <ReceiptLongIcon /> },
  { to: "/compras", label: "Compras e ingresos", icon: <ShoppingCartIcon /> },
  { to: "/configuracion", label: "Configuración", icon: <SettingsIcon /> },
  {
    to: "/usuarios",
    label: "Usuarios",
    icon: <ManageAccountsIcon />,
    roles: ["CONTABLE"],
  },
  {
    to: "/auditoria",
    label: "Auditoría",
    icon: <HistoryIcon />,
    roles: ["CONTABLE"],
  },
];

export function AppLayout() {
  const theme = useTheme();
  const esMovil = useMediaQuery(theme.breakpoints.down("md"));
  const [movilAbierto, setMovilAbierto] = useState(false);
  const { usuario, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const fondoBarra = alpha(theme.palette.background.paper, 0.92);

  const activo = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  const cerrarSesion = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const contenidoDrawer = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar sx={{ gap: 1.5, px: 2.5 }}>
        <Box
          component="img"
          src="/escudo-icono.png"
          alt="Escudo de Garupá"
          sx={{ width: 38, height: 46, objectFit: "contain" }}
        />
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
            Patrimonio
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Municipalidad de Garupá
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1.5, py: 2, flexGrow: 1 }}>
        {navegacion
          .filter((item) => puedeVer(usuario?.rol, item.roles))
          .map((item) => (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setMovilAbierto(false)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                color: activo(item.to) ? "primary.main" : "text.secondary",
                bgcolor: activo(item.to)
                  ? theme.palette.action.selected
                  : "transparent",
                "&:hover": { bgcolor: theme.palette.action.hover },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: activo(item.to) ? "primary.main" : "inherit",
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{
                  primary: {
                    sx: { fontWeight: activo(item.to) ? 700 : 500 },
                  },
                }}
              />
            </ListItemButton>
          ))}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {usuario?.nombre} {usuario?.apellido}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
          @{usuario?.usuario}
        </Typography>
        <Chip
          size="small"
          label={usuario?.rol === "CONTABLE" ? "Contable" : "Patrimonio"}
          color={usuario?.rol === "CONTABLE" ? "primary" : "default"}
          sx={{ mt: 1 }}
        />
        <ListItemButton
          onClick={cerrarSesion}
          sx={{ mt: 1.5, borderRadius: 2, px: 1 }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Cerrar sesión" />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: fondoBarra,
          backdropFilter: "blur(8px)",
        }}
      >
        <Toolbar>
          {esMovil && (
            <IconButton
              edge="start"
              onClick={() => setMovilAbierto(true)}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            Gestión patrimonial
          </Typography>
          <ThemeToggle sx={{ mr: 1 }} />
          <Chip
            size="small"
            label={usuario?.rol === "CONTABLE" ? "Contable" : "Patrimonio"}
            color={usuario?.rol === "CONTABLE" ? "primary" : "default"}
            sx={{ display: { xs: "none", sm: "inline-flex" } }}
          />
        </Toolbar>
      </AppBar>

      <Drawer
        variant={esMovil ? "temporary" : "permanent"}
        open={esMovil ? movilAbierto : true}
        onClose={() => setMovilAbierto(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        {contenidoDrawer}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          p: { xs: 2, md: 3 },
          mt: { xs: 7, md: 8 },
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

import { Box, Button, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        p: 3,
      }}
    >
      <Typography variant="h3" sx={{ fontWeight: 800 }}>
        404
      </Typography>
      <Typography color="text.secondary">
        La página que buscás no existe.
      </Typography>
      <Button variant="contained" onClick={() => navigate("/")}>
        Volver al panel
      </Button>
    </Box>
  );
}

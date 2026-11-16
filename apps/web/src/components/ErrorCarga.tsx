import { Alert, AlertTitle, Button } from "@mui/material";
import { mensajeError } from "../lib/errors";

interface ErrorCargaProps {
  error: unknown;
  onRetry?: () => void;
  titulo?: string;
}

export function ErrorCarga({
  error,
  onRetry,
  titulo = "No se pudieron cargar los datos",
}: ErrorCargaProps) {
  return (
    <Alert
      severity="error"
      sx={{ my: 1 }}
      action={
        onRetry ? (
          <Button color="inherit" size="small" onClick={onRetry}>
            Reintentar
          </Button>
        ) : undefined
      }
    >
      <AlertTitle>{titulo}</AlertTitle>
      {mensajeError(error)}
    </Alert>
  );
}

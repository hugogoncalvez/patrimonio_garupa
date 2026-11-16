export function formatoFecha(value?: string | null): string {
  if (!value) return "-";

  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (soloFecha) {
    return new Date(
      Number(soloFecha[1]),
      Number(soloFecha[2]) - 1,
      Number(soloFecha[3]),
    ).toLocaleDateString("es-AR");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const esMedianocheUtc =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0;

  return date.toLocaleDateString(
    "es-AR",
    esMedianocheUtc ? { timeZone: "UTC" } : undefined,
  );
}

export function formatoFechaHora(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatoMoneda(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  if (Number.isNaN(number)) return "-";
  return number.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  });
}

export function formatoNumero(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") return "0";
  const number = Number(value);
  if (Number.isNaN(number)) return "0";
  return number.toLocaleString("es-AR", {
    maximumFractionDigits: 3,
  });
}

export function hoyISO(): string {
  const date = new Date();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mes}-${dia}`;
}

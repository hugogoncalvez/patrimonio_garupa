import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const rawConnectionString = process.env.DATABASE_URL;

if (!rawConnectionString) {
  throw new Error("DATABASE_URL no está configurada");
}

const sslSinVerificar =
  process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false";
const url = new URL(rawConnectionString);
if (sslSinVerificar) {
  url.searchParams.delete("sslmode");
}

const adapter = new PrismaPg({
  connectionString: url.toString(),
  ssl: sslSinVerificar ? { rejectUnauthorized: false } : undefined,
  max: 1,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
  allowExitOnIdle: true,
});

export const prisma = new PrismaClient({ adapter });

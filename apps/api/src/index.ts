import "dotenv/config";
import { app } from "./app.js";

const port = Number(process.env.PORT ?? 8000);

app.listen(port, () => {
  console.log(`API de Patrimonio escuchando en http://localhost:${port}`);
});

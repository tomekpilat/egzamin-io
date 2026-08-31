import { fileURLToPath } from "node:url";
import { startProdServer } from "vinext/server/prod-server";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.HOST ?? "0.0.0.0";
const outDir = fileURLToPath(new URL("./dist", import.meta.url));

startProdServer({ port, host, outDir }).catch((error) => {
  console.error("[egzaminio] Failed to start production server", error);
  process.exit(1);
});

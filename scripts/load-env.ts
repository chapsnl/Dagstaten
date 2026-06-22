// Side-effect-only module: laadt .env.local in process.env voordat lib/db.ts
// (dat synchroon DATABASE_URL nodig heeft) ge-importeerd wordt. Losse module
// nodig omdat ES module imports altijd boven de rest van het bestand worden
// uitgevoerd (hoisting) - inline code zou hier te laat lopen.
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

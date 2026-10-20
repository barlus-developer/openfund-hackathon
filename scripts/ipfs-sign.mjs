// One-shot CLI helper, not an application server. Never imported into React.
import { requiredEnv } from "./config.mjs";
const jwt = requiredEnv("PINATA_JWT");
const response = await fetch("https://uploads.pinata.cloud/v3/files/sign", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${jwt}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    date: Math.floor(Date.now() / 1000),
    expires: 300,
    max_file_size: 5_000_000,
  }),
  signal: AbortSignal.timeout(20000),
});
if (!response.ok)
  throw Error(
    `Pinata signed URL request failed (${response.status}). Check your upload scope and service limits.`,
  );
const output = await response.json();
const url = new URL(output.data);
if (url.origin !== "https://uploads.pinata.cloud")
  throw Error("Unexpected signed upload URL.");
console.log(
  "Paste this temporary upload capability into Reports → Pinata. It expires in five minutes; do not commit it.",
);
console.log(url.href);

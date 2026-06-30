import fs from "node:fs";
import path from "node:path";

export function parseLocalEnv(text: string) {
  const values: Record<string, string> = {};

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const index = trimmed.indexOf("=");

    if (index === -1) {
      continue;
    }

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

export function readLocalEnv(cwd = process.cwd()) {
  const filePath = path.join(cwd, ".env.local");

  if (!fs.existsSync(filePath)) {
    return {};
  }

  return parseLocalEnv(fs.readFileSync(filePath, "utf8"));
}

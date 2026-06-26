import { cpSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const cesiumRoot = dirname(require.resolve("cesium/package.json"));
const sourceRoot = join(cesiumRoot, "Build", "Cesium");
const targetRoot = join(process.cwd(), "public", "cesium");

mkdirSync(targetRoot, { recursive: true });

for (const dir of ["Assets", "ThirdParty", "Workers", "Widgets"]) {
  const source = join(sourceRoot, dir);
  const target = join(targetRoot, dir);

  if (existsSync(source)) {
    cpSync(source, target, { recursive: true, force: true });
  }
}

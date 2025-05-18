import { defineConfig } from "@hey-api/openapi-ts";
import { config } from "dotenv";
import path from "path";

config({ path: ".env" });

// 提供默认值以防环境变量未被设置
const openapiFile =
  process.env.OPENAPI_OUTPUT_FILE ||
  path.resolve(process.cwd(), "openapi.json");

export default defineConfig({
  client: "@hey-api/client-axios",
  input: openapiFile,
  output: {
    format: "prettier",
    lint: "eslint",
    path: "app/openapi-client",
  },
});

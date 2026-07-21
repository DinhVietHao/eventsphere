import path from "path";
import YAML from "yamljs";
import swaggerUi from "swagger-ui-express";
import type { Express } from "express";

const openApiDocument = YAML.load(
  path.join(__dirname, "..", "..", "docs", "openapi.yaml"),
);

export const setupSwagger = (app: Express): void => {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: "EventSphere API Docs",
    }),
  );
};

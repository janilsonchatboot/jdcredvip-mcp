import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import healthRouter from "./routes/health.js";
import dashboardRouter from "./routes/dashboard.js";
import triageRouter from "./routes/triage.js";

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(bodyParser.json());

  app.use("/", healthRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/triagem", triageRouter);

  return app;
};

const app = createApp();

export default app;

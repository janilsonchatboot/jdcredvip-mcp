import test from "node:test";
import assert from "node:assert/strict";
import { __logTestUtils } from "#modules/auditoria/integration-log.service.js";

const { buildDetailsPayload } = __logTestUtils;

test("buildDetailsPayload mescla detalhes e contexto do log", () => {
  const detalhes = { module: "gaia-core" };
  const context = {
    module: "GAIA::IMPORTACAO",
    origin: "importacao",
    actor: "Codex",
    payload: { batchId: "batch-123" }
  };

  const result = buildDetailsPayload(detalhes, context, "importacao");

  assert.equal(result.module, "gaia-core");
  assert.equal(result.origin, "IMPORTACAO");
  assert.equal(result.context.module, "GAIA::IMPORTACAO");
  assert.equal(result.context.payload.batchId, "batch-123");
});

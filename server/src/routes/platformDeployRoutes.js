import { getDeployStatus, runPlatformDeploy } from "../services/platformDeploy.js";

/** Register super-admin platform update routes on invest or main admin router. */
export function registerPlatformDeployRoutes(router, { authRequired, asyncH, superOnly, scope }) {
  router.get(
    "/admin/platform/deploy/status",
    authRequired(scope),
    superOnly,
    asyncH(async (_req, res) => {
      res.json(await getDeployStatus());
    })
  );

  router.post(
    "/admin/platform/deploy",
    authRequired(scope),
    superOnly,
    asyncH(async (req, res) => {
      if (String(req.body?.confirm || "") !== "DEPLOY") {
        return res.status(400).json({
          error: 'Confirmation required. Send JSON body: { "confirm": "DEPLOY" }',
        });
      }
      const result = await runPlatformDeploy({
        actorEmail: req.user?.email,
        actorName: req.user?.name,
      });
      if (!result.ok) return res.status(result.error?.includes("already") ? 409 : 503).json(result);
      res.json(result);
    })
  );
}

import { getDeployStatus, runPlatformDeploy } from "../services/platformDeploy.js";

/** Register super-admin platform update routes on invest or main admin router. */
export function registerPlatformDeployRoutes(router, { authRequired, asyncH, superOnly, scope }) {
  // Invest admin router is mounted at /api/invest/admin (paths omit /admin).
  // Main marketplace router is mounted at /api/main (paths include /admin).
  const base = scope === "invest" ? "/platform" : "/admin/platform";

  router.get(
    `${base}/deploy/status`,
    authRequired(scope),
    superOnly,
    asyncH(async (_req, res) => {
      res.json(await getDeployStatus());
    })
  );

  router.post(
    `${base}/deploy`,
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

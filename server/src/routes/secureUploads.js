import { Router } from "express";
import { asyncH, authRequired } from "../middleware.js";
import { authorizeUploadAccess } from "../services/secureUploadAccess.js";

export function createSecureUploadRouter(scope) {
  const router = Router();
  router.get(
    "/uploads-secure/:filename",
    authRequired(scope),
    asyncH(async (req, res) => {
      const result = await authorizeUploadAccess({
        scope,
        user: req.user,
        filename: req.params.filename,
      });
      if (!result.ok) {
        return res.status(result.status).json({ error: result.error });
      }
      res.setHeader("Content-Type", result.mime);
      res.setHeader("Content-Disposition", `inline; filename="${req.params.filename}"`);
      res.setHeader("Cache-Control", "private, no-store");
      return res.sendFile(result.filePath);
    })
  );
  return router;
}

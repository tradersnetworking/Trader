#!/bin/sh
cd /app/server
node --input-type=module <<'EOF'
import { ensureAllEmailInfrastructure } from "./src/services/mailboxProvisioning.js";
const r = await ensureAllEmailInfrastructure({ provisionSmtp: true });
console.log(JSON.stringify(r, null, 2));
EOF

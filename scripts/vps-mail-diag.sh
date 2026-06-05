#!/bin/sh
cd /opt/akshaya-exim
docker compose -f deploy/docker-compose.yml exec -T api node --input-type=module <<'NODE'
import { getMailboxConfig } from "./server/src/services/mailboxConfig.js";
import { getAllSettings } from "./server/src/services/investSettings.js";
const inv = await getMailboxConfig("invest", true);
const main = await getMailboxConfig("main", true);
const s = await getAllSettings(true);
console.log("legacy smtp_user:", s.smtp_user);
console.log("legacy smtp_host:", s.smtp_host);
console.log("legacy pass len:", s.smtp_pass?.length);
for (const portal of ["invest", "main"]) {
  const cfg = portal === "invest" ? inv : main;
  console.log(`\n=== ${portal} ===`);
  for (const m of cfg.mailboxes) {
    console.log(m.id, m.address, "smtp.user=", m.smtp.user, "passLen=", m.smtp.pass?.length, "host=", m.smtp.host, "port=", m.smtp.port, "secure=", m.smtp.secure);
  }
}
NODE

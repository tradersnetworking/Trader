import { investApi } from "../../lib/api.js";
import PortalEmailSettingsPanel from "../shared/PortalEmailSettingsPanel.jsx";

export default function CommunicationSettingsPanel() {
  return <PortalEmailSettingsPanel portal="invest" api={investApi} />;
}

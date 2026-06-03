import { investApi } from "../../lib/api.js";
import PortalEmailSettingsPanel from "../shared/PortalEmailSettingsPanel.jsx";

export default function CommunicationSettingsPanel({ readOnly = false }) {
  return <PortalEmailSettingsPanel portal="invest" api={investApi} readOnly={readOnly} />;
}

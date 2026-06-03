import { mainApi } from "../../lib/api.js";
import PortalEmailSettingsPanel from "../shared/PortalEmailSettingsPanel.jsx";

export default function MainCommunicationPanel({ readOnly = false }) {
  return <PortalEmailSettingsPanel portal="main" api={mainApi} readOnly={readOnly} />;
}

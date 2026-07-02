
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { initializePushNotifications } from "./app/lib/push-notifications";
import "./styles/index.css";

initializePushNotifications();
createRoot(document.getElementById("root")!).render(<App />);
  

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Canonicalizar dominio: redirigir www → sin www para evitar discrepancias en OAuth
if (window.location.hostname === "www.crowdfolio.es") {
  window.location.replace(
    "https://crowdfolio.es" + 
    window.location.pathname + 
    window.location.search + 
    window.location.hash
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

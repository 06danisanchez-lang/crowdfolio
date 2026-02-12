import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global error instrumentation (ready for Sentry)
window.addEventListener('error', (event) => {
  console.error('[Global Error]', {
    message: event.message,
    source: event.filename,
    line: event.lineno,
    col: event.colno,
    stack: event.error?.stack,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Rejection]', {
    reason: event.reason,
    stack: event.reason?.stack,
  });
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

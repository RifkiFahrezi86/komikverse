import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./lib/auth";
import ErrorBoundary from "./components/ErrorBoundary";
import { setupBackButton } from "./lib/capacitor";
import App from "./App";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

setupBackButton();

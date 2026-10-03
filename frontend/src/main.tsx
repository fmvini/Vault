import "@fontsource/basic/400.css";
import "@fontsource/spline-sans-mono/400.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { initializeTheme } from "./lib/theme";
import "./styles.css";
import "./feature.css";
import './enhancements.css';

initializeTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
  </React.StrictMode>
);


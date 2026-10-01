import { createRoot } from "react-dom/client";
import { App } from "./app";
import "./style.css";

const root = document.getElementById("root");
if (!root) throw new Error("Inspector mount element is missing");
createRoot(root).render(<App />);

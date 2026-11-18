import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import "./styles.css";
import { getRouter } from "./router";

const router = getRouter();
const el = document.getElementById("root");
if (!el) throw new Error("Root element #root missing in index.html");

createRoot(el).render(<RouterProvider router={router} />);

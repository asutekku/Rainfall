import * as React from "react";
import {createRoot} from "react-dom/client";

import {App} from "./components/app";
// React 19 root API (replaces the removed ReactDOM.render).
const container = document.getElementById("root");
if (container) {
    createRoot(container).render(<App/>);
}

import * as React from "react";
import * as ReactDOM from "react-dom";

import {App} from "./components/app";
import {Dom} from "./utils/Dom";
import {Logger} from "./utils/Logger";

// Install the browser rendering sink for game-logic messages. The logic layer
// only knows Logger.log(); this is the one place that binds it to the DOM.
Logger.setSink(Dom.printLine);

ReactDOM.render(
    <App/>,
    document.getElementById("root"),
);

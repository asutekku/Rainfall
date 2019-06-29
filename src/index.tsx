import * as React from "react";
import {AppContainer} from "react-hot-loader";
import {render} from "react-dom";
import App from "./components/app";
import NewApp from "./components/app";

const rootEl = document.getElementById("root");

render(
    <AppContainer>
        <App/>
    </AppContainer>,
    rootEl
);

declare let module: { hot: any };

if (module.hot) {
    module.hot.accept("./components/App", () => {
        render(
            <AppContainer>
                <NewApp/>
            </AppContainer>,
            rootEl
        );
    });
}
import en_US from "../../lang/en_US";
import {Drug} from "./Drug";

const drugs = Object.entries(en_US.Drugs).map((e) => {
    return new Drug(e[1].name, e[1].desc, e[1].type, e[1].cost, e[1].strength, e[1].difficulty, e[1].duration);
});

export default drugs;

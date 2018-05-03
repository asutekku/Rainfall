import {Movement} from "../interact/Movement";
import {Cover} from "./Cover";
import {State} from "../utils/State";

let rpos = Movement.randomPosition(State.playArea,100);
let Covers = [
    new Cover("Sheetrock wall", rpos, 5),
    new Cover("Stone Wall", rpos, 30),
    new Cover("Large Tree", rpos, 30),
    new Cover("Phone pole", rpos, 30),
    new Cover("Brick wall", rpos, 25),
    new Cover("Concrete Block Wall", rpos, 10),
    new Cover("Wood door", rpos, 5),
    new Cover("Heavy Wood Door", rpos, 15),
    new Cover("Steel Door", rpos, 20),
    new Cover("Concrete Ultility Pole", rpos, 35),
    new Cover("Data Term", rpos, 25),
    new Cover("Car", rpos, 10),
    new Cover("Armored Car", rpos, 40),
    new Cover("AV-4", rpos, 40),
    new Cover("Engine block", rpos, 35),
    new Cover("Mailbox", rpos, 25),
    new Cover("Hydrant", rpos, 35),
    new Cover("Curb", rpos, 25),
];
export default Covers;
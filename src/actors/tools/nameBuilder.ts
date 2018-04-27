//C = name, D = gender
import {Utils} from "../../utils/utils";
import {default as names} from '../resources/names'

let actorName: string;
let actorGender: string;

export function name(): string {
    //Select random gender and return either male or female
    function e() {
        //A is either 1 or 0 -> random gender
        let randomNumber = Math.floor(2 * Math.random());
        if (1 === randomNumber) {
            actorGender = "Male";
            return gender;
        } else if (0 === randomNumber) {
            actorGender = "Female";
            return actorGender;
        }
    }

    e();
    if (actorGender == "Male") {
        actorName = `${Utils.pickRandom(names.male)} ${Utils.pickRandom(names.surname)}`;
        return actorName;
    }
    if ("Female" == actorGender) {
        actorName = `${Utils.pickRandom(names.female)} ${Utils.pickRandom(names.surname)}`;
        return actorName;
    }
}


export function gender(): string {
    return actorGender;
}


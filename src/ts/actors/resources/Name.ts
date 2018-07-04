import { default as roles } from "./roles";
import { default as names } from "./names";
import { Utils } from "../../utils/utils";

export class Name {
    get firstName(): string {
        return this._firstName;
    }

    set firstName(value: string) {
        this._firstName = value;
    }

    get surname(): string {
        return this._surname;
    }

    set surname(value: string) {
        this._surname = value;
    }

    private _firstName: string;
    private _surname: string;
    gender: string;

    constructor() {
        this.gender = Name.getGender();
        this._firstName = Name.getFirstname(this.gender);
        this._surname = Name.getSurname();
    }

    static getGender(): string {
        let randomNumber = Math.floor(2 * Math.random());
        if (1 === randomNumber) {
            return "Male";
        }
        return "Female";
    }

    static getFirstname(gender: string) {
        if (gender == "Male") {
            return Utils.pickRandom(names.male);
        } else return Utils.pickRandom(names.female);
    }

    static getSurname() {
        return Utils.pickRandom(names.surname);
    }
}

import {Utils} from "../../utils/utils";
import {default as names} from "./names";

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

    public gender: string;

    public static getGender(): string {
        const randomNumber = Math.floor(2 * Math.random());
        if (1 === randomNumber) {
            return "Male";
        }
        return "Female";
    }

    public static getFirstname(gender: string) {
        if (gender === "Male") {
            return Utils.pickRandom(names.male);
        } else {
            return Utils.pickRandom(names.female);
        }
    }

    public static getSurname() {
        return Utils.pickRandom(names.surname);
    }

    private _firstName: string;
    private _surname: string;

    constructor() {
        this.gender = Name.getGender();
        this._firstName = Name.getFirstname(this.gender);
        this._surname = Name.getSurname();
    }
}

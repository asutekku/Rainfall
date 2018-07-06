import { default as roles } from "./roles";

let randomProperty = function(obj:Object) {
    let keys = Object.keys(obj);
    return (obj as any)[keys[(keys.length * Math.random()) << 0]];
};

export class Role {
    name: any;
    skill: string | null;
    skillDescription: string;
    color: any;

    constructor() {
        let theRole = randomProperty(roles);
        this.name = theRole.name;
        this.skill = theRole.skill;
        this.skillDescription = theRole.skillDescription;
        this.color = theRole.color;
    }
}

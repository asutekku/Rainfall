import {default as roles} from "./roles";

const getRole: any = function (role?: string) {
    const keys = Object.keys(roles);
    return role ? (<any>roles)[role!] : (<any>roles)[keys[(keys.length * Math.random()) << 0]];
};

export class Role {
    name: any;
    skill: string;
    skillDescription: string;
    color: any;
    portrait: string;

    constructor(role?: string) {
        const actorRole: any = getRole(role);
        this.name = actorRole.name;
        this.skill = actorRole.skill;
        this.skillDescription = actorRole.skillDescription;
        this.color = actorRole.color;
        this.portrait = actorRole.portrait;
    }
}

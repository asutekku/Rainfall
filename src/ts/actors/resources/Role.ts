import {default as roles} from "./roles";

const getRole: any = (role?: string) => {
    const keys = Object.keys(roles);
    return role ? (roles as any)[role!] : (roles as any)[keys[(keys.length * Math.random()) << 0]];
};

export class Role {
    public name: any;
    public skill: string;
    public skillDescription: string;
    public color: any;
    public portrait: string;

    constructor(role?: string) {
        const actorRole: any = getRole(role);
        this.name = actorRole.name;
        this.skill = actorRole.skill;
        this.skillDescription = actorRole.skillDescription;
        this.color = actorRole.color;
        this.portrait = actorRole.portrait;
    }
}

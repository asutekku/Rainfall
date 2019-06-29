let roles: any = require("./roles.json");

interface IRole {
    name: string;
    skill: string;
    skillDescription: string;
    color: string;
    colorString: string
    portrait: string;
}

const getRole = (role?: string): IRole => {
    const keys = Object.keys(roles);
    return role ? <IRole>roles[role] : <IRole>roles[keys[(keys.length * Math.random()) << 0]];
};

export class Role {
    public name: string;
    public skill: string;
    public skillDescription: string;
    public color: string;
    public colorString: string;
    public portrait: string;

    constructor(role?: string) {
        const actorRole: IRole = getRole(role);
        console.log('Role');
        this.name = actorRole.name;
        this.skill = actorRole.skill;
        this.skillDescription = actorRole.skillDescription;
        this.color = actorRole.color;
        this.colorString = actorRole.colorString;
        this.portrait = "src/assets/img/portraits/" + actorRole.portrait;
    }
}

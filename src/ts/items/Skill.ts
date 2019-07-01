import {weaponMode} from "./weapons/GeneratedWeapon";

export interface ISkill {
    name: string;
    category: SkillType;
    description: string;
    level: number;
}

export class Skill implements ISkill {

    public name: string;
    public description: string;
    public level: number;
    public category: SkillType;
    public type: weaponMode | string;
    public key: string;

    constructor(
        name: string,
        description: string,
        level: number,
        category: SkillType,
        type: weaponMode | string,
        key: string
    ) {
        this.name = name;
        this.description = description;
        this.level = level;
        this.category = category;
        this.type = type;
        this.key = key;
    }
}

export enum SkillType {
    combat = "combat",
    dodge = "dodge",
    aid = "aid"
}
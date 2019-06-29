export interface ISkill {
    name: string;
    type: SkillType;
    description: string;
    level: number;
}

export class Skill implements ISkill {

    public name: string;
    public description: string;
    public level: number;
    public type: SkillType;

    constructor(
        name: string,
        description: string,
        level: number,
        type: SkillType
    ) {
        this.name = name;
        this.description = description;
        this.level = level;
        this.type = type;
    }
}

export enum SkillType {
    combat = "combat",
    dodge = "dodge",
    aid = "aid"
}
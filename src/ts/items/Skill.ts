export interface ISkill {
    name: string;
    description: string;
    level: number;
}

export class Skill implements ISkill {

    public name: string;
    public description: string;
    public level: number;

    constructor(
        name: string,
        description: string,
        level: number,
    ) {
        this.name = name;
        this.description = description;
        this.level = level;
    }
}

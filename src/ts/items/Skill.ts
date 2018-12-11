export interface SkillInterface {
    name: string;
    description: string;
    level: number;
}

export class Skill implements SkillInterface {

    name: string;
    description: string;
    level: number;

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

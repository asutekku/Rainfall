export interface QuestInterface {
    name: string;
    description: string;
    level: number;
    rewardItems: any;
    rewardMoney: number;
    active: boolean;
}

export class Quest implements QuestInterface {

    public name: string;
    public description: string;
    public level: number;
    public rewardItems: any;
    public rewardMoney: number;
    public active: boolean;

    constructor(
        name: string,
        description: string,
        level: number,
        rewardItems: any,
        rewardMoney: number,
        active: boolean,
    ) {
        this.name = name;
        this.description = description;
        this.level = level;
        this.rewardItems = rewardItems;
        this.rewardMoney = rewardMoney;
        this.active = active;
    }
}

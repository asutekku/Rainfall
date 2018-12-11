export interface QuestInterface {
    name: string;
    description: string;
    level: number;
    rewardItems: any;
    rewardMoney: number;
    active: boolean;
}

export class Quest implements QuestInterface {

    name: string;
    description: string;
    level: number;
    rewardItems: any;
    rewardMoney: number;
    active: boolean;

    constructor(
        name: string,
        description: string,
        level: number,
        rewardItems: any,
        rewardMoney: number,
        active: boolean
    ) {
        this.name = name;
        this.description = description;
        this.level = level;
        this.rewardItems = rewardItems;
        this.rewardMoney = rewardMoney;
        this.active = active;
    }
}

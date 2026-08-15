import {Item} from "./Item";
import {ObjectPosition} from "../utils/ObjectPosition";

/** Mechanical effects a piece of cyberware grants once installed. */
export interface CyberwareEffects {
    sp?: number;               // subdermal/skinweave body armour (SP)
    initiative?: number;       // reflex boosters (Sandevistan, Kerenzikov)
    attackBonus?: number;      // targeting scope / smartgun link
    grantsWeapon?: string;     // cyberweapons (Wolvers, Rippers): a real equippable weapon
    body?: number;             // grafted muscle & bone lace (raises BODY -> HP)
    ignoreWoundPenalty?: boolean; // Pain Editor
}

export interface CyberwareConfig {
    name: string;
    slot: string;         // neuralware / cyberoptics / cyberarm / body / ...
    humanityLoss: number; // RED Humanity Loss (HL)
    cost: number;
    description: string;
    effects: CyberwareEffects;
}

export class Cyberware extends Item {
    public slot: string;
    public humanityLoss: number;
    public effects: CyberwareEffects;

    constructor(cfg: CyberwareConfig) {
        super("cyberware", cfg.name, cfg.cost, cfg.description, new ObjectPosition(0, 0, 0));
        this.slot = cfg.slot;
        this.humanityLoss = cfg.humanityLoss;
        this.effects = cfg.effects;
    }
}

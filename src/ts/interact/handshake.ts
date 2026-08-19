import type {MercOffer} from "./mercMarket";

/**
 * What a candidate says when you sit down across from them.
 *
 * The hire board used to be a spreadsheet: tier, SP, trait tooltips. The
 * traits were always the interesting part — so now they talk. Three or four
 * lines assembled from who the merc actually is (tier, faction, every trait,
 * the grudge by name), which is how a player learns what "Union Rates" means
 * without reading a tooltip: she tells you her people cover the pickup bill.
 */

const TIER_VOICE: {[k: string]: string} = {
    Rookie: "\"First real crew. Won't pretend otherwise. Won't waste it either.\"",
    Pro: "\"Four years on the street, two crews, still breathing. That's the résumé.\"",
    Veteran: "\"I've buried the people who taught me and most of the people they warned me about.\"",
    Legend: "\"You already know the stories. About half of them are true. The right half.\"",
};

const FACTION_VOICE: {[k: string]: string} = {
    "Street": "\"Grew up six blocks from here. I know which windows watch.\"",
    "Scav": "\"People leave so much behind. I bring it back. Try not to think about how.\"",
    "Wraiths": "\"Learned to fight in dust storms. A city street is a shooting gallery with roofs.\"",
    "6th Street": "\"Served. Still serve, just — smaller unit, better pay, honest wars.\"",
    "Animals": "\"No wires in me. Everything you're renting, I grew myself.\"",
    "Tyger Claws": "\"The Claws taught me blade discipline. We parted on… professional terms.\"",
    "Maelstrom": "\"The chrome itches when I'm bored. Keep me un-bored.\"",
    "Chrome": "\"Most of me is aftermarket now. The warranty voided years ago. Still runs.\"",
};

const TRAIT_VOICE: {[k: string]: string} = {
    steadyHands: "\"I don't miss twice. Usually don't miss once.\"",
    glassJaw: "\"Fair warning: I go down easier than I should. I just don't stay down.\"",
    butcher: "\"When they drop, they don't get back up. I make sure.\"",
    hardToKill: "\"Been shot nine times. Ask me what the other guys have been.\"",
    coward: "\"I like cover. Cover likes me. We have an arrangement.\"",
    tunnelVision: "\"Pick my target and I finish it. Don't ask me to switch mid-job.\"",
    reckless: "\"Doors are for people with time. I make entrances.\"",
    triggerDiscipline: "\"Ammunition costs money. I spend it like it's mine.\"",
    owesMoney: "\"There's a… payroll deduction situation. Handled. Don't ask about the cut.\"",
    scrounger: "\"Everything on a street is worth something to somebody. I know the somebodies.\"",
    unionRates: "\"I cost more because my people scrape me off the pavement. You'll never pay my pickup bill.\"",
    lastStand: "\"You want to see my best work? Hope you never do.\"",
    juiced: "\"I don't warm up. I arrive warm.\"",
};

export function handshake(o: MercOffer): string[] {
    const lines: string[] = [];
    lines.push(TIER_VOICE[o.tier] || TIER_VOICE["Rookie"]!);
    if (FACTION_VOICE[o.faction]) { lines.push(FACTION_VOICE[o.faction]!); }
    for (const t of o.traits) {
        if (t === "badBlood") {
            lines.push(`"One condition. If we cross the ${o.grudge || "wrong people"}, I'm not staying calm. History."`);
        } else if (TRAIT_VOICE[t]) {
            lines.push(TRAIT_VOICE[t]!);
        }
    }
    if (o.debt) { lines.push("\"The rate's low because the wrong people set it. You're not paying me — you're outbidding them.\""); }
    return lines;
}

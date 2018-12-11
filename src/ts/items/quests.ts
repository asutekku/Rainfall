import {Quest} from "./Quest";

const sideQuests = [
    new Quest('Kill some random dude', "You know, kill the dude that has been pestering us", 1, [], 100, false)
];

const mainQuests = [
    new Quest('Kill the big dude', "You know, kill the big dude that has been pestering us", 2, [], 100, false)
];

const quests = {sideQuests, mainQuests};

export default quests;
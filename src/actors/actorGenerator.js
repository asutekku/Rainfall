define(['actor', 'utils', 'list_roles', 'nameGen', 'getItem', 'math'], function (Actor, utils, stat, nameGen, getItem, math) {

    let humanActor = new Actor();
    humanActor.name = nameGen.name();
    humanActor.role = stat.role();
    humanActor.color = stat.color;
    humanActor.gender = nameGen.gender();
    humanActor.level = parseInt(localStorage.getItem("pLVL"), 10);
    humanActor.experience = parseInt(localStorage.getItem("pEXP"), 10);
    humanActor.maxExperience = parseInt(localStorage.getItem("pMEXP"), 10);
    humanActor.health = parseInt(localStorage.getItem("pHP"), 10);
    humanActor.maxHealth = parseInt(localStorage.getItem("pMHP"), 10);
    humanActor.stamina = localStorage.getItem("pSTM");
    humanActor.weapon = getItem.weapon();

    return {
        human: humanActor,
        updatePlayer: function () {
            currentPlayer = this.player;
            currentPlayer.name = nameGen.name();
            currentPlayer.role = stat.role();
            currentPlayer.color = stat.color;
            currentPlayer.gender = nameGen.gender();
        }
    }
});

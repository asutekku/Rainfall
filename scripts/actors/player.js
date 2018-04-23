define(['actor', 'utils', 'list_roles', 'nameGen', 'getItem', 'math'], function (Actor, utils, stat, nameGen, getItem, math) {

    let playerActor = new Actor();
    playerActor.name = nameGen.name();
    playerActor.role = stat.role();
    playerActor.color = stat.color;
    playerActor.gender = nameGen.gender();
    playerActor.level = parseInt(localStorage.getItem("pLVL"), 10);
    playerActor.experience = parseInt(localStorage.getItem("pEXP"), 10);
    playerActor.maxExperience = parseInt(localStorage.getItem("pMEXP"), 10);
    playerActor.health = parseInt(localStorage.getItem("pHP"), 10);
    playerActor.maxHealth = parseInt(localStorage.getItem("pMHP"), 10);
    playerActor.mana = localStorage.getItem("pMP");
    playerActor.stamina = localStorage.getItem("pSTM");
    playerActor.weapon = getItem.weapon();

    return {
        player: playerActor,
        updatePlayer: function () {
            currentPlayer = this.player;
            currentPlayer.name = nameGen.name();
            currentPlayer.role = stat.role();
            currentPlayer.color = stat.color;
            currentPlayer.gender = nameGen.gender();
        }
    }
});

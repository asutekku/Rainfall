define("main", ['player'], function (player) {

    let pc = player.init();

    return {
        playerCharacter: pc,
    }
});
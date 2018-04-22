require.config({
    paths: {
        stats: 'actors/resources/stats',
        utils: 'utils/utils',
        list_weapons: 'items/weapons',
        list_items: 'items/items',
        list_armor: 'items/armor',
        list_names: 'actors/resources/nameList',
        list_roles: 'actors/resources/roleTree',
        combat: 'interact/combat',
        messages: 'interact/messages',
        actors: 'actors/player',
        nameGen: 'actors/tools/nameGen',
        getItem: 'interact/getItem',
        UI: 'utils/UI',
        color: 'utils/colors',
        math: 'utils/math',
        actor: 'actors/actor',
        enemy: 'actors/enemy',
        role: 'actors/role'
    }
});

requirejs(['app']);

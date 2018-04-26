define(['utils', 'role', 'actors/resources/roles'], function (utils, Role, roles) {
    var randomProperty = function (obj) {
        var keys = Object.keys(obj)
        return obj[keys[keys.length * Math.random() << 0]];
    };
    return {
        role: function () {
            var theRole = randomProperty(roles);
            let actorRole = new Role();
            actorRole.name = theRole.name;
            actorRole.skill = theRole.skill;
            actorRole.skillDescription = theRole.skillDescription;
            actorRole.color = theRole.color;
            return actorRole;
        },
        skillDesc: "##UNDEFINED##"
    };
});

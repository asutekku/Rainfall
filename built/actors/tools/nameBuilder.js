define(["require", "exports", "../../utils/utils", "../resources/names"], function (require, exports, utils_1, names_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var actorName;
    var actorGender;
    function name() {
        //Select random gender and return either male or female
        function e() {
            //A is either 1 or 0 -> random gender
            var randomNumber = Math.floor(2 * Math.random());
            if (1 === randomNumber) {
                actorGender = "Male";
                return gender;
            }
            else if (0 === randomNumber) {
                actorGender = "Female";
                return actorGender;
            }
        }
        e();
        if (actorGender == "Male") {
            actorName = utils_1.Utils.pickRandom(names_1.default.male) + " " + utils_1.Utils.pickRandom(names_1.default.surname);
            return actorName;
        }
        if ("Female" == actorGender) {
            actorName = utils_1.Utils.pickRandom(names_1.default.female) + " " + utils_1.Utils.pickRandom(names_1.default.surname);
            return actorName;
        }
    }
    exports.name = name;
    function gender() {
        return actorGender;
    }
    exports.gender = gender;
});

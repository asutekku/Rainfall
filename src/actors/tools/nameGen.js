define(["list_names", "utils"], function (nameList, utils) {
    "use strict";
    //C = name, D = gender
    var gender, name;
    
    return {
        name: function (actor) {
            //Select random gender and return either male or female
            function e() {
                //A is either 1 or 0 -> random gender
                var genderRandomizer = Math.floor(2 * Math.random());
                if (1 === genderRandomizer) {
                    gender = "Male";
                    return gender;
                } else if (0 === genderRandomizer) {
                    gender = "Female";
                    return gender;
                }
            }
            e();
            if (gender == "Male") {
                name = utils.choose(nameList.male) + " " + utils.choose(nameList.surname);
                return name;
            } else if ("Female" == gender) {
                name = utils.choose(nameList.female) + " " + utils.choose(nameList.surname);
                return name;
            }
            console.log(c);
        },
        gender: function () {
            return gender;
        }
    };
});

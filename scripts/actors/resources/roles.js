define(['utils'], function (utils) {
    return {
        role: ['Rockerboy', 'Solo', 'Netrunner', 'Corporate', 'Techie', 'Cop', 'Fixer', 'Media', 'Nomad'],
        ability: function (role) {
            switch (role) {
                case 'Rockerboy':
                    this.skillDesc = "This skill allows Rocker to sway crowds equal to their ability level squared, times 200.";
                    this.color = "#A93226";
                    return 'Charismatic Leadership';
                case 'Solo':
                    this.skillDesc = "Added to all awareness checks, this makes the Solo the fastest reacting person in a situation.";
                    this.color = "#27AE60";
                    return 'Combat Sense';
                case 'Netrunner':
                    this.skillDesc = "Prevents access to the web from other persons.";
                    this.color = "#2E86C1";
                    return 'Interface';
                case 'Techie':
                    this.skillDesc = "This general repair skill allows the Techie to temporarily repair or alter anything for x turns per level of skill";
                    this.color = "#A2D9CE";
                    return 'Jury Rig';
                case 'Media':
                    this.skillDesc = "The ability to have people believe what you're saying while in your on-air persona.";
                    this.color = "#f8a912";
                    return 'Credibility';
                case 'Cop':
                    this.skillDesc = "The ability to intimidate or control others through your position as a lawman.";
                    this.color = "#2980B9";
                    return 'Authority';
                case 'Corporate':
                    this.skillDesc = "This represents the corporates ability to command corporation resources. It is used as a persuasion skill, based on the scale of resources requested.";
                    this.color = "#fff145";
                    return 'Resources';
                case 'Fixer':
                    this.skillDesc = "The ability to locate people, information etc.";
                    this.color = "#ed9b51";
                    return 'Streetdeal';
                case 'Nomad':
                    this.skillDesc = "This allows nomad to call in as many Family members to aid him as his current Family Ability level x 2.";
                    this.color = "#2ECC71";
                    return 'Family';
            };
        },
        skillDesc: "##UNDEFINED##"
    };
});

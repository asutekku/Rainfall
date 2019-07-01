import {Skill, SkillType} from "./Skill";
import {weaponMode} from "./weapons/GeneratedWeapon";

export default {
    combat: [
        new Skill('Single Round', 'Basic attack. High accuracy, low damage.', 1, SkillType.combat, weaponMode.single, 'q'),
        new Skill('Burst Fire', 'Burst fire. Has lower accuracy but can cause more damage.', 1, SkillType.combat, weaponMode.burst, 'w'),
        new Skill('Rapid Fire', 'Rapid fire. Empty your clip, hope everything hits.', 1, SkillType.combat, weaponMode.rapid, 'a'),
        new Skill('Dodge', 'Prepare for the enemy attack. Increases dodge chance', 1, SkillType.dodge, 'dodge', 's'),
    ],
};

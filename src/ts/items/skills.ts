import {Skill, SkillType} from "./Skill";

export default {
    combat: [
        new Skill('Single Round', 'Basic attack. Shoot the enemy', 1, SkillType.combat),
        new Skill('Burst Fire', 'Burst fire. Has lower accuracy but can hit multiple targets.', 1, SkillType.combat),
        new Skill('Nanoclaws', 'Tear the enemy away with nanoclaws.', 1, SkillType.combat),
        new Skill('Dodge', 'Prepare for the enemy attack. Increases dodge chance', 1, SkillType.dodge),
    ],
};

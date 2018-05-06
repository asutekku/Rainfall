import {Stat} from "./Stat";
import {stat_en_US} from "../../../lang/en_US";

let _ = stat_en_US;

let Stats = [
    new Stat(_.int.name, _.int.short, _.int.description, 2),
    new Stat(_.ref.name, _.ref.short, _.ref.description, 2),
    new Stat(_.cool.name, _.cool.short, _.cool.description, 2),
    new Stat(_.tech.name, _.tech.short, _.tech.description, 2),
    new Stat(_.lk.name, _.lk.short, _.lk.description, 2),
    new Stat(_.att.name, _.att.short, _.att.description, 2),
    new Stat(_.ma.name, _.ma.short, _.ma.description, 2),
    new Stat(_.run.name, _.run.short, _.run.description, 2),
    new Stat(_.leap.name, _.leap.short, _.leap.description, 2),
    new Stat(_.emp.name, _.emp.short, _.emp.description, 2),
    new Stat(_.hm.name, _.hm.short, _.hm.description, 2),
    new Stat(_.bt.name, _.bt.short, _.bt.description, 2),
    new Stat(_.btm.name, _.btm.short, _.btm.description, 2),
    new Stat(_.sn.name, _.sn.short, _.sn.description, 2)
];
export default Stats;

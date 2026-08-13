import {ObjectPosition} from "./ObjectPosition";

/**
 * Pure, DOM-free helpers usable in any environment (browser, Node, tests).
 * DOM/localStorage helpers live in ./Dom, message logging in ./Logger.
 */
export class Utils {
    public static pickRandom(arr: any[]): any {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    public static colorize(what: string): string {
        const randomColor =
            "#" +
            Math.random()
                .toString(16)
                .substr(-3);
        return `<span style="color:${randomColor}">${what}</span>`;
    }

    public static span(line: string, spanClass?: string): string {
        return `<span class="${spanClass}">${line}</span>`;
    }

    public static dice(times: number, sides: number): number {
        let total = 0;
        for (let i = 0; i < times; i++) {
            total += Math.floor(Math.random() * sides) + 1;
        }
        return total;
    }

    public static chance(what: number): boolean {
        const value = Math.ceil(Math.random() * 100);
        return value <= what;
    }

    public static range(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    }

    public static distance(p1: ObjectPosition, p2: ObjectPosition): any {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = p1.z - p2.z;

        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}

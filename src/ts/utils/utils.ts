import {ObjectPosition} from "./ObjectPosition";

let spanId: number = 0;
let spanIdToRemove: number = 1;

export class Utils {
    public static l(what: string): HTMLElement | null {
        return document.getElementById(what);
    }

    /**
     * Picks random item from an array
     * @param arr The array to pick the item from
     */
    public static pickRandom(arr: any[]): any {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    /**
     * Saves something to the local storage
     * @param what
     * @param string
     */
    public static save(what: string, string: string): void {
        return localStorage.setItem(what, string);
    }

    /**
     * Returns a span element with random colour assigned to it
     * @param content Text to be inserted in to the span
     */
    public static colorize(content: string): string {
        const randomColor =
            "#" +
            Math.random()
                .toString(16)
                .substr(-3);
        return `<span style="color:${randomColor}">${content}</span>`;
    }

    public static printLine(line: string): void {
        spanId += 1;
        const node = document.createElement("span");
        const content = document.getElementById("actions")!;
        node.id = "message_" + spanId;
        node.classList.add("actionMessage");
        node.innerHTML = `<span class="messageArrow">></span>${line}<br>`;
        content.insertBefore(node, content.childNodes[0]);
        if (content.childElementCount >= 50) {
            const oldNode = document.getElementById("message_" + spanIdToRemove)!;
            oldNode.remove();
            spanIdToRemove += 1;
        }
    }

    /**
     * Creates a new span with optional class assigned to it
     * @param string Text to be inserted in to the span
     * @param className Optional class for the span
     */
    public static span(string: string, className?: string): string {
        return `<span class="${className}">${string}</span>`;
    }

    /**
     * Throw n sided dice m times and return the sum
     * @param times How many times to throw the dice
     * @param sides How many sides does the dice have
     */
    public static dice(times: number, sides: number): number {
        return (Math.floor(Math.random() * sides) + 1) * times;
    }

    /** Checks if random value is less or equals to chance (in percentages)
     * @param chance Percentage value for the chance to but true
     */
    public static chance(chance: number): boolean {
        const value = Math.ceil(Math.random() * 100);
        return value <= chance;
    }

    /**
     * Returns random int inside a given range
     * @param min Minimum value for the int
     * @param max Maximum value for the int
     */
    public static getRandomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    /**
     * Return a distance between two objects in a 3D space
     * @param p1 Position of the first object
     * @param p2 Position of the second object
     */
    public static distance(p1: ObjectPosition, p2: ObjectPosition): any {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = p1.z - p2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Returns n ints in the given range that amount to be between minSum and maxSum
     * @param n Amount of ints the return
     * @param min Minimum value for returned int
     * @param max Maximum value for returned int
     * @param minSum Minimum sum returned for all ints
     * @param maxSum Maximum sum returned for all ints
     */
    public static randomInts(n: number, min: number, max: number, minSum: number, maxSum: number): number[] {
        if (min * n > maxSum || max * n < minSum) {
            throw 'Impossible';
        }
        let values: number[] = [];
        while (n--) {
            const thisMin: number = Math.max(min, minSum - n * max);
            const thisMax: number = Math.min(max, maxSum - n * min);
            const int: number = Utils.getRandomInt(thisMin, thisMax);
            minSum -= int;
            maxSum -= int;
            values.push(int);
        }
        return values;
    }

    /**
     * Returns the largest value in and array and then deletes it from the array
     * @param array The array to get the value from
     */
    static maxRemove(array: number[]) {
        const max: number = Math.max(...array);
        array.splice(max);
        return max;
    }

    /**
     * Returns the smallest value in and array and then deletes it from the array
     * @param array The array to get the value from
     */
    static minRemove(array: number[]) {
        const min: number = Math.min(...array);
        array.splice(min);
        return min;
    }
}

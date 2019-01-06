import {ObjectPosition} from "./ObjectPosition";

let spanId: number = 0;
let spanIdToRemove: number = 1;

export class Utils {
    public static l(what: string): HTMLElement | null {
        return document.getElementById(what);
    }

    public static create(what: string): HTMLElement | null {
        return document.createElement(what);
    }

    public static pickRandom(arr: any[]): any {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    public static save(what: string, string: string): void {
        return localStorage.setItem(what, string);
    }

    public static colorize(what: string): string {
        const randomColor =
            "#" +
            Math.random()
                .toString(16)
                .substr(-3);
        return `<span style="color:${randomColor}">${what}</span>`;
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

    public static span(line: string, spanClass?: string): string {
        return `<span class="${spanClass}">${line}</span>`;
    }

    public static dice(times: number, sides: number): number {
        return (Math.floor(Math.random() * sides) + 1) * times;
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

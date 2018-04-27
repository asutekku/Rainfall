let spanId: number = 0;
let spanIdToRemove: number = 1;

export class Utils {

    static l(what): HTMLElement | null {
        return document.getElementById(what);
    }

    static pickRandom(arr: any[]): any {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    static save(what, string: string): void {
        return localStorage.setItem(what, string);
    }

    static colorize(what): string {
        let randomColor = '#' + Math.random().toString(16).substr(-3);
        return `<span style="color:${randomColor}">${what}</span>`;
    }

    static printLine(line: string): void {
        spanId += 1;
        let node = document.createElement("span");
        let content = document.getElementById("actions");
        node.id = "message_" + spanId;
        node.style.whiteSpace = "normal";
        node.innerHTML = '<span class="iClass">></span>' + line + "<br>";
        content.insertBefore(node, content.childNodes[0]);
        let childNodes = document.getElementById("actions").childElementCount;
        if (childNodes >= 50) {
            let oldNode = document.getElementById("message_" + spanIdToRemove);
            oldNode.remove();
            spanIdToRemove += 1;
        }
    }

    static span(line, color): string {
        return `<span style=color:${color}>${line}</span>`
    }

    static dice(times: number, sides: number): number {
        return (Math.floor(Math.random() * sides) + 1) * times;
    }

    static chance(what: number): boolean {
        let value = Math.ceil(Math.random() * 100);
        return value <= what;
    }
    static range(max: number, min: number): number {
        return Math.random() * (max - min) + min;
    }

    static distance(p1: number[], p2: number[]): any {
        return Math.sqrt(Math.pow((p1[1] - p1[0]), 2) + Math.pow((p2[1] - p2[0]), 2));
    }
}
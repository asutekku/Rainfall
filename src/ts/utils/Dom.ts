/**
 * Browser-only helpers. Everything here touches the DOM or Web Storage and
 * must not be imported by the headless game logic (actors, items, combat).
 */
let spanId: number = 0;
let spanIdToRemove: number = 1;

export class Dom {
    public static l(what: string): HTMLElement | null {
        return document.getElementById(what);
    }

    public static create(what: string): HTMLElement | null {
        return document.createElement(what);
    }

    public static save(what: string, string: string): void {
        return localStorage.setItem(what, string);
    }

    public static printLine(line: string): void {
        spanId += 1;
        const node = document.createElement("span");
        const content = document.getElementById("actions")!;
        node.id = "message_" + spanId;
        node.classList.add("actionMessage");
        node.innerHTML = `<span class="messageArrow">></span>${line}<br>`;
        content.insertBefore(node, content.childNodes[0] ?? null);
        if (content.childElementCount >= 50) {
            const oldNode = document.getElementById("message_" + spanIdToRemove)!;
            oldNode.remove();
            spanIdToRemove += 1;
        }
    }
}

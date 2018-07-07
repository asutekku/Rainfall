import {getItem} from "../interact/getItem";
import {Item} from "../items/Item";
import {Weapon} from "../items/Weapon";

export class Paper {
    static paperElement(id?: string, className?: string): HTMLElement {
        const element = document.createElement("div");
        if (className !== undefined && className !== "") {
            element.setAttribute("class", className);
        }
        if (id !== undefined || id !== "") element.id = id!;
        return element;
    }

    static paperStatCard(title: string, value?: string, description?: string, valueID?: string): HTMLElement {
        const element: HTMLElement = this.paperElement();
        element.setAttribute("class", "statCard tooltip");
        const statTitle = document.createElement("span");
        const statValue = document.createElement("span");
        statTitle.textContent = title;
        statValue.textContent = value ? value : "";
        if (description !== null || description !== "") {
            const toolTipText = document.createElement("span");
            toolTipText.setAttribute("class", "tooltiptext");
            toolTipText.textContent = description!;
            element.appendChild(toolTipText);
        }
        statTitle.setAttribute("class", "statTitle");
        statValue.setAttribute("class", "statValue");
        statValue.id = `${title.substring(0, 3).toUpperCase()}_val`;
        element.appendChild(statTitle);
        element.appendChild(statValue);
        return element;
    }

    static paperContainer(id: string, className?: string, title?: string): HTMLElement {
        let element = this.paperElement(id, className);
        element.id = id;
        if (title !== null && title !== "") {
            const header = document.createElement("h2");
            header.classList.add("containerHeader");
            header.textContent = title!;
            element.appendChild(header);
        }
        if (className !== null && className !== "") element.setAttribute("class", className!);
        return element;
    }

    static paperInfoContainer(id?: string, className?: string, title?: string): HTMLElement {
        let element = this.paperElement(id, className);
        if (className !== null && className !== "") element.setAttribute("class", className!);
        if (id !== null) element.id = id!;
        if (title !== undefined) {
            let containerTitle = document.createElement("h2");
            containerTitle.textContent = title;
            containerTitle.setAttribute("class", "statTitle vital");
            element.appendChild(containerTitle);
        }
        return element;
    }

    static paperInventoryItem(item: Item): HTMLElement {
        let itemElement = this.paperElement(item.id);
        itemElement.setAttribute("class", "inventoryItem");
        let itemTitle = document.createElement("span");
        let itemType = document.createElement("span");
        let itemCount = document.createElement("span");
        itemTitle.setAttribute("class", "itemTitle");
        itemType.setAttribute("class", "itemType");
        itemCount.setAttribute("class", "itemCount");
        let embed = item.bodypart ? item.bodypart : item.type;
        let itemEquipped = document.createElement("span");
        itemTitle.textContent = item.name;
        itemType.textContent = item.type == "weapons" ? (item as Weapon).weaponType : item.type;
        itemCount.textContent = "1x";
        itemEquipped.textContent = "";
        itemElement.appendChild(itemType);
        itemElement.appendChild(itemTitle);
        itemElement.appendChild(itemEquipped);
        itemElement.appendChild(itemCount);
        itemElement.classList.add(embed + "_node");
        itemElement.onclick = function () {
            if (item.equipped) {
                itemElement.classList.remove("activeSelection");
            } else {
                Array.from(document.getElementById("inventoryItems")!.childNodes)!
                    .filter((e: any) => {
                        return e.classList.contains(embed + "_node");
                    })
                    .forEach((item: any) => item.classList.remove("activeSelection"));
                itemElement.classList.add("activeSelection");
            }
            getItem.useItem(item);
        };
        return itemElement;
    }
}

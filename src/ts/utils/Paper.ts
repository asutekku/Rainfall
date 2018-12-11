import {GetItem} from "../interact/getItem";
import {Armor} from "../items/Armor";
import {Item} from "../items/Item";
import {Weapon} from "../items/Weapon";

let selected: Item | undefined;

export class Paper {
    public static paperElement(id?: string, className?: string): HTMLElement {
        const element = document.createElement("div");
        if (className !== undefined && className !== "") {
            element.setAttribute("class", className);
        }
        if (id !== undefined || id !== "") {
            element.id = id!;
        }
        return element;
    }

    public static paperStatCard(title: string, value?: string, description?: string, valueID?: string): HTMLElement {
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

    public static paperContainer(id: string, className?: string, title?: string): HTMLElement {
        const element = this.paperElement(id, className);
        element.id = id;
        if (title !== null && title !== "") {
            const header = document.createElement("h2");
            header.classList.add("containerHeader");
            header.textContent = title!;
            element.appendChild(header);
        }
        if (className !== null && className !== "") {
            element.setAttribute("class", className!);
        }
        return element;
    }

    public static paperInfoContainer(id?: string, className?: string, title?: string): HTMLElement {
        const element = this.paperElement(id, className);
        if (className !== null && className !== "") {
            element.setAttribute("class", className!);
        }
        if (id !== null) {
            element.id = id!;
        }
        if (title !== undefined) {
            const containerTitle = document.createElement("h2");
            containerTitle.textContent = title;
            containerTitle.setAttribute("class", "statTitle vital");
            element.appendChild(containerTitle);
        }
        return element;
    }

    public static paperInventoryItem(item: Item): HTMLElement {
        const itemElement = this.paperElement(item.id);
        itemElement.setAttribute("class", "inventoryItem");
        const itemTitle = document.createElement("span");
        const itemType = document.createElement("span");
        const itemCount = document.createElement("span");
        itemTitle.setAttribute("class", "itemTitle");
        itemType.setAttribute("class", "itemType");
        itemCount.setAttribute("class", "itemCount");
        const embed = item.bodypart ? item.bodypart : item.type;
        const itemEquipped = document.createElement("span");
        itemTitle.textContent = item.name;
        itemType.textContent = item.type === "weapons" ? (item as Weapon).weaponType : item.type;
        itemCount.textContent = "1x";
        itemEquipped.textContent = "";
        itemEquipped.classList.add("itemEquipped");
        itemElement.appendChild(itemType);
        itemElement.appendChild(itemTitle);
        itemElement.appendChild(itemEquipped);
        itemElement.appendChild(itemCount);
        itemElement.classList.add(embed + "_node");
        itemElement.onclick = () => {
            const infoContainer = document.getElementById("itemStatsContainer")!;
            const infoExtraContainer = document.getElementById("itemExtraContainer")!;
            infoContainer.innerHTML = "";
            infoExtraContainer.innerHTML = "";
            if (selected === item) {
                itemElement.classList.remove("activeSelection");
                selected = undefined;
            } else {
                selected = item;
                Array.from(document.getElementById("inventoryItems")!.childNodes)!.forEach((item: any) =>
                    item.classList.remove("activeSelection"),
                );
                itemElement.classList.add("activeSelection");
                infoContainer.appendChild(Paper.paperInventoryItemInfo(item));
                if (item instanceof Weapon) {
                    infoExtraContainer.appendChild(Paper.weaponStats(item as Weapon));
                    infoExtraContainer.appendChild(Paper.equipButton(item as Weapon));
                } else if (item instanceof Armor) {
                    infoExtraContainer.appendChild(Paper.equipButton(item as Armor));
                }
            }
        };
        return itemElement;
    }

    public static paperInventoryItemInfo(item: Item): DocumentFragment {
        const fragment: DocumentFragment = document.createDocumentFragment(),
            itemTitleContainer: HTMLDivElement = document.createElement("div"),
            itemTitle: HTMLSpanElement = document.createElement("span");
        itemTitleContainer.classList.add("inventoryItemInfoTitle");
        itemTitle.textContent = item.name.toString();
        itemTitleContainer.appendChild(itemTitle);
        fragment.appendChild(itemTitleContainer);
        if (item instanceof Weapon) {
            fragment.appendChild(Paper.inventoryInfoItem("Manufacturer: ", (item as Weapon).manufacturer));
            if (item.ammoType !== "") {
                fragment.appendChild(Paper.inventoryInfoItem("Ammo type: ", (item as Weapon).ammoType));
            }
        } else if (item instanceof Armor) {
            fragment.appendChild(Paper.inventoryInfoItem("Type: ", (item as Armor).bodypart));
            fragment.appendChild(Paper.inventoryInfoItem("Set: ", (item as Armor).set));
        }
        fragment.appendChild(Paper.inventoryInfoItem("Description: ", (item as Weapon).description));
        return fragment;
    }

    public static weaponStats(weapon: Weapon): DocumentFragment {
        const fragment: DocumentFragment = document.createDocumentFragment(),
            statContainer: HTMLDivElement = document.createElement("div"),
            statsTitleContainer: HTMLHeadingElement = document.createElement("div"),
            statsTitle: HTMLSpanElement = document.createElement("span");
        statContainer.classList.add("weaponStatContainer");
        statsTitleContainer.classList.add("inventoryItemInfoTitle");
        statsTitle.textContent = "Weapon stats:";
        statContainer.appendChild(Paper.paperProgressBar("Damage", weapon.averageDamage(), 750));
        statContainer.appendChild(Paper.paperProgressBar("Range", weapon.range, 1000, "m"));
        statContainer.appendChild(Paper.paperProgressBar("Rate of Fire", weapon.rateOfFire, 50));
        statContainer.appendChild(Paper.paperProgressBar("Accuracy", weapon.accuracy, 100, "%"));
        statContainer.appendChild(Paper.paperProgressBar("Critical chance", weapon.crit, 100, "%"));
        statContainer.appendChild(Paper.paperProgressBar("Clip size", weapon.shots, 50));
        statsTitleContainer.appendChild(statsTitle);
        fragment.appendChild(statsTitleContainer);
        fragment.appendChild(statContainer);
        return fragment;
    }

    public static inventoryInfoItem(title: string, content: string): DocumentFragment {
        const frag: DocumentFragment = document.createDocumentFragment(),
            itemContainer: HTMLDivElement = document.createElement("div"),
            itemTitle: HTMLDivElement = document.createElement("div"),
            itemContent: HTMLSpanElement = document.createElement("span");
        itemTitle.textContent = title;
        itemContent.textContent = content;
        itemContainer.classList.add("inventoryItemInfoContainer");
        itemTitle.classList.add("itemInfoPrimary");
        itemContent.classList.add("itemInfoSecondary");
        itemTitle.appendChild(itemContent);
        itemContainer.appendChild(itemTitle);
        frag.appendChild(itemContainer);
        return frag;
    }

    public static equipButton(item: Item): DocumentFragment {
        const frag = document.createDocumentFragment(),
            equipButton = document.createElement("button");
        equipButton.textContent = item.equipped ? "Unequip" : "Equip";
        equipButton.classList.add("button");
        equipButton.classList.add("inventoryButton");
        equipButton.onclick = () => {
            if (!item.equipped) {
                equipButton.textContent = "Unequip";
                equipButton.classList.add("buttonActiveSelection");
            } else {
                equipButton.textContent = "Equip";
                equipButton.classList.remove("buttonActiveSelection");
            }
            GetItem.useItem(item);
        };
        frag.appendChild(equipButton);
        return frag;
    }

    public static paperProgressBar(title: string, value: number, max: number, modifier?: string): DocumentFragment {
        const frag: DocumentFragment = document.createDocumentFragment(),
            progressContainer: HTMLDivElement = document.createElement("div"),
            progressBar: HTMLProgressElement = document.createElement("progress"),
            progressTitle: HTMLDivElement = document.createElement("div"),
            progressbarContainer: HTMLDivElement = document.createElement("div"),
            progressValue: HTMLDivElement = document.createElement("div");
        progressTitle.textContent = `${title}:`;
        progressTitle.classList.add("progressTitle");
        progressBar.value = value;
        progressBar.classList.add("progressBar");
        progressValue.textContent = `${value.toString()}${modifier ? modifier : ""}`;
        progressValue.classList.add("progressValue");
        progressBar.max = max;
        progressContainer.classList.add("progressContainer");
        progressbarContainer.classList.add("progressbarContainer");
        progressContainer.appendChild(progressTitle);
        progressbarContainer.appendChild(progressBar);
        progressbarContainer.appendChild(progressValue);
        progressContainer.appendChild(progressbarContainer);
        frag.appendChild(progressContainer);
        return frag;
    }
}

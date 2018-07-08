import {getItem} from "../interact/getItem";
import {Item} from "../items/Item";
import {Weapon} from "../items/Weapon";

let selected: Item | undefined;

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
            const infoContainer = document.getElementById("itemStatsContainer")!;
            const infoExtraContainer = document.getElementById("itemExtraContainer")!;
            infoContainer.innerHTML = "";
            infoExtraContainer.innerHTML = "";
            if (selected === item) {
                itemElement.classList.remove("activeSelection");
                selected = undefined;
            } else {
                selected = item;
                Array.from(document.getElementById("inventoryItems")!.childNodes)!
                    .filter((e: any) => {
                        return e.classList.contains(embed + "_node");
                    })
                    .forEach((item: any) => item.classList.remove("activeSelection"));
                itemElement.classList.add("activeSelection");
                infoContainer.appendChild(Paper.paperInventoryItemInfo(item));
                if (item instanceof Weapon) {
                    infoExtraContainer.appendChild(Paper.weaponStats(item as Weapon));
                    infoExtraContainer.appendChild(Paper.equipButton(item as Weapon));
                }
            }
        };
        return itemElement;
    }

    static paperInventoryItemInfo(item: Item): DocumentFragment {
        let fragment: DocumentFragment = document.createDocumentFragment(),
            itemTitleContainer: HTMLDivElement = document.createElement("div"),
            itemDescriptionContainer: HTMLDivElement = document.createElement("div"),
            itemDescription: HTMLDivElement = document.createElement("div"),
            itemDescriptionSpan: HTMLSpanElement = document.createElement("span"),
            itemTitle: HTMLSpanElement = document.createElement("span");
        itemTitleContainer.classList.add("inventoryItemInfoTitle");
        itemDescriptionContainer.classList.add("inventoryItemInfoContainer");
        itemDescription.textContent = "Description: ";
        itemDescription.classList.add("itemInfoPrimary");
        itemDescriptionSpan.classList.add("itemInfoSecondary");
        itemDescriptionSpan.textContent = item.description;
        itemTitle.textContent = item.name.toString();
        itemTitleContainer.appendChild(itemTitle);
        fragment.appendChild(itemTitleContainer);
        if (item instanceof Weapon) {
            let manufactContainer: HTMLDivElement = document.createElement("div"),
                manufactTitle: HTMLDivElement = document.createElement("div"),
                manufacturer: HTMLSpanElement = document.createElement("span");
            manufactTitle.textContent = "Manufacturer: ";
            manufactTitle.classList.add("itemInfoPrimary");
            manufactContainer.classList.add("inventoryItemInfoContainer");
            manufacturer.textContent = (item as Weapon).manufacturer;
            manufacturer.classList.add("weaponManufacturer","itemInfoSecondary");
            manufactContainer.appendChild(manufactTitle);
            manufactTitle.appendChild(manufacturer);
            fragment.appendChild(manufactContainer);
        }
        itemDescription.appendChild(itemDescriptionSpan);
        itemDescriptionContainer.appendChild(itemDescription);
        fragment.appendChild(itemDescriptionContainer);
        return fragment;
    }

    static weaponStats(weapon: Weapon): DocumentFragment {
        let fragment: DocumentFragment = document.createDocumentFragment(),
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

    static equipButton(item: Item): DocumentFragment {
        let frag = document.createDocumentFragment(),
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
            getItem.useItem(item);
        };
        frag.appendChild(equipButton);
        return frag;
    }

    static paperProgressBar(title: string, value: number, max: number, modifier?: string): DocumentFragment {
        let frag: DocumentFragment = document.createDocumentFragment(),
            progressContainer: HTMLDivElement = document.createElement("div"),
            progressBar: HTMLProgressElement = document.createElement("progress"),
            progressTitle: HTMLDivElement = document.createElement("div"),
            progressbarContainer: HTMLDivElement = document.createElement("div"),
            progressValue: HTMLDivElement = document.createElement("div");
        progressTitle.textContent = `${title}:`;
        progressTitle.classList.add("progressTitle");
        progressBar.value = value;
        progressBar.classList.add("progressBar");
        progressValue.textContent = `${value.toString()}${modifier ? modifier : ''}`;
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

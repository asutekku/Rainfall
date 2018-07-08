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
            const infoContainer = document.getElementById("itemInfoContainer")!;
            infoContainer.innerHTML = "";
            if (item.equipped) {
                itemElement.classList.remove("activeSelection");
            } else {
                Array.from(document.getElementById("inventoryItems")!.childNodes)!
                    .filter((e: any) => {
                        return e.classList.contains(embed + "_node");
                    })
                    .forEach((item: any) => item.classList.remove("activeSelection"));
                itemElement.classList.add("activeSelection");
                infoContainer.appendChild(Paper.paperInventoryItemInfo(item));
            }
            getItem.useItem(item);
        };
        return itemElement;
    }

    static paperInventoryItemInfo(item: Item): DocumentFragment {
        let fragment: DocumentFragment = document.createDocumentFragment();
        let itemTitleContainer: HTMLDivElement = document.createElement("div");
        let itemDescriptionContainer: HTMLDivElement = document.createElement("div");
        itemTitleContainer.classList.add("inventoryItemInfoTitle");
        itemDescriptionContainer.classList.add("inventoryItemInfoDescription");
        let itemTitle: HTMLSpanElement = document.createElement("span");
        itemTitle.textContent = item.name.toString();
        itemDescriptionContainer.textContent = item.description;
        itemTitleContainer.appendChild(itemTitle);
        fragment.appendChild(itemTitleContainer);
        fragment.appendChild(itemDescriptionContainer);
        if (item instanceof Weapon) {
            fragment.appendChild(Paper.paperProgressBar("Damage",(item as Weapon).averageDamage(),750));
            fragment.appendChild(Paper.paperProgressBar("Range",(item as Weapon).range,1000,"m"));
            fragment.appendChild(Paper.paperProgressBar("Rate of Fire",(item as Weapon).rateOfFire,50));
            fragment.appendChild(Paper.paperProgressBar("Accuracy",(item as Weapon).accuracy,100,"%"));
            fragment.appendChild(Paper.paperProgressBar("Critical chance",(item as Weapon).crit,100,"%"));
            fragment.appendChild(Paper.paperProgressBar("Clip size",(item as Weapon).shots,50));
        }
        return fragment;
    }

    static paperProgressBar(title: string, value: number, max: number,modifier?:string): DocumentFragment {
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

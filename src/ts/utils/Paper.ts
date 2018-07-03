export class Paper {
    static paperElement(id?: string, className?: string): HTMLElement {
        const element = document.createElement("div");
        element.setAttribute("class", "paperElement");
        if (className !== undefined || className !== "") {
            element.setAttribute("class", className);
        }
        if (id !== undefined || id !== "") element.id = id;
        return element;
    }

    static paperStatCard(title: string, value?: string, description?: string): HTMLElement {
        const element: HTMLElement = this.paperElement();
        element.setAttribute("class", "statCard tooltip");
        const statTitle = document.createElement("span");
        const statValue = document.createElement("span");
        statTitle.textContent = title;
        statValue.textContent = value;
        if (description !== undefined) {
            const toolTipText = document.createElement("span");
            toolTipText.setAttribute("class", "tooltiptext");
            toolTipText.textContent = description;
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
        let element = this.paperElement(className, id);
        element.id = id;
        if (title !== null) {
            const header = document.createElement("h2");
            header.classList.add("containerHeader");
            header.textContent = title;
            element.appendChild(header);
        }
        if (className !== null || className !== "") element.setAttribute("class", className);
        return element;
    }
}
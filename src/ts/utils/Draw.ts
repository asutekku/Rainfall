export class Draw {
    static drawLine(context: CanvasRenderingContext2D, start: number[], end: number[], color: string) {
        let ctx = context;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(start[0], start[1]);
        ctx.lineTo(end[0], end[1]);
        ctx.stroke();
    }

    static clearCanvas(canvas: HTMLCanvasElement) {
        let ctx = canvas.getContext("2d")!;
        ctx.clearRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    }

    static updateCanvas(canvas: HTMLCanvasElement): void {
        canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    }
}

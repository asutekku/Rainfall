export class Draw {
    static drawLine(context: CanvasRenderingContext2D, start: number[], end: number[], color: string) {
        let ctx = context;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(start[0], start[1]);
        ctx.lineTo(end[0], end[1]);
        ctx.stroke();
    }

    static clearCanvas(context: CanvasRenderingContext2D){
        context.clearRect(0,0,canvas.width,canvas.height);
    }
}
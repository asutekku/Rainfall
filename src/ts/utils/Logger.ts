export type LogSink = (line: string) => void;

/**
 * Decouples the game logic from how messages are rendered. The logic layer
 * calls Logger.log(); a host (the browser bootstrap) installs a sink that
 * actually displays the line. The default sink is a no-op so the logic runs
 * headless (Node, tests) without a DOM.
 */
export class Logger {
    private static sink: LogSink = () => {
        /* headless default: swallow the line */
    };

    public static setSink(sink: LogSink): void {
        Logger.sink = sink;
    }

    public static log(line: string): void {
        Logger.sink(line);
    }
}

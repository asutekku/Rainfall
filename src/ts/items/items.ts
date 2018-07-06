import { Medical, Scrap } from "./Scrap";

let items = [
    new Scrap("clothing", "Pants", 20, "something"),
    new Scrap("clothing", "Top", 20, "something"),
    new Scrap("clothing", "Jacket", 20, "something"),
    new Scrap("clothing", "Footwear", 20, "something"),
    new Scrap("clothing", "Jewelry", 20, "something"),
    new Scrap("clothing", "Mirrorshades", 25, "something"),
    new Scrap("clothing", "Contact Lenses", 20, "something"),
    new Scrap("clothing", "Glasses", 20, "something"),
    new Scrap(
        "tool",
        "Techscanner",
        600,
        "A small handheld microcomputer with various I/O connectors and probes. Techscanners run diagnostic programs, identify and examine malfunctioning components and display internal schematics on small screen."
    ),
    new Scrap(
        "tool",
        "Cutting Torch",
        40,
        "Common oxy/acetalyne type out of bottle. Hand held, about a foot long. More powerful models are available up to thermite lances."
    ),
    new Scrap("tool", "Tech Toolkit", 100, "Mixed kit of tools for repair of mechanical items."),
    new Scrap("tool", "B & E Tools", 120, "Advanced mixed kit of tools for repair of mechanical items."),
    new Scrap("tool", "Electronics Toolkit", 120, "Advanced mixed kit of tools for repair of mechanical items."),
    new Scrap(
        "tool",
        "Protective Goggles",
        20,
        "Protecite eyem-ar lor welding, metal machining work. chemical mining. etc."
    ),
    new Scrap(
        "tool",
        "Flashlight",
        2,
        "You all know what this is. Beam range 100‘-120' Can buy smaller pocket lights (114 range) for half the normal cost,"
    ),
    new Scrap(
        "tool",
        "Glowstick",
        1,
        "Chemlight in a 6‘ plastic tube. Shake or break to activate. Soft light lasts up to 6 hours. Comes In green, blue, red."
    ),
    new Scrap(
        "tool",
        "Flash Paint",
        10,
        "Fluorescent paint gives off soft light equal to Glowstick, lasts up to 4 hours."
    ),
    new Scrap(
        "tool",
        "Flash Tape",
        10,
        "Fluorescent tape gives off soft light equal to Glowstick, lasts up to 6 hours."
    ),
    new Scrap("tool", "Rope", 2, "Braided synthetics in a variety of thicknesses and weights. Can hold up to 1000kg"),
    new Scrap(
        "tool",
        "Breathing Mask",
        30,
        "A common painter's style mask; nose and mouth coverage, with two replacable filters  on the sides. Good for keeping out the smog."
    ),
    new Scrap(
        "misc",
        "Holo Generator",
        500,
        "Small box (10cmx5cmx10cm) projects a holographic picture from a replacable chip. Generator is compatible with chips from most digital cameras. Can be linked with a digital Recorder/Player."
    ),
    new Scrap("misc", "Laptop", 900, "Something"),
    new Scrap("misc", "Mastoid Commo", 100, "Something"),
    new Scrap("misc", "Binoglasses", 200, "Something"),
    new Scrap("misc", "Movie", 10, "Something"),
    new Scrap("misc", "Keylock", 20, "Something"),
    new Medical("medical", "Dermal Stapler", 1000, 500, "Staple it"),
    new Medical("medical", "Bandaids", 10, 40, "Don't kill yourself"),
    new Medical("medical", "Medi-X", 20, 80, "Something"),
    new Scrap("misc", "Nylon Carrybag", 5, "Something"),
    new Scrap("misc", "Cell Phone Service Contract", 100, "Something"),
    new Scrap("misc", "Kibble", 100, "Something"),
    new Scrap("misc", "Coffin", 20, "Something")
];
export default items;

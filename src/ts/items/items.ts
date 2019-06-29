import {Medical, Scrap} from "./Scrap";

const items = [
    new Scrap("Pants", 20, "something"),
    new Scrap("Top", 20, "something"),
    new Scrap("Jacket", 20, "something"),
    new Scrap("Footwear", 20, "something"),
    new Scrap("Jewelry", 20, "something"),
    new Scrap("Mirrorshades", 25, "something"),
    new Scrap("Contact Lenses", 20, "something"),
    new Scrap("Glasses", 20, "something"),
    new Scrap(
        "Techscanner",
        600,
        "A small handheld microcomputer with various I/O connectors and probes. Techscanners run diagnostic programs, identify and examine malfunctioning components and display internal schematics on small screen.",
    ),
    new Scrap(
        "Cutting Torch",
        40,
        "Common oxy/acetalyne type out of bottle. Hand held, about a foot long. More powerful models are available up to thermite lances.",
    ),
    new Scrap(
        "Tech Toolkit",
        100,
        "Mixed kit of tools for repair of mechanical items.",
    ),
    new Scrap(
        "B & E Tools",
        120,
        "Advanced mixed kit of tools for repair of mechanical items.",
    ),
    new Scrap(
        "Electronics Toolkit",
        120,
        "Advanced mixed kit of tools for repair of mechanical items.",
    ),
    new Scrap(
        "Protective Goggles",
        20,
        "Protecite eyem-ar lor welding, metal machining work. chemical mining. etc.",
    ),
    new Scrap(
        "Flashlight",
        2,
        "You all know what this is. Beam getRandomInt 100‘-120' Can buy smaller pocket lights (114 getRandomInt) for half the normal cost,",
    ),
    new Scrap(
        "Glowstick",
        1,
        "Chemlight in a 6‘ plastic tube. Shake or break to activate. Soft light lasts up to 6 hours. Comes In green, blue, red.",
    ),
    new Scrap(
        "Flash Paint",
        10,
        "Fluorescent paint gives off soft light equal to Glowstick, lasts up to 4 hours.",
    ),
    new Scrap(
        "Flash Tape",
        10,
        "Fluorescent tape gives off soft light equal to Glowstick, lasts up to 6 hours.",
    ),
    new Scrap(
        "Rope",
        2,
        "Braided synthetics in a variety of thicknesses and weights. Can hold up to 1000kg",
    ),
    new Scrap(
        "Breathing Mask",
        30,
        "A common painter's style mask; nose and mouth coverage, with two replacable filters  on the sides. Good for keeping out the smog.",
    ),
    new Scrap(
        "Holo Generator",
        500,
        "Small box (10cmx5cmx10cm) projects a holographic portrait from a replacable chip. Generator is compatible with chips from most digital cameras. Can be linked with a digital Recorder/Player.",
    ),
    new Scrap("Laptop", 900, "Something",),
    new Scrap("Mastoid Commo", 100, "Something",),
    new Scrap("Binoglasses", 200, "Something",),
    new Scrap("Movie", 10, "Something",),
    new Scrap("Keylock", 20, "Something",),
    new Scrap("Nylon Carrybag", 5, "Something",),
    new Scrap("Cell Phone Service Contract", 100, "Something",),
    new Scrap("Kibble", 100, "Something",),
    new Scrap("Coffin", 20, "Something",),
    new Medical("Dermal Stapler", 1000, 500, "Staple it",),
    new Medical("Bandaids", 10, 40, "Don't kill yourself",),
    new Medical("Medi-X", 20, 80, "Something",),
];
export default items;

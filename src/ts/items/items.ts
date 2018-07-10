import { Medical, Scrap } from "./Scrap";

let items = [
    new Scrap("misc", "clothing", "Pants", 20, "something", "misc_pants"),
    new Scrap("misc", "clothing", "Top", 20, "something", "misc_top"),
    new Scrap("misc", "clothing", "Jacket", 20, "something", "misc_jacket"),
    new Scrap("misc", "clothing", "Footwear", 20, "something", "misc_footwear"),
    new Scrap("misc", "clothing", "Jewelry", 20, "something", "misc_jewel"),
    new Scrap("misc", "clothing", "Mirrorshades", 25, "something", "misc_mirrorshades"),
    new Scrap("misc", "clothing", "Contact Lenses", 20, "something", "misc_contact"),
    new Scrap("misc", "clothing", "Glasses", 20, "something", "misc_glasses"),
    new Scrap(
        "misc",
        "tool",
        "Techscanner",
        600,
        "A small handheld microcomputer with various I/O connectors and probes. Techscanners run diagnostic programs, identify and examine malfunctioning components and display internal schematics on small screen.",

        "misc_techscanner"
    ),
    new Scrap(
        "misc",
        "tool",
        "Cutting Torch",
        40,
        "Common oxy/acetalyne type out of bottle. Hand held, about a foot long. More powerful models are available up to thermite lances.",
        "misc_cutTorch"
    ),
    new Scrap(
        "misc",
        "tool",
        "Tech Toolkit",
        100,
        "Mixed kit of tools for repair of mechanical items.",
        "misc_teToolkit"
    ),
    new Scrap(
        "misc",
        "tool",
        "B & E Tools",
        120,
        "Advanced mixed kit of tools for repair of mechanical items.",
        "misc_BEtools"
    ),
    new Scrap(
        "misc",
        "tool",
        "Electronics Toolkit",
        120,
        "Advanced mixed kit of tools for repair of mechanical items.",
        "misc_elToolkit"
    ),
    new Scrap(
        "misc",
        "tool",
        "Protective Goggles",
        20,
        "Protecite eyem-ar lor welding, metal machining work. chemical mining. etc.",
        "misc_protGoggles"
    ),
    new Scrap(
        "misc",
        "tool",
        "Flashlight",
        2,
        "You all know what this is. Beam range 100‘-120' Can buy smaller pocket lights (114 range) for half the normal cost,",
        "misc_flashlight"
    ),
    new Scrap(
        "misc",
        "tool",
        "Glowstick",
        1,
        "Chemlight in a 6‘ plastic tube. Shake or break to activate. Soft light lasts up to 6 hours. Comes In green, blue, red.",
        "misc_glowstick"
    ),
    new Scrap(
        "misc",
        "tool",
        "Flash Paint",
        10,
        "Fluorescent paint gives off soft light equal to Glowstick, lasts up to 4 hours.",
        "misc_flashPaint"
    ),
    new Scrap(
        "misc",
        "tool",
        "Flash Tape",
        10,
        "Fluorescent tape gives off soft light equal to Glowstick, lasts up to 6 hours.",
        "misc_fluorTape"
    ),
    new Scrap(
        "misc",
        "tool",
        "Rope",
        2,
        "Braided synthetics in a variety of thicknesses and weights. Can hold up to 1000kg",
        "misc_"
    ),
    new Scrap(
        "misc",
        "tool",
        "Breathing Mask",
        30,
        "A common painter's style mask; nose and mouth coverage, with two replacable filters  on the sides. Good for keeping out the smog.",
        "misc_breathMask"
    ),
    new Scrap(
        "misc",
        "misc",
        "Holo Generator",
        500,
        "Small box (10cmx5cmx10cm) projects a holographic picture from a replacable chip. Generator is compatible with chips from most digital cameras. Can be linked with a digital Recorder/Player.",
        "misc_holoGen"
    ),
    new Scrap("misc", "misc", "Laptop", 900, "Something", "misc_laptop"),
    new Scrap("misc", "misc", "Mastoid Commo", 100, "Something", "misc_mastCommo"),
    new Scrap("misc", "misc", "Binoglasses", 200, "Something", "misc_binoglass"),
    new Scrap("misc", "misc", "Movie", 10, "Something", "misc_movie"),
    new Scrap("misc", "misc", "Keylock", 20, "Something", "misc_keylock"),
    new Scrap("misc", "misc", "Nylon Carrybag", 5, "Something", "misc_nylonBag"),
    new Scrap("misc", "misc", "Cell Phone Service Contract", 100, "Something", "misc_cellService"),
    new Scrap("misc", "misc", "Kibble", 100, "Something", "misc_kibble"),
    new Scrap("misc", "misc", "Coffin", 20, "Something", "misc_coffin"),
    new Medical("medical", "Dermal Stapler", 1000, 500, "Staple it", "misc_dermar"),
    new Medical("medical", "Bandaids", 10, 40, "Don't kill yourself", "misc_bandaids"),
    new Medical("medical", "Medi-X", 20, 80, "Something", "misc_medix")
];
export default items;

define(["require", "exports", "./Scrap"], function (require, exports, Scrap_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var items = [
        new Scrap_1.Scrap("clothing", "Pants", 20, "something"),
        new Scrap_1.Scrap("clothing", "Top", 20, "something"),
        new Scrap_1.Scrap("clothing", "Jacket", 20, "something"),
        new Scrap_1.Scrap("clothing", "Footwear", 20, "something"),
        new Scrap_1.Scrap("clothing", "Jewelry", 20, "something"),
        new Scrap_1.Scrap("clothing", "Mirrorshades", 25, "something"),
        new Scrap_1.Scrap("clothing", "Contact Lenses", 20, "something"),
        new Scrap_1.Scrap("clothing", "Glasses", 20, "something"),
        new Scrap_1.Scrap("tool", "Techscanner", 600, "A small handheld microcomputer with various I/O connectors and probes. Techscanners run diagnostic programs, identify and examine malfunctioning components and display internal schematics on small screen."),
        new Scrap_1.Scrap("tool", "Cutting Torch", 40, "Common oxy/acetalyne type out of bottle. Hand held, about a foot long. More powerful models are available up to thermite lances."),
        new Scrap_1.Scrap("tool", "Tech Toolkit", 100, "Mixed kit of tools for repair of mechanical items."),
        new Scrap_1.Scrap("tool", "B & E Tools", 120, "Advanced mixed kit of tools for repair of mechanical items."),
        new Scrap_1.Scrap("tool", "Electronics Toolkit", 120, "Advanced mixed kit of tools for repair of mechanical items."),
        new Scrap_1.Scrap("tool", "Protective Goggles", 20, "Protecite eyem-ar lor welding, metal machining work. chemical mining. etc."),
        new Scrap_1.Scrap("tool", "Flashlight", 2, "You all know what this is. Beam range 100‘-120' Can buy smaller pocket lights (114 range) for half the normal cost,"),
        new Scrap_1.Scrap("tool", "Glowstick", 1, "Chemlight in a 6‘ plastic tube. Shake or break to activate. Soft light lasts up to 6 hours. Comes In green, blue, red."),
        new Scrap_1.Scrap("tool", "Flash Paint", 10, "Fluorescent paint gives off soft light equal to Glowstick, lasts up to 4 hours."),
        new Scrap_1.Scrap("tool", "Flash Tape", 10, "Fluorescent tape gives off soft light equal to Glowstick, lasts up to 6 hours."),
        new Scrap_1.Scrap("tool", "Rope", 2, "Braided synthetics in a variety of thicknesses and weights. Can hold up to 1000kg"),
        new Scrap_1.Scrap("tool", "Breathing Mask", 30, "A common painter's style mask; nose and mouth coverage, with two replacable filters  on the sides. Good for keeping out the smog."),
        new Scrap_1.Scrap("random", "Holo Generator", 500, 'Small box (10cmx5cmx10cm) projects a holographic picture from a replacable chip. Generator is compatible with chips from most digital cameras. Can be linked with a digital Recorder/Player.'),
        new Scrap_1.Scrap("random", "Laptop", 900, "Something"),
        new Scrap_1.Scrap("random", "Mastoid Commo", 100, "Something"),
        new Scrap_1.Scrap("random", "Binoglasses", 200, "Something"),
        new Scrap_1.Scrap("random", "Movie", 10, "Something"),
        new Scrap_1.Scrap("random", "Keylock", 20, "Something"),
        new Scrap_1.Medical("medical", "Dermal Stapler", 1000, 500, 20),
        new Scrap_1.Medical("medical", "Bandaids", 10, "don't get hurt", 40),
        new Scrap_1.Medical("medical", "Medi-X", 20, 80, "Something"),
        new Scrap_1.Scrap("random", "Nylon Carrybag", 5, "Something"),
        new Scrap_1.Scrap("random", "Cell Phone Service Contract", 100, "Something"),
        new Scrap_1.Scrap("random", "Kibble", 100, "Something"),
        new Scrap_1.Scrap("random", "Coffin", 20, "Something")
    ];
    exports.default = items;
});

#!/usr/bin/env python3
"""Generate src/objects/weapons.ts from the Cyberpunk RED weapon spreadsheet."""
import json, re, datetime

rows = json.load(open('tools/weapons_src.json'))

# --- weapon Category -> DV-table class (see rangeTable.ts) + default max range (m) ---
CLASS_RANGE = {
    'Light Melee Weapon': ('melee', 2), 'Medium Melee Weapon': ('melee', 2),
    'Heavy Melee Weapon': ('melee', 2), 'Very Heavy Melee Weapon': ('melee', 2),
    'Light Handgun': ('pistol', 50), 'Medium Handgun': ('pistol', 50),
    'Heavy Handgun': ('pistol', 50), 'Very Heavy Handgun': ('pistol', 50),
    'Light SMG': ('smg', 100), 'Medium SMG': ('smg', 100), 'Heavy SMG': ('smg', 100),
    'Shotgun': ('shotgun', 50),
    'Assault Rifle': ('rifle', 400),
    'Light Machinegun': ('rifle', 400), 'Machinegun': ('rifle', 400), 'Heavy Machinegun': ('rifle', 400),
    'Sniper Rifle': ('sniper', 800), 'Heavy Sniper Rifle': ('sniper', 800),
    'Heavy Weapon': ('rifle', 400), 'Rocket Launcher': ('rifle', 400),
    'Bow': ('bow', 100), 'Crossbow': ('bow', 100),
    'Exotic Weapon': ('pistol', 50),
}
AVAIL = {'Poor': 2, 'Common': 1, 'Standard': 2, 'Uncommon': 3, 'Rare': 4,
         'Very Rare': 5, 'Excellent': 3, 'Luxury': 5, 'N/A': 1, 'None': 1}
QUALITY = {'Poor': 1, 'Standard': 2, 'Excellent': 3, 'N/A': 2, 'None': 2}
SPECIAL = {'stun', 'emp', 'entangle', 'drugs', 'special', 'varies', 'stun (taser)', 'drugs (needle)'}

# Excel mangled 7 fraction cells into dates; restore sane values by name.
FIX_ROF = {'Mono-Two': 2, 'Glock-33 Machine Pistol': 2, '"Scorpion" Crossbow': 1}
FIX_MAG = {'"Mark II"': 12, '"Fox" Dual Ammo Pistol': 10, '"Raider" Riot Shotgun': 8, '"Survivalist"': 2}

def is_date(v):
    return isinstance(v, str) and re.match(r'\d{4}-\d\d-\d\d', v or '')

def num(v, default=0):
    if v is None: return default
    if isinstance(v, (int, float)): return int(v)
    s = str(v).strip()
    m = re.match(r'(\d+)', s)          # take leading integer ("15/30" -> 15)
    return int(m.group(1)) if m else default

def parse_damage(s):
    """Return (diceThrows, mod, ap, damageType)."""
    s = str(s).strip()
    low = s.lower()
    if low in SPECIAL or not re.match(r'^\d+d\d', low):
        dt = low.split(' ')[0].split('(')[0].strip()
        return 0, 0, False, dt or 'special'
    ap = 'ap' in low
    m = re.match(r'^(\d+)d\d+', low)           # N of NdX  (RED is all d6; some 'd7' typos -> treat as d6)
    dice = int(m.group(1)) if m else 1
    mod_m = re.search(r'd\d+\s*([+\-]\d+)', low)  # +/- modifier
    mod = int(mod_m.group(1)) if mod_m else 0
    return dice, mod, ap, 'kinetic'

def cost(v):
    m = re.search(r'(\d+)', str(v or '0'))
    return int(m.group(1)) if m else 0

out = []
for r in rows:
    name = str(r['Name']).strip()
    cat = r['Category']
    wclass, rng = CLASS_RANGE.get(cat, ('pistol', 50))
    dice, mod, ap, dtype = parse_damage(r['Damage'])
    rof_raw = r['Rate of Fire']
    autofire = 'autofire' in str(rof_raw).lower()
    rof = FIX_ROF.get(name) if is_date(rof_raw) or name in FIX_ROF else (num(rof_raw, 1) or 1)
    mag = FIX_MAG.get(name) if is_date(r['Magazine']) or name in FIX_MAG else num(r['Magazine'], 0)
    accb = r['Accuracy Bonus']
    accb = 1 if isinstance(accb, str) else int(accb or 0)   # smartgun " 1/0/-1" -> 1
    manu = '' if str(r['Manufacturer']).strip() in ('N/A', 'None', '') else str(r['Manufacturer']).strip()
    desc = str(r['Additional Info']).strip() if r['Additional Info'] else \
        f"{(manu + ' ') if manu else ''}{name}".strip() + f", a {cat.lower()}."
    out.append({
        'weaponType': cat, 'weaponClass': wclass, 'manufacturer': manu, 'name': name,
        'skill': str(r['Weapon Skill']).strip(), 'diceThrows': dice, 'damage': mod,
        'ap': ap, 'damageType': dtype, 'accuracyBonus': accb, 'shots': mag,
        'rateOfFire': rof, 'autofire': autofire, 'hands': num(r['Hands Required'], 1),
        'rarity': AVAIL.get(str(r['Availability']).strip(), 2),
        'concealment': str(r['Concealment']).strip().lower() == 'yes',
        'reliability': QUALITY.get(str(r['Quality']).strip(), 2), 'quality': str(r['Quality']).strip(),
        'cost': cost(r['Cost']), 'range': rng, 'description': desc,
    })

def mk(name, cat, wclass, skill, dice, mod, rng, cost_, desc):
    return {'weaponType': cat, 'weaponClass': wclass, 'manufacturer': '', 'name': name,
            'skill': skill, 'diceThrows': dice, 'damage': mod, 'ap': False, 'damageType': 'kinetic',
            'accuracyBonus': 0, 'shots': 0, 'rateOfFire': 2, 'autofire': False, 'hands': 1,
            'rarity': 1, 'concealment': True, 'reliability': 2, 'quality': 'Standard',
            'cost': cost_, 'range': rng, 'description': desc}

# Keep the player's unarmed starter and the joke item.
out.append(mk('Fists', 'Very Heavy Melee Weapon', 'melee', 'Brawling', 1, 0, 2, 0,
              "Ready to beat the shit out of your enemies? Of course you are."))
out.append(mk('Spoon', 'Light Melee Weapon', 'melee', 'Melee Weapon', 1, 0, 2, 0,
              "So many eyes have been gouged out with this."))
# Cyberweapon granted by the Wolvers cyberware.
out.append(mk('Wolvers', 'Very Heavy Melee Weapon', 'melee', 'Melee Weapon', 3, 0, 2, 500,
              "Retractable monofilament claws (cyberware): 3d6 in close combat."))

# sanity: no NaN-producing fields
for w in out:
    for k in ('diceThrows', 'damage', 'shots', 'rateOfFire', 'cost', 'range', 'rarity', 'accuracyBonus'):
        assert isinstance(w[k], int), (w['name'], k, w[k])

body = json.dumps(out, indent=2, ensure_ascii=False)
ts = ("// AUTO-GENERATED from the Cyberpunk RED weapon spreadsheet (2020 Weapons for\n"
      "// Cyberpunk Red). Do not edit by hand; regenerate with scratchpad/gen_weapons.py.\n"
      "import {WeaponConfig} from \"../ts/items/Weapon\";\n\n"
      f"const weapons: WeaponConfig[] = {body};\n\nexport default weapons;\n")
open('src/objects/weapons.ts', 'w').write(ts)
print('wrote', len(out), 'weapons')
# quick distribution sanity
import collections
print('special (0-dice):', sum(1 for w in out if w['diceThrows'] == 0))
print('AP:', sum(1 for w in out if w['ap']))
print('classes:', dict(collections.Counter(w['weaponClass'] for w in out)))

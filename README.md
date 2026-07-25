# libplate

Format validation, parsing and structured analysis of **European vehicle
registration plates** — conceptually a "libphonenumber for licence plates".

> **What this library does and does not do.** libplate validates known plate
> _formats_ and extracts the information encoded in them. It **cannot** prove
> that a plate has been issued, is currently assigned, belongs to the observed
> vehicle, or has not been forged. That requires authorized access to
> administrative registries.

**Status:** early but growing. Every scheme cites its legal basis in
[`docs/SOURCES.md`](docs/SOURCES.md).

### Supported countries

**15 countries, 118 schemes.** Each row links to its plate-type table below.

| Country                         | Schemes | Coverage                                                                                                   |
| ------------------------------- | ------: | ---------------------------------------------------------------------------------------------------------- |
| [🇪🇸 Spain](#-spain)             |      15 | Ordinary; `R`/`E`/`C`/`H`/`T`/`P`/`S`/`V` prefixes; diplomatic `CD`/`CC`/`OI`/`TA`; two provincial systems |
| [🇵🇹 Portugal](#-portugal)       |       8 | Current series + three historical generations; trailers, export, industrial machines                       |
| [🇫🇷 France](#-france)           |      10 | SIV, `WW`, `W` garage, pre-2015 mopeds, FNI métropole and DOM, diplomatic `CMD`/`CD`/`C`/`K`               |
| [🇮🇹 Italy](#-italy)             |       7 | Ordinary, motorcycles, mopeds, agricultural and operating machines, `EE`, targa prova                      |
| [🇩🇪 Germany](#-germany)         |       3 | Standard, Oldtimer `H`, electric `E` — all against the official KBA district table                         |
| [🇧🇪 Belgium](#-belgium)         |      15 | Standard; `O`/`Q`/`T`/`M`/`S`/`G` letter-index categories; `Z`/`Y`/`V`, `W`/`X`, `CD`; two pre-2010 series |
| [🇳🇱 Netherlands](#-netherlands) |      12 | Sidecodes 1-12                                                                                             |
| [🇵🇱 Poland](#-poland)           |      10 | Ordinary car/motorcycle/powiat, reduced, historic, temporary, diplomatic, individual, professional         |
| [🇦🇹 Austria](#-austria)         |       7 | Standard, Wunschkennzeichen, diplomatic; federal `A`, Land, authority-area and fire-brigade series         |
| [🇪🇪 Estonia](#-estonia)         |       9 | Standard and reduced, motorcycle, moped, tractor, veteran, `CD`/`CMD`, `PROOV` dealer marks                |
| [🇷🇴 Romania](#-romania)         |       3 | The ordinary county and Bucharest series; provisional and `PROBE` numbers                                  |
| [🇧🇬 Bulgaria](#-bulgaria)       |       6 | Ordinary, third plate, transit and trader temporary numbers, each with its category-L variant              |
| [🇸🇪 Sweden](#-sweden)           |       3 | Ordinary series, the 2019 letter-suffix format, diplomatic plates                                          |
| [🇫🇮 Finland](#-finland)         |       6 | Ordinary, L-class/tractor marks, `CD` and `C` mission plates, export, `KOE` test plates                    |
| [🇩🇰 Denmark](#-denmark)         |       4 | The national series, diplomatic `76.000-77.999`, faste prøveskilte, `RF` airport plates                    |

Countries not yet modelled, and the series still missing inside those above, are
listed under [Not yet modelled](#not-yet-modelled).

### Supported plate types

#### 🇪🇸 Spain

| Type                           | Example      | Notes                            |
| ------------------------------ | ------------ | -------------------------------- |
| Ordinary series                | `1234 BCD`   | Category not inferable from text |
| Trailer / semitrailer (`R`)    | `R 1234 BCD` | Deterministic category           |
| Special vehicle (`E`)          | `E 1234 BCD` | Broad category                   |
| Moped / motor cycle (`C`)      | `C 1234 BCD` | Deterministic category           |
| Historical (`H`)               | `H 1234 BCD` | Historical-vehicle regime        |
| Tourist (`T`)                  | `T 1234 BCD` | Tourist regime                   |
| Temporary — private (`P`)      | `P 1234 BCD` | Green plate                      |
| Temporary — company (`S`, `V`) | `S 1234 BCD` | `S` unregistered, `V` registered |
| Diplomatic missions (`CD`)     | `CD 12 345`  | Red plate                        |
| Consular offices (`CC`)        | `CC 12 345`  | Green plate                      |
| International orgs (`OI`)      | `OI 123 45`  | Blue plate                       |
| Technical-admin staff (`TA`)   | `TA 123 45`  | Yellow plate                     |
| Provincial series (1971-2000)  | `M-1234-AB`  | Legacy; official province table  |
| Provincial numeric (1900-1971) | `M-123456`   | Legacy; official province table  |

Spanish diplomatic-regime plates validate the documented group widths only:
no official public table of mission/organization prefixes exists. For `OI` and
`TA`, a 5-digit compact input like `OI12345` admits two splits (`OI 12 345` /
`OI 123 45`); libplate uses the separators you wrote as evidence and reports
`AMBIGUOUS` when they don't decide it.

#### 🇵🇹 Portugal

| Type                          | Example      | Notes                                |
| ----------------------------- | ------------ | ------------------------------------ |
| Current general series        | `AA 00 AA`   | Since 2020-03-03                     |
| Historical — until 1992       | `AA-00-00`   | Opt-in in detection                  |
| Historical — 1992–2005        | `00-00-AA`   | Opt-in in detection                  |
| Historical — 2005–2020        | `00-AA-00`   | Opt-in in detection                  |
| Trailers / semi-trailers      | `L 808970`   | Official regional-service code table |
| Export                        | `24783 L`    | Yellow plate; customs letter L/P/A/M |
| Industrial machines (2006-20) | `08-AM-08 A` | Red plate; circulation class A-H     |
| Industrial machines (current) | `AA 08 AM B` | Red plate; circulation class A-H     |

A Portuguese trailer plate with a two-letter service code and exactly four
digits (`SE 1234`) shares its compact form with the pre-1992 general series
(`SE-12-34`); libplate resolves it with the separators you wrote or reports
`AMBIGUOUS`.

#### 🇫🇷 France

| Type                        | Example       | Notes                                       |
| --------------------------- | ------------- | ------------------------------------------- |
| SIV current series          | `AA-123-AA`   | Letters `I`,`O`,`U` unused; not `SS`/`WW`   |
| Provisional (`WW`)          | `WW-123-AA`   | Temporary regime; pink plate since 2026     |
| W garage (professionals)    | `W-123-AB`    | Annual professional plate; pink since 2026  |
| Mopeds (2004-2015)          | `AB 123 C`    | Closed series, still circulating            |
| FNI métropole (1950-2009)   | `5723 HB 62`  | Legacy; official department table           |
| FNI DOM (1950-2009)         | `182 ABE 974` | Legacy; 3-digit DOM codes                   |
| Diplomatic (`CMD`/`CD`)     | `5 CD 1234`   | Green plate; embassies, delegations, `500`  |
| International orgs (`CD`)   | `401 CD 5`    | Entity codes 400-499, 600, 700              |
| Consular (`C`)              | `105 C 1.75`  | Department of the post after a dot          |
| Staff / functionaries (`K`) | `105 K 100`   | Embassy, consular and organization variants |

The SIV letter exclusions are allocation practice documented by
service-public.fr — Annexe VII of the arrêté du 9 février 2009 prescribes only
the 2+3+2 composition. An FNI number whose series spells a diplomatic status
group over a department-like serial (`100 CD 20`) is a genuine text ambiguity
and is reported as `AMBIGUOUS`. Transit temporaire / import plates reuse the
ordinary SIV number on a red plate, so they are not a separate scheme.

#### 🇮🇹 Italy

| Type                      | Example      | Notes                                                           |
| ------------------------- | ------------ | --------------------------------------------------------------- |
| Current ordinary series   | `AA 000 AA`  | Letters `I`,`O`,`Q`,`U` not used; also trailer rears since 2013 |
| Motorcycles               | `AA 12345`   | Shape shared with pre-2013 "Rimorchio" trailer plates           |
| Mopeds (since 2006)       | `X5FJPD`     | Six characters from a base-28 set; personal plate               |
| Agricultural machines     | `AE 123 B`   | Yellow plate                                                    |
| Operating machines        | `AE B 123`   | Yellow plate, red characters                                    |
| Escursionisti Esteri      | `EE 123 AB`  | `EE` + 3 digits + 1-2 letters                                   |
| Test plates (targa prova) | `A1 P 23B45` | Since 2002                                                      |

Since 2013 Italian trailers carry a rear plate with the ordinary-series
structure; the X-initial lots are administratively reserved for them, but that
allocation is not a format rule, so text alone cannot separate a trailer from
a car (`vehicle.inferenceLevel` stays honest about this).

#### 🇩🇪 Germany

| Type           | Example     | Notes                                        |
| -------------- | ----------- | -------------------------------------------- |
| Standard       | `B-XY 1234` | District from the official KBA table         |
| Oldtimer (`H`) | `B-XY 123H` | Historical-vehicle regime; tighter length    |
| Electric (`E`) | `M-XY 123E` | Ordinary regime, electric drive; same limits |

German plates are matched against the official district-code table
(assignable codes plus revoked codes still in circulation). Because separators
are stripped for matching, a compact input like `BAB123` can admit several
readings (`B-AB 123` Berlin vs `BA-B 123` Bamberg); libplate reports
`AMBIGUOUS` with all candidates, and uses the separators you wrote as evidence
to resolve the split when present.

#### 🇧🇪 Belgium

| Type                           | Example     | Notes                                      |
| ------------------------------ | ----------- | ------------------------------------------ |
| Standard series                | `1-ABC-123` | Red on white; since 2010                   |
| Oldtimer (`O`)                 | `O-ABC-123` | Historical-vehicle regime                  |
| Trailers (`Q`)                 | `Q-ABC-123` | Deterministic category                     |
| Taxis / hire with driver (`T`) | `T-XAB-123` | Group starts `X` (taxi) or `L` (hire)      |
| Motorcycles (`M`)              | `M-ABC-123` | Deterministic category                     |
| Mopeds / light quads (`S`)     | `S-AAB-123` | Class letter `A`/`B`/`P`/`U`               |
| Agricultural (`G`)             | `G-ABC-123` | White on red                               |
| Commercial (`Z`/`Y`/`V`)       | `Z-ABC-123` | Dealer / test / professional; green plates |
| Temporary short-term (`W`)     | `WA-25-ABC` | White on red; digits = expiry year         |
| Export (`X`)                   | `XA-25-ABC` | White on red; digits = expiry year         |
| Diplomatic (`CD`)              | `CD-AB-123` | Red on white                               |
| Old series (1973-2008)         | `ABC-123`   | Opt-in in detection; still in circulation  |
| Old series (2008-2010)         | `123-ABC`   | Opt-in in detection; still in circulation  |

Belgian plates follow the **holder**, not the vehicle, so the pre-2010 series
remain fully valid in circulation. They still stay opt-in in country-less
detection because their compact shapes collide abroad (`ABC123` also reads as
a German `A-BC 123`). Compact current-series inputs can collide too
(`MABC123` is the Belgian motorcycle `M-ABC-123` or the German `MA-BC 123`);
as always, the separators you wrote decide it or the result is `AMBIGUOUS`.

#### 🇳🇱 Netherlands

| Type                      | Example    | Notes                                          |
| ------------------------- | ---------- | ---------------------------------------------- |
| Sidecode 12 (since 2021)  | `X-99-XXX` | Current for tractors, light commercial, mopeds |
| Sidecode 11 (since 2015)  | `XXX-99-X` | Cars since 2024-06-04                          |
| Sidecode 10 (since 2008)  | `X-999-XX` |                                                |
| Sidecode 9 (since 2006)   | `XX-999-X` |                                                |
| Sidecode 8 (since 2009)   | `9-XXX-99` |                                                |
| Sidecodes 4-7 (1978-)     | `XX-99-XX` | Opt-in in detection; some still issued¹        |
| Sidecodes 1-3 (1951-1978) | `XX-99-99` | Opt-in in detection; vowels were genuine       |

¹ Sidecode 4 is still current for trailers, 6 for motorcycles, 7 for heavy
trucks; they stay opt-in in country-less detection because their shapes
collide with current series abroad (e.g. `XX-99-XX` ≡ the current Portuguese
`AA-00-AA`). First-issuance dates follow the official RDW series tables
(earliest category, not cars).

#### 🇵🇱 Poland

| Type                          | Example     | Notes                                         |
| ----------------------------- | ----------- | --------------------------------------------- |
| Ordinary — cars (2-letter)    | `WA 12345`  | 5-char serial; official discriminant table    |
| Ordinary — motorcycles/mopeds | `WA 1234`   | 4-char serial; also tractors and L6e/L7e      |
| Ordinary — powiat (3-letter)  | `KRA A123`  | Car and motorcycle serials share arrangements |
| Reduced-size                  | `W 123`     | Voivodeship letter only; since 2018-07-01     |
| Historic (zabytkowe)          | `WA 123`    | Yellow plate; historical-vehicle regime       |
| Temporary (tymczasowe)        | `W0 1234`   | Red on white; sports variant red on yellow    |
| Diplomatic                    | `W 123456`  | White on blue; only type without the EU band  |
| Individual (vanity)           | `W0 TIGER`  | 3-5 chars, at most last two digits            |
| Professional                  | `W01 23P45` | Green on white; fixed `P` marker; since 2019  |

Polish serials are validated against the exact digit/letter arrangements of
§ 30 of the 2024 regulation (e.g. `NNNN` never follows a two-letter powiat
discriminant), the 20-letter authority alphabet (no `B`/`D`/`I`/`O`/`Z`), and
the full Załącznik 13 prefix table (689 prefixes, including the 2025/2026
additions). EV/hydrogen vehicles carry the same numbers black-on-green — a
colour change text cannot detect.

#### 🇦🇹 Austria

| Type                    | Example    | Notes                                                   |
| ----------------------- | ---------- | ------------------------------------------------------- |
| Standard issue          | `KI 234AB` | Digits then letters; district from KDV Anlage 5d        |
| Wunschkennzeichen       | `W ABC123` | Letters then digits (mirror of the standard issue)      |
| Diplomatic / consular   | `WD 123AB` | Land letter + `D`/`K`; no coat of arms                  |
| Federal officeholders   | `A 1`      | Letter `A` + digits only; Bundeswappen (§ 26 Abs. 2)    |
| Land governments        | `N 4321`   | Land letter + digits only (§ 26 Abs. 3)                 |
| State / military series | `BH 45678` | `BP`, `FV`, `PT`, `BD`, `BH`, `JW` + digits (Abs. 4)    |
| Fire brigade            | `FW 45KI`  | `FW` + 2-3 digits + the district's Anlage 5d code (¶ i) |

The Austrian district table unions the current Anlage 5d codes with those
retired by district mergers (`JU`, `KF`, `MZ`, `HB`, `FF`, `RA`, `FB`, `WU`)
that stay on circulating vehicles. Probefahrt (blue), Überstellung (green),
temporary (blue) and moped (red) plates share the standard text format and
differ only in colour, so `AT_STANDARD` carries no visual expectation; the red
plates for foreign trailers carry the towing vehicle's own number (KFG § 49
Abs. 3), and `Deckkennzeichen`/`Wechselkennzeichen` reuse ordinary formats. The
all-digit series have no prescribed digit count — § 26 Abs. 6 Z 2 excludes them
— so they accept 1-6 digits, the ordinary plate's capacity per Anlage 5e. Three
honest ambiguities: an all-digit diplomatic serial written compactly
(`WD12345`) also reads as the Wunschkennzeichen `W-D12345` (the separators you
write resolve it, as they do for `BP12345` = `B-P12345`), `ND`/`GD`/`NK`/`SD`/
`VK` are both district codes and Land+`D`/`K` diplomatic prefixes, and `BD` +
digits is both the Bundesbusdienst series and Burgenland+`D` — unresolvable
however it is written.

#### 🇪🇪 Estonia

| Type                          | Example      | Notes                                             |
| ----------------------------- | ------------ | ------------------------------------------------- |
| Standard (A1)                 | `053 EEN`    | 3 digits + 3 letters; categories M, N, O          |
| Standard reduced-size (A3)    | `17 ELH`     | 2 digits + 3 letters; `W` never used              |
| Motorcycle / off-road (B1)    | `53 HF`      | Digits may lead or trail (§ 7 lg 2)               |
| Moped (B3)                    | `533 F`      | Green plate; the letter may change position       |
| Tractors / machines (E1, E2)  | `6269 EO`    | 4 digits + 2 letters; `WW` not issued             |
| Veteran vehicles (A9, B2)     | `W 433`      | Black plate; historical-vehicle regime            |
| Diplomatic staff (A4, A6)     | `CD 2345`    | Blue plate; 3-4 digits (full/reduced size)        |
| Heads of mission (A5, A7)     | `CMD 234`    | Blue plate; 2-3 digits (full/reduced size)        |
| Transferable dealer (A8, A11) | `PROOV 1203` | `PROOV` + 4 digits; professional temporary regime |

Character counts come from the official sample drawings of lisa 3 to määrus
nr 49 — the article text fixes only the fields, the colours and the
letter-width limits of § 6. Those limits are modelled where they are outright
bans (`W` on the reduced, motorcycle, moped and veteran-moped plates, `WW` on
tractor plates); the A1 multiplicity caps (at most two `A`, two `M`, one `W`,
never all three) are not. A mark issued for a fixed-term registration carries
the same characters on a **yellow** plate (§ 7 lg 1), so `EE_STANDARD`'s colours
are the default case only. One honest ambiguity: a veteran mark (`M 433`) and a
letter-first moped mark share one letter + three digits — the separator you
write resolves it, since the moped's characters sit in a single field.

#### 🇷🇴 Romania

| Type                | Example      | Notes                                                     |
| ------------------- | ------------ | --------------------------------------------------------- |
| Ordinary series     | `CJ 01 XYZ`  | County indicative + 2 digits + 3 letters                  |
| Ordinary series     | `B 117 VAY`  | Bucharest only: 3 digits fit behind a 1-letter indicative |
| Provisional         | `B 012345`   | Indicative + order number, no letter group                |
| Probe (dealer/test) | `B 12 PROBE` | Indicative + order number + the `PROBE` inscription       |

HG 1391/2006 art. 23 alin. (1) fixes the composition (indicative + order number
in Arabic digits + three Latin capitals) but not the digit count: art. 26
alin. (1) of Ordinul MAI 181/2024 — which replaced Ordinul MAI 1501/2006 —
leaves that to a state standard that is not published free of charge. libplate
therefore caps the whole number at the plate's seven characters, which
reproduces the real allocation — two digits behind a two-letter county code, two
or three behind Bucharest's `B` — without inventing a per-county table. The 42
indicatives are validated against the ISO 3166-2:RO list (identical to the plate
codes). Compact Bucharest plates (`B12ABC`) also read as Austrian plates, so
write the separators.

The provisional number (art. 23 alin. (4)) and the probe number (alin. (5)) are
the same indicative plus an order number, the second one followed by the word
`PROBE`. Their digit widths are unpublished for the same reason, so both are
bounded by the same seven characters: up to six digits behind `B`, up to five
behind a two-letter code, leading zeros included since the circulating red
plates use them. That makes the provisional series wide, and a provisional
number without separators (or with them) can read as an Austrian, German,
Italian or Polish plate — pass `{ country: "RO" }` when you know the origin.
`PROBE` carries no such risk. Neither scheme reports colours: art. 26 alin. (1)
of the order sends the colours of provisional and probe plates to the same
unpublished standard, so the familiar red-on-white is real but not officially
documented.

Still absent, and why: diplomatic `CD`/`CO`/`TC` and temporary numbers (art. 23
alin. (2)-(3)) — composition without widths, and guessing them would make every
Spanish `CD` plate ambiguous; the yellow locality plates — now specified by
anexa nr. 6 of Ordinul 181/2024 as county indicative + numeric locality code
(anexa nr. 7) + order number, so they are modellable but not modelled yet; and
MApN/MAI/SRI/SPP numbers, whose abbreviations come from each institution's own
unpublished order (art. 30 alin. (3)-(4)).

#### 🇧🇬 Bulgaria

| Type                          | Example       | Notes                                          |
| ----------------------------- | ------------- | ---------------------------------------------- |
| Ordinary series               | `CA 1234 AB`  | 1-2 letter code + 4 digits + 1-2 letter series |
| Third plate (load carriers)   | `CA 51234 AB` | Red characters; one extra digit (чл. 10 ал. 9) |
| Transit                       | `123 T 456`   | 6 digits split by `T`, `H` or `M`; single use  |
| Transit — category L          | `12 M 345`    | 5 digits split by `M`                          |
| Trader temporary              | `123 B 456`   | 6 digits split by `B`; three-year validity     |
| Trader temporary — category L | `12 B 345`    | 5 digits split by `B`                          |

Bulgarian plates use only the twelve Cyrillic capitals that coincide graphically
with Latin ones (А, В, Е, К, М, Н, О, Р, С, Т, У, Х — enumerated by чл. 24
ал. 7); libplate matches their Latin look-alikes `A B C E H K M O P T X Y` and
does **not** transliterate Cyrillic input. The regional letter codes themselves
are assigned by the National Police (чл. 24 ал. 2) with no published table, so
the code is checked against that alphabet only. Battery-electric vehicles carry
the same number in green (чл. 23 ал. 4). Note that the ordinary shape coincides
with the Spanish 1971-2000 provincial series whenever every letter is one of the
twelve (`M-1234-AB`).

#### 🇸🇪 Sweden

| Type                      | Example    | Notes                                          |
| ------------------------- | ---------- | ---------------------------------------------- |
| Ordinary series           | `ABC 123`  | Three letters + three digits                   |
| Letter-suffix (from 2019) | `ABC 12A`  | Last character a letter; never `O`             |
| Diplomatic                | `AB 123 C` | Black on light blue; country + serial + status |

Swedish plates never carry `I`, `Q`, `V`, `Å`, `Ä` or `Ö`, and `O` is not used
as the last character (Transportstyrelsen practice, not regulation). The same
number is issued to cars, motorcycles, mopeds, trailers, tractors and
snowmobiles alike — only the plate size changes — and the taxi (yellow),
temporary (white on red), provisional (yellow) and competition (orange) plates
carry a number formed under the same rule, so neither the vehicle nor the
regime follows from the text. Three letters + three digits is also a Finnish
ordinary mark, a German plate and an Italian operating-machine number, so
`ABC 123` needs a country hint; the letter-suffix form (`ABC 12A`) is uniquely
Swedish.

#### 🇫🇮 Finland

| Type                         | Example     | Notes                                             |
| ---------------------------- | ----------- | ------------------------------------------------- |
| Ordinary (cars, trailers)    | `ABC-123`   | 2-3 letters + a number of at most 3 digits        |
| L-class, tractors, machinery | `123-ABC`   | Number first; white (L) or yellow (machinery)     |
| Diplomatic (`CD`)            | `CD-1234`   | White on blue; number set by the foreign ministry |
| Mission tax-free (`C`)       | `C-12345`   | White on blue; up to five digits                  |
| Export                       | `V-1234`    | One letter + up to 4 digits; red expiry field     |
| Test plates (`KOE`)          | `KOE A-123` | Black on yellow                                   |

The number part is a _number_: no leading zero, and never `0` alone. `CD` is
reserved for diplomatic vehicles, so it is excluded from the ordinary series
(but `CDE-123` is an ordinary mark). A `C` + up to four digits input is
genuinely ambiguous between a mission plate and an export plate — the two are
told apart by colour, which is not part of the text. Across borders, the
ordinary mark shares its shape with the Swedish series and the number-first
mark with the Estonian standard mark (`123 ABC`), so both need a country hint.

#### 🇩🇰 Denmark

| Type                     | Example    | Notes                                                   |
| ------------------------ | ---------- | ------------------------------------------------------- |
| National series          | `AB 12345` | Two Latin letters + one to five Arabic numerals         |
| Diplomatic               | `AB 76123` | Same composition, series `76.000-77.999`; white on blue |
| Fast prøveskilt          | `AB 42`    | Two letters + `10-99`; red on white, held by a business |
| Airport (lufthavnsplade) | `RF 12345` | `RF` + four or five digits; red on yellow               |

Denmark has one number composition — two Latin letters + one to five digits
(§ 68, stk. 2 of the registreringsbekendtgørelse) — and § 68, stk. 3 lets the
tax administration cut it into series. Motorstyrelsen's plate-type catalogue
publishes that division, which is what makes three of the four schemes above
tellable apart from the text alone: `10-99` is the prøveskilt series,
`76.000-77.999` the diplomatic one and `RF` the airport one, so the ordinary
series leaves those three ranges out. The rest of the division is by digit
width and shared between categories (`100-999` is a large moped **or** a
tractor, `1.000-9.999` a trailer **or** a small moped, `10.000-97.999` a car,
van, lorry, motorcycle or road-approved tractor), so the ordinary series still
reports no vehicle category.

Colours: white, yellow for goods vehicles and the yellow-and-white
"papegøjeplade" follow the vehicle's registration-tax status rather than the
number, so the ordinary series reports none — but the diplomatic (§ 76),
prøveskilt and airport plates have a colour of their own. Note the ordinary
shape collides with the Italian motorcycle series and Polish plates
(`WA 12345`), so country-less detection is ambiguous there.

### Not yet modelled

Spanish state/military bodies; Portuguese diplomatic/military series and the
pre-2013 moped/motorcycle series; Italian diplomatic (`CD`/`CC`), Polizia Locale `Y`
series, SMOM and pre-2002 test plates; German seasonal (`Saisonkennzeichen`),
alternating (`Wechselkennzeichen`), green, Bundeswehr and diplomatic plates;
Dutch special series (royal `AA`, `CD`, dealer/export plates); Belgian
personalized plates (free text, up to 8 characters), the royal court and
`A`/`E`/`P` short national series, and the pre-1973 series; Polish pre-2000
black plates and military/service series; Austrian pre-1989 black plates;
Estonian special-order marks (type A2, letters then digits — their space
swallows most other series), racing (A10) and transit (D1/D2) marks, and the
President's coat-of-arms plate (A12, no characters at all); Romanian diplomatic
(`CD`/`CO`/`TC`) and temporary numbers (composition without widths — the state
standard SR 13078 is not published), the yellow locality plates (specified since
2024 by anexa nr. 6-7 of Ordinul MAI 181/2024, so modellable, just not modelled)
and army/police numbers (each institution's own order); Bulgarian by-request six-character
numbers (their character space contains the ordinary series), diplomatic,
army and police series (all outside Наредба № I-45); Swedish saluvagnsskyltar
(the regulation says "six characters" without saying which) and personal plates
(2-7 free characters); Finnish transfer marks (siirtomerkki — 1-2 letters + up
to four digits, a space that contains both the ordinary two-letter series and
the export plate), customs plates (no published serial width) and Åland, which
runs its own register; Danish grænsenummerplader (Motorstyrelsen draws them as
five digits with no letters, which contradicts § 68, stk. 2 — the catalogue is
"en grafisk fremstilling", so the composition is not asserted), prøvemærker (a
sticker carrying a løbenummer of no published width), ønskenummerplader (2-7
free characters), historic plates (the pre-1976 systems) and the special
municipal plates of § 3, stk. 4 (no published composition).

## Install

```bash
npm install libplate
```

## Usage

```ts
import { parse } from "libplate";

const result = parse("R-1234-BCD", { country: "ES" });
// result.status                    -> "VALID"
// result.normalized                -> "R1234BCD"
// result.formatted                 -> "R 1234 BCD"
// result.scheme.id                 -> "ES_TRAILER_CURRENT"
// result.vehicle.category          -> "TRAILER_OR_SEMITRAILER"
// result.vehicle.inferenceLevel    -> "DETERMINISTIC"
```

### The result

`parse` returns a `PlateValidationResult` and does not throw on input it cannot
parse: every outcome, rejection included, is a value in `status`. This is the
full result for `parse("R-1234-BCD", { country: "ES" })`:

```json
{
  "status": "VALID",
  "input": { "raw": "R-1234-BCD", "compact": "R1234BCD" },
  "country": "ES",
  "normalized": "R1234BCD",
  "formatted": "R 1234 BCD",
  "scheme": {
    "id": "ES_TRAILER_CURRENT",
    "country": "ES",
    "name": "Remolques y semirremolques",
    "validFrom": "1999-07-26",
    "components": { "prefix": "R", "serial": "1234", "series": "BCD" }
  },
  "registration": {
    "type": "ORDINARY",
    "temporary": false,
    "diplomatic": false,
    "historical": null
  },
  "vehicle": {
    "category": "TRAILER_OR_SEMITRAILER",
    "inferenceLevel": "DETERMINISTIC",
    "evidence": [{ "type": "PREFIX", "value": "R" }]
  },
  "visual": { "background": "RED", "foreground": "BLACK" },
  "warnings": [],
  "errors": [],
  "versions": { "library": "0.1.0", "metadata": "2026.07.8" }
}
```

| Field           | Present when                             | What it holds                                                                                |
| --------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| `status`        | always                                   | The outcome. Branch on this first.                                                           |
| `input.raw`     | always                                   | Exactly the string you passed, untouched.                                                    |
| `input.compact` | always                                   | Uppercased, accepted separators and whitespace removed — the form actually matched.          |
| `country`       | once the input clears the basic checks   | The `country` option echoed back, or the country resolved by `detect`.                       |
| `normalized`    | once a scheme or candidate was found     | The same string as `input.compact`, surfaced at the top level for convenience.               |
| `formatted`     | `VALID`                                  | National formatting from the matched scheme (`R 1234 BCD`, `B-AB 123`, `1-ABC-123`).         |
| `scheme`        | `VALID`                                  | `id`, `country`, human `name`, `validFrom`/`validTo`, and `components` per named segment.    |
| `candidates`    | `AMBIGUOUS`                              | Every surviving reading — country, scheme, formatting and components. Never pre-ranked.      |
| `registration`  | `VALID`                                  | The **regime** (`type`, `temporary`, `diplomatic`, `historical`) — not the vehicle category. |
| `vehicle`       | `VALID`                                  | `category` / `possibleCategories`, plus `inferenceLevel` and the `evidence` behind it.       |
| `visual`        | `VALID`, when the scheme prescribes them | Background and foreground colours **as prescribed by the regulation** — never checked.       |
| `warnings`      | always                                   | Reserved. No code path populates it yet, so it is always `[]`.                               |
| `errors`        | always                                   | Empty on `VALID`; otherwise one entry per reason, each with a stable code and a message.     |
| `versions`      | always                                   | `library` and `metadata` versions — the metadata version moves independently.                |

`scheme.id` is the stable key to look the legal basis up in
[`docs/SOURCES.md`](docs/SOURCES.md); the result itself carries no citations.

#### Status values

| Status        | Meaning                                                                     |
| ------------- | --------------------------------------------------------------------------- |
| `VALID`       | Matches exactly one scheme with exactly one segmentation.                   |
| `INVALID`     | Empty, too long, illegal characters, or matching no known scheme.           |
| `AMBIGUOUS`   | More than one reading survives. `candidates` lists them; nothing is picked. |
| `UNSUPPORTED` | The requested country is not modelled — which is not the same as invalid.   |
| `POSSIBLE`    | Declared in the type, reserved for OCR-tolerant parsing. Not emitted today. |

Treating anything that is not `VALID` as an error will reject correct plates:
`AMBIGUOUS` means the text is fine but underdetermined, and `UNSUPPORTED` says
nothing about the plate at all.

#### Reason codes

Branch on `errors[].reason`, never on `message` — the codes are contract, the
messages are not. Emitted today:

`EMPTY_INPUT` · `TOO_LONG` (over 64 characters) · `INVALID_CHARACTERS` ·
`INVALID_STRUCTURE` · `AMBIGUOUS_COUNTRY` · `AMBIGUOUS_SCHEME` ·
`AMBIGUOUS_SEGMENTATION` · `UNSUPPORTED_COUNTRY`

Also declared, but not produced by any current code path: `VALID`, `TOO_SHORT`,
`INVALID_LENGTH`, `INVALID_PREFIX`, `INVALID_SEQUENCE`,
`OUTSIDE_VALIDITY_PERIOD`, `UNSUPPORTED_SCHEME`, `VISUAL_EVIDENCE_REQUIRED`,
`REGISTRY_CHECK_REQUIRED`. They are reserved for finer diagnostics; a `switch`
over them is safe but the extra arms are unreachable for now. In particular, a
plate excluded by `referenceDate` currently reports `INVALID_STRUCTURE`, not
`OUTSIDE_VALIDITY_PERIOD` — the scheme is filtered out before matching.

#### The other three shapes

An input that matches nothing keeps only the diagnosis:

```json
// parse("R 123 BCD", { country: "ES" })  — three digits, not four
{
  "status": "INVALID",
  "country": "ES",
  "errors": [
    {
      "reason": "INVALID_STRUCTURE",
      "message": "Input does not match any known plate scheme."
    }
  ]
}
```

An ambiguous input replaces `scheme` with `candidates` — here one scheme with
two legal splits of the same text:

```json
// parse("BAB123", { country: "DE" })
{
  "status": "AMBIGUOUS",
  "normalized": "BAB123",
  "candidates": [
    {
      "country": "DE",
      "scheme": "DE_STANDARD",
      "formatted": "B-AB 123",
      "components": { "district": "B", "letters": "AB", "number": "123" }
    },
    {
      "country": "DE",
      "scheme": "DE_STANDARD",
      "formatted": "BA-B 123",
      "components": { "district": "BA", "letters": "B", "number": "123" }
    }
  ],
  "errors": [{ "reason": "AMBIGUOUS_SEGMENTATION", "message": "…" }]
}
```

Writing the separators resolves it: `B-AB 123` is Berlin, `BA-B 123` is
Bamberg. Without a country hint the same mechanism reports
`AMBIGUOUS_COUNTRY` instead — `detect("AA-123-AA")` returns the French
`FR_SIV_CURRENT` and the Italian `IT_CURRENT` as candidates.

An unmodelled country is reported as such, not as a rejection:

```json
// parse("ABC123", { country: "GB" })
{
  "status": "UNSUPPORTED",
  "country": "GB",
  "errors": [
    { "reason": "UNSUPPORTED_COUNTRY", "message": "Country \"GB\" is not supported." }
  ]
}
```

#### Reading the inferences

`registration` is the administrative regime, `vehicle` is the category, and the
two are independent: a `WW` French plate is deterministically temporary and
tells you nothing about the vehicle.

- **`registration.historical` is `null` when text cannot decide it** — which is
  most of the time. `null` means "unknown", not `false`. Spanish Group A
  historical vehicles keep their ordinary plate and carry only a badge.
- **`vehicle.inferenceLevel` qualifies every category**, and must be read
  before the category is shown to anyone:

| Level                      | Meaning                                                               |
| -------------------------- | --------------------------------------------------------------------- |
| `DETERMINISTIC`            | The format guarantees it (Spanish `R` is a trailer).                  |
| `CATEGORY_ONLY`            | A broad class, no subtype (Spanish `E` is _some_ special vehicle).    |
| `VISUAL_EVIDENCE_REQUIRED` | The text is compatible with several categories; the plate shows more. |
| `REGISTRY_REQUIRED`        | Only the registry knows (any French SIV number).                      |
| `NOT_INFERABLE`            | The scheme encodes nothing about the vehicle.                         |

- **`visual` is an expectation, not a check.** It reports the colours the
  regulation prescribes for the matched scheme. libplate never sees a plate, so
  it cannot compare them with anything.

### Detecting without a country hint

```ts
import { detect } from "libplate";

const result = detect("C 1234 BCD");
// Resolves to ES / ES_MOPED_CURRENT. When more than one scheme matches,
// status is "AMBIGUOUS" and `result.candidates` lists them — the library
// never guesses a single country.
```

### Convenience helpers

```ts
import { validate, format } from "libplate";

validate("1234 BCD", { country: "ES" }); // true
format("1234-bcd", { country: "ES" }); // "1234 BCD"
```

`parse` is the primary API — use it when you need the reason, the matched
scheme, or the inferences. `validate` / `format` are thin conveniences.

## Design

- **Validation ≠ existence ≠ vehicle type.** These are modelled as separate
  concerns. Vehicle-category inference is secondary and always carries an
  `inferenceLevel` and supporting `evidence`.
- **Metadata is the source of truth.** Each scheme lives in a declarative YAML
  file under `metadata/`, validated against `schema/plate-metadata.schema.json`
  and compiled into an embedded module — the runtime ships no YAML parser and
  is browser-safe.
- **No hand-written regex.** Patterns are expressed as tokens (`LITERAL`,
  `DIGITS`, `CHARSET`, `LETTERS`, `TABLE`), fixed-length or bounded
  variable-length, that compile to a set of fixed-length anchored regexes with
  no backtracking (no ReDoS) and deterministic segment extraction. Inputs that
  admit several segmentations are reported as ambiguous — never guessed.
- Every scheme cites its regulatory source and ships positive/negative
  examples that are exercised as conformance tests. The legal references are
  catalogued in [`docs/SOURCES.md`](docs/SOURCES.md); the stable `scheme.id`
  in a result is the key to look them up (the API itself carries no legal
  citations — that is documentation, not validation output).

[`docs/DESIGN.md`](docs/DESIGN.md) records the reasoning: how competing readings
are ranked by evidence, what the library deliberately refuses to do, and what is
still open.

## Development

```bash
npm install
npm run metadata      # validate YAML and regenerate src/generated/metadata.ts
npm test              # runs the metadata build first, then the suite
npm run build         # emits dist/ (ESM + CJS + .d.ts)
```

Quality gates (all run in CI):

```bash
npm run typecheck     # tsc --noEmit (strict)
npm run lint          # ESLint: unused imports, code smells, complexity (sonarjs)
npm run format:check  # Prettier
npm run knip          # unused files / exports / dependencies
npm run coverage      # Vitest coverage with thresholds
npm run check         # all of the above in sequence
```

### Adding a scheme

1. Add a YAML file under `metadata/<COUNTRY>/`.
2. Give it positive and negative `examples` and at least one regulatory
   `source`.
3. Run `npm test` — the conformance suite verifies the examples behave as
   declared.

## License

MIT

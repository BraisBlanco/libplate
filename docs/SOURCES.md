# Regulatory sources

Every plate scheme in `metadata/**/*.yaml` cites its legal basis through one or
more `sources[].id` entries. This document is the registry those IDs resolve
to. The same IDs appear in a validation result under `scheme.sourceRefs`, so a
result can always be traced back to the regulation that defines the format.

> **Scope of these sources.** They document the _format, series and visual
> characteristics_ of plates as prescribed by regulation. They do **not**
> establish whether a given plate has been issued or assigned — libplate makes
> no such claim (see the notice in the README).

**Maintenance.** Registration rules change and consolidated official texts are
updated in place. Each source records when it was last checked. Before every
metadata release, re-verify the sources touched by the changed schemes.

```
sourceCheckedAt: 2026-07-24
metadataVersion:  2026.07.5
```

---

## Currently referenced by shipped metadata

### Spain

| ID               | Reference                                                                                  | Used for                                                                                                                                                                                                                                                                                                     | URL                                                         |
| ---------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `ES-RGV`         | Real Decreto 2822/1998, _Reglamento General de Vehículos_ (consolidated), esp. Anexo XVIII | Ordinary series (I.A.a); special `E` (I.A.b), trailers `R` (I.A.c), mopeds `C` (I.A.d); diplomatic regime `CD`/`OI`/`CC`/`TA` (I.B.a — structure and colours; digit widths are not fixed by the RGV); historical `H` (I.B.c), tourist `T` (I.B.b), temporary private `P` (I.C.a) and company `S`/`V` (I.C.b) | <https://www.boe.es/buscar/act.php?id=BOE-A-1999-1826>      |
| `ES-HIST-RULES`  | Real Decreto 892/2024, _Reglamento de Vehículos Históricos_                                | Historical-vehicle regime (`H` prefix; Group A / Group B)                                                                                                                                                                                                                                                    | <https://www.boe.es/buscar/act.php?id=BOE-A-2024-18614>     |
| `ES-DGT-TYPES`   | DGT, "Matrículas de todos los colores"                                                     | Digit widths of the diplomatic-regime groups (`CD`/`CC`: 2 + 2-3; `OI`: 2-3 + 2-3; `TA`: 2-3 + serial, width unstated — modelled as 2-3 by analogy); historical-series summary (registration began 1900-09-17; pre-1971 capacity of "1 millón de vehículos por provincia")                                   | <https://www.dgt.es/comunicacion/noticias/tipos-matricula/> |
| `ES-CDC-1934`    | Código de la Circulación, Decreto de 25 de septiembre de 1934 (BOE-A-1934-8197)            | Pre-1971 provincial plates: contraseña + hyphen + permit order number (arts. 230-233); the 52-code province list                                                                                                                                                                                             | <https://www.boe.es/buscar/doc.php?id=BOE-A-1934-8197>      |
| `ES-D2046-1971`  | Decreto 2046/1971, de 13 de agosto (BOE-A-1971-1149), in force 1971-10-07                  | 1971-2000 provincial series: contraseña + 4 cifras (0000-9999) + 1-2 letras A→ZZ (art. 231.I); province list incl. `SH` (art. 233); homologated font without `Q`/`Ñ` (Anexo 1); old plates kept (disp. trans. 1.ª)                                                                                           | <https://www.boe.es/buscar/doc.php?id=BOE-A-1971-1149>      |
| `ES-ORD-2000`    | Orden de 15 de septiembre de 2000 (BOE-A-2000-16805), in force 2000-09-17                  | Replaces Anexo XVIII with the national series, ending provincial issuance; existing provincial numbers kept (disp. trans. 1.ª/2.ª)                                                                                                                                                                           | <https://www.boe.es/buscar/doc.php?id=BOE-A-2000-16805>     |
| `ES-RD567-1992`  | Real Decreto 567/1992 (BOE-A-1992-13183), in force 1992-06-10                              | Province code `GE` → `GI`                                                                                                                                                                                                                                                                                    | <https://www.boe.es/buscar/doc.php?id=BOE-A-1992-13183>     |
| `ES-RD1209-1997` | Real Decreto 1209/1997 (BOE-A-1997-17594), in force 1997-08-06                             | Province code `PM` → `IB`                                                                                                                                                                                                                                                                                    | <https://www.boe.es/buscar/doc.php?id=BOE-A-1997-17594>     |

### Portugal

| ID              | Reference                                                    | Used for                                                                                                                                                                                                                    | URL                                                                                 |
| --------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `PT-RULES`      | Decreto-Lei n.º 54/2005 (consolidated)                       | General series composition (art. 3.º); trailers (art. 4.º n.º 1 + Anexo I service codes); export (art. 4.º n.º 3; colours art. 6.º n.º 1). Original issue PDF: `files.diariodarepublica.pt/gratuitos/1s/2005/03/044a00.pdf` | <https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2005-128021130> |
| `PT-DL106-2006` | Decreto-Lei n.º 106/2006 (1.ª alteração ao DL 54/2005)       | Industrial machines join the Regulamento: number = general series + class letter (art. 3.º n.º 3), red plates (art. 5.º n.º 11); replacement Anexo I (Viseu `VS` → `VI`)                                                    | <https://files.diariodarepublica.pt/1s/2006/06/111a00/40524060.pdf>                 |
| `PT-DL107-2006` | Decreto-Lei n.º 107/2006 (matrícula de máquinas industriais) | Anexo II: the circulation classes `A`-`H` (A-D ≤ 40 km/h, E-H above); in force 2006-09-06                                                                                                                                   | <https://files.diariodarepublica.pt/gratuitos/1s/2006/06/111a00.pdf>                |
| `PT-2020`       | Decreto-Lei n.º 2/2020 (4.ª alteração ao DL 54/2005)         | Current `AA 00 AA` series and 2020 plate models (Anexo V: general, trailer Modelo III, machine Modelos VII/VIII; export models renumbered Anexo VI)                                                                         | <https://diariodarepublica.pt/dr/detalhe/decreto-lei/2-2020-128071719>              |
| `PT-IMT-ID`     | IMT, vehicle identification                                  | Official table of series periods and formats; confirms trailers/semi-trailers stay outside the three-group series                                                                                                           | <https://www.imt-ip.pt/veiculos/identificacao-veiculos/>                            |

### France

| ID              | Reference                                                                             | Used for                                                                                  | URL                                                           |
| --------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `FR-SIV`        | Service Public, SIV                                                                   | Current SIV series `AA-123-AA`; letters `I`, `O`, `U` unused; first group never `SS`/`WW` | <https://www.service-public.fr/particuliers/vosdroits/F17638> |
| `FR-PLATES`     | Service Public, plate characteristics                                                 | Visual characteristics; `WW` pink background from 2026                                    | <https://www.service-public.fr/particuliers/vosdroits/F20319> |
| `FR-MODALITIES` | Arrêté du 9 février 2009 (registration procedures, consolidated), art. 8 & Annexe VII | `WW` provisional series                                                                   | <https://www.legifrance.gouv.fr/loda/id/JORFTEXT000020237165> |

### Italy

| ID               | Reference                                                                   | Used for                                                                                                                                                                    | URL                                                                                                           |
| ---------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `IT-CDS`         | _Codice della Strada_, D.Lgs. 30 aprile 1992, n. 285 (artt. 93, 100, 134)   | Vehicle registration, the plate requirement, and the Escursionisti Esteri regime                                                                                            | <https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:1992-04-30;285>                     |
| `IT-REG`         | _Regolamento di esecuzione_, D.P.R. 16 dicembre 1992, n. 495 (consolidated) | Ordinary series (artt. 254-258); moped plate (art. 250); data-formation rules and the plate alphabet without `I`,`O`,`Q`,`U` (art. 257 + Appendice XII); colours (art. 260) | <https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.del.presidente.della.repubblica:1992-12-16;495> |
| `IT-DPR355-1998` | D.P.R. 4 settembre 1998, n. 355 (GU n. 240 del 14-10-1998)                  | Motorcycle plate: replaces Appendice XII lett. c) and fig. III 4/e (177×177 mm; the figure shows 2 characters over 5, backing the issued `LL 00000` series)                 | <https://www.gazzettaufficiale.it/eli/gu/1998/10/14/240/sg/pdf>                                               |
| `IT-DPR474-2001` | D.P.R. 24 novembre 2001, n. 474 (GU 30-1-2002)                              | Targa prova: `XX P XXXXX` (art. 2, comma 3); abrogates the four pre-2002 test formats                                                                                       | <https://www.normattiva.it/uri-res/N2Ls?urn:nir:presidente.repubblica:decreto:2001-11-24;474>                 |
| `IT-DPR153-2006` | D.P.R. 6 marzo 2006, n. 153 (in force 2006-07-14)                           | Moped plate: replaces art. 250 of DPR 495/1992 — six alphanumeric characters, white, personal                                                                               | <https://www.normattiva.it/uri-res/N2Ls?urn:nir:presidente.repubblica:decreto:2006-03-06;153>                 |
| `IT-DPR198-2012` | D.P.R. 28 settembre 2012, n. 198 (in force 2013-02-20)                      | Trailers: rear plate takes the car structure (Appendice XII lett. a); old "Rimorchio" letter b) and EE-trailer letter q) suppressed; applies to trailers registered after   | <https://www.normattiva.it/uri-res/N2Ls?urn:nir:presidente.repubblica:decreto:2012-09-28;198>                 |

### Germany

| ID          | Reference                                                                                              | Used for                                                                                                                                                                                                         | URL                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DE-FZV`    | Fahrzeug-Zulassungsverordnung (FZV) of 20 July 2023, consolidated (replaced the FZV 2011)              | Plate composition: district + identifier (§ 9); Oldtimer `H` suffix (§ 10(1)); electric `E` suffix (§ 11(2)); identifier alphabet and number ranges (Anlage 1); character-count limits per plate type (Anlage 4) | <https://www.gesetze-im-internet.de/fzv_2023/>                                                                                                     |
| `DE-KBA-UZ` | Kraftfahrt-Bundesamt, _Kfz-Kennzeichen und auslaufende Kennzeichen in Deutschland_ (Stand: 16.04.2026) | District-code table (`metadata/tables/de-unterscheidungszeichen.json`): codes approved for assignment plus revoked codes still valid until deregistration (§ 9(3) FZV). Codes are set by the BMV per § 9(3)      | <https://www.kba.de/DE/Service/Veroeffentlichungen/Oeffentlichkeitsarbeit/Faltblaetter_Broschueren/kraftfahrzeugkennzeichen_faltblatt_inhalt.html> |

### Belgium

| ID           | Reference                                                                                     | Used for                                                                                                                                                                                                                                                                          | URL                                                                         |
| ------------ | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `BE-KB-2001` | Arrêté royal du 20 juillet 2001 relatif à l'immatriculation de véhicules                      | Standard series `1-ABC-123`; red on white                                                                                                                                                                                                                                         | <https://www.ejustice.just.fgov.be/eli/arrete/2001/07/20/2001014153/justel> |
| `BE-AM-2001` | Arrêté ministériel du 23 juillet 2001 relatif à l'immatriculation de véhicules (consolidated) | Inscription composition per category: ordinary and old models (art. 4), temporary W/X (art. 5, 13, 21), diplomatic `CD` (art. 7, 15), commercial `Z`/`Y`/`V` green plates (art. 8, 16), agricultural `G` (art. 9), motorcycles `M` (art. 12), mopeds `S` + class letter (art. 19) | <https://www.ejustice.just.fgov.be/eli/arrete/2001/07/23/2001014154/justel> |

### Netherlands

| ID               | Reference                                          | Used for                                                                                                                                                        | URL                                                                          |
| ---------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `NL-KENTEKEN`    | Kentekenreglement (BWBR0006951)                    | Kenteken definition and special series delegation                                                                                                               | <https://wetten.overheid.nl/BWBR0006951>                                     |
| `NL-REGELING`    | Regeling kentekens en kentekenplaten (BWBR0009071) | Art. 1: the kenteken letter/digit groupings covering all sidecode shapes; art. 3: colours (yellow retroreflective; white-on-dark-blue allowed pre-1977/78 only) | <https://wetten.overheid.nl/BWBR0009071>                                     |
| `NL-RDW-SERIES`  | RDW, _Overzicht van kentekenseries_                | Official per-category sidecode tables with first-issuance dates (sidecodes 4-12)                                                                                | <https://www.rdw.nl/de-kentekenplaat/overzicht-van-kentekenseries>           |
| `NL-RDW-HIST`    | RDW, _Historie RDW_                                | First-issuance dates and first plates of sidecodes 1-5 (1951/1965/1973/1978/1991); dark-blue plates until the 1978 yellow mandate                               | <https://www.rdw.nl/over-rdw/organisatie/historie-rdw>                       |
| `NL-RDW-LETTERS` | RDW, _Cijfers en letters op de kentekenplaat_      | Letter rules: vowels banned since sidecode 4 (O kept for semi-trailers), `C`/`Q` never used, reserved combinations, per-category first letters                  | <https://www.rdw.nl/de-kentekenplaat/cijfers-en-letters-op-de-kentekenplaat> |

### Poland

Consolidated texts are published as promulgated PDFs; the machine-readable copies used for verification come from the official Sejm ELI API (`api.sejm.gov.pl/eli/acts/DU/{year}/{pos}/text.pdf`). ISAP DocDetails URLs are the canonical citations (they serve a CAPTCHA to non-browser clients but work in a browser).

| ID                 | Reference                                                                                                                                                                  | Used for                                                                                                                                                                                                                              | URL                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `PL-ROZP-2024`     | Rozporządzenie Ministra Infrastruktury z 8.11.2024 w sprawie rejestracji i oznaczania pojazdów… (Dz.U. 2024 poz. 1709), in force 2024-11-30; replaced Dz.U. 2022 poz. 1847 | Plate types (§ 25-26), colours and EU band (§ 27-28), the 25-letter base set and every serial arrangement (§ 30), serial-letter exclusions and discriminant system (§ 31-32), voivodeship/powiat discriminant table (Załącznik nr 13) | <https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20240001709> |
| `PL-ROZP-2025-939` | Rozporządzenie MI z 9.07.2025 (Dz.U. 2025 poz. 939), in force 2025-07-30                                                                                                   | Adds powiat codes WW/VB/NX; owner's choice of voivodeship letter for individual plates; moped-plate wording fix                                                                                                                       | <https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20250000939> |
| `PL-ROZP-2026-891` | Rozporządzenie MI z 1.07.2026 (Dz.U. 2026 poz. 891); § 1 pkt 9 in force one month after the 2026-07-03 promulgation                                                        | Adds powiat codes CE/CM, TR/TN, OZ/OP (window not enforced in the table)                                                                                                                                                              | <https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20260000891> |
| `PL-ROZP-1999`     | Rozporządzenie MTiGM z 19.06.1999 (Dz.U. 1999 nr 59 poz. 632)                                                                                                              | § 49: the voivodeship+powiat discriminant system in force 2000-05-01 (old-style plates issued until 2000-04-30) — the `validFrom` of the current system                                                                               | <https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19990590632> |
| `PL-ROZP-2017`     | Rozporządzenie MITB z 11.12.2017 (Dz.U. 2017 poz. 2355)                                                                                                                    | § 57 pkt 2: reduced-size plates and the expanded motorcycle arrangements in force 2018-07-01                                                                                                                                          | <https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20170002355> |
| `PL-PROF`          | Rozporządzenie MI z 12.03.2019 w sprawie profesjonalnej rejestracji pojazdów (Dz.U. 2019 poz. 546; tekst jednolity Dz.U. 2023 poz. 2616), in force 2019-07-11              | Professional plates: 25-letter set and format (§ 14), sizes (§ 11), colours/EU band (§ 13), per-voivodeship letters and powiat numbers (Załącznik nr 8)                                                                               | <https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20230002616> |

### Austria

| ID             | Reference                                                                                                                                               | Used for                                                                                                                                                                                                                                 | URL                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `AT-KFG`       | Kraftfahrgesetz 1967 (BGBl. Nr. 267/1967, consolidated)                                                                                                 | § 48: authority code + Vormerkzeichen composition; § 48a: Wunschkennzeichen; § 49: plate colours, coat of arms, red-white-red edging, EU band; § 45/§ 46: Probefahrt/Überstellung regimes (not modelled); § 132: transitional provisions | <https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10011384> |
| `AT-KDV`       | Kraftfahrgesetz-Durchführungsverordnung 1967 (BGBl. Nr. 399/1967, consolidated), § 26 idF BGBl. II Nr. 384/2024                                         | § 26: authority codes (Abs. 1 → Anlage 5d), special prefixes (Abs. 2-5), Vormerkzeichen form rules (Abs. 6), hyphen for the coat of arms in writing (Abs. 7), offensive Wunsch combinations (Abs. 8); Anlage 5e: plate types and colours | <https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10011385> |
| `AT-KDV-HIST`  | KDV Anlage 5d, superseded consolidated versions on RIS (NOR40051037 pre-2012; changes by BGBl. II Nr. 432/2011, 471/2012, 287/2016, 394/2019, 260/2024) | The retired-but-circulating authority codes JU, KF, MZ, HB, FF, RA, FB, WU and the KG/BA additions                                                                                                                                       | <https://www.ris.bka.gv.at/Dokumente/Bundesnormen/NOR40051037/NOR40051037.html>              |
| `AT-KFG-NOV11` | 11. KFG-Novelle (BGBl. Nr. 375/1988), Art. V                                                                                                            | White-plate system in force 1989-01-01; per-authority rollout window and old-stock issuance until 1990-01-31                                                                                                                             | <https://www.ris.bka.gv.at/Dokumente/Bundesnormen/NOR12161757/NOR12161757.html>              |

---

## Reference library for upcoming schemes

Not yet cited by shipped metadata, but the primary sources planned for the next
schemes. Listed here so the citations are ready and reviewed before the schemes
land.

### Spain

| ID            | Reference                                     | Covers                                                | URL                                                                                                                  |
| ------------- | --------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `ES-HIST-DGT` | DGT, historical-vehicle registration, Group A | Group A keeps its ordinary plate + circular `H` badge | <https://www.dgt.es/nuestros-servicios/tu-vehiculo/vehiculos-historicos/matriculacion-vehiculos-historicos/grupo-a/> |

### Portugal

| ID                   | Reference                             | Covers                                                                       | URL                                                                       |
| -------------------- | ------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `PT-IMT-NEW`         | IMT, press release on the 2020 plates | Letter-exclusion rules in the current series (positional vowel restrictions) | <https://www.imt-ip.pt/noticias/comunicado-de-imprensa-novas-matriculas/> |
| `PT-IMT-NEW-VEHICLE` | IMT, registration of new vehicles     | Trailers and industrial machines details                                     | <https://www.imt-ip.pt/veiculos/matricula/matricula-de-veiculos-novos/>   |

### France

| ID               | Reference                                                     | Covers                        | URL                                                           |
| ---------------- | ------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------- |
| `FR-TRAILERS`    | Service Public, trailer/caravan registration                  | Registration by PTAC          | <https://www.service-public.fr/particuliers/vosdroits/F21112> |
| `FR-PLATE-SPECS` | Arrêté du 9 février 2009 (plate characteristics and mounting) | Physical plate specifications | <https://www.legifrance.gouv.fr/loda/id/JORFTEXT000020237128> |

---

## Adding a source

1. Add a row here (or a `###` heading for a heavily-used primary source) with a
   stable ID, the full legal reference, what it covers, and a URL.
2. Reference the ID from the scheme YAML under `sources`, with a `section` when
   the document is long (e.g. `Anexo XVIII, I.A.c`).
3. Update `sourceCheckedAt` when you verify the source for a release.

> Do not base a scheme on photographs, blogs or unofficial listings. Every
> scheme must trace to an official, citable source.

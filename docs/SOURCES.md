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
sourceCheckedAt: 2026-07-23
metadataVersion:  2026.07.2
```

---

## Currently referenced by shipped metadata

### Spain

| ID              | Reference                                                                                  | Used for                                                                                                                                                                                                                                                                                                     | URL                                                         |
| --------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `ES-RGV`        | Real Decreto 2822/1998, _Reglamento General de Vehículos_ (consolidated), esp. Anexo XVIII | Ordinary series (I.A.a); special `E` (I.A.b), trailers `R` (I.A.c), mopeds `C` (I.A.d); diplomatic regime `CD`/`OI`/`CC`/`TA` (I.B.a — structure and colours; digit widths are not fixed by the RGV); historical `H` (I.B.c), tourist `T` (I.B.b), temporary private `P` (I.C.a) and company `S`/`V` (I.C.b) | <https://www.boe.es/buscar/act.php?id=BOE-A-1999-1826>      |
| `ES-HIST-RULES` | Real Decreto 892/2024, _Reglamento de Vehículos Históricos_                                | Historical-vehicle regime (`H` prefix; Group A / Group B)                                                                                                                                                                                                                                                    | <https://www.boe.es/buscar/act.php?id=BOE-A-2024-18614>     |
| `ES-DGT-TYPES`  | DGT, "Matrículas de todos los colores"                                                     | Digit widths of the diplomatic-regime groups (`CD`/`CC`: 2 + 2-3; `OI`: 2-3 + 2-3; `TA`: 2-3 + serial, width unstated — modelled as 2-3 by analogy)                                                                                                                                                          | <https://www.dgt.es/comunicacion/noticias/tipos-matricula/> |

### Portugal

| ID          | Reference                                        | Used for                                                                            | URL                                                                                 |
| ----------- | ------------------------------------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `PT-RULES`  | Decreto-Lei n.º 54/2005 (consolidated), art. 3.º | General series composition (current and historical)                                 | <https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2005-128021130> |
| `PT-2020`   | Decreto-Lei n.º 2/2020                           | Current `AA 00 AA` series and 2020 plate model                                      | <https://diariodarepublica.pt/dr/detalhe/decreto-lei/2-2020-128071719>              |
| `PT-IMT-ID` | IMT, vehicle identification                      | Official table of series periods and formats (incl. the pre-2020 historical series) | <https://www.imt-ip.pt/veiculos/identificacao-veiculos/>                            |

### France

| ID              | Reference                                                                             | Used for                                                                                  | URL                                                           |
| --------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `FR-SIV`        | Service Public, SIV                                                                   | Current SIV series `AA-123-AA`; letters `I`, `O`, `U` unused; first group never `SS`/`WW` | <https://www.service-public.fr/particuliers/vosdroits/F17638> |
| `FR-PLATES`     | Service Public, plate characteristics                                                 | Visual characteristics; `WW` pink background from 2026                                    | <https://www.service-public.fr/particuliers/vosdroits/F20319> |
| `FR-MODALITIES` | Arrêté du 9 février 2009 (registration procedures, consolidated), art. 8 & Annexe VII | `WW` provisional series                                                                   | <https://www.legifrance.gouv.fr/loda/id/JORFTEXT000020237165> |

### Italy

| ID       | Reference                                                                    | Used for                                                         | URL                                                                                                           |
| -------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `IT-CDS` | _Codice della Strada_, D.Lgs. 30 aprile 1992, n. 285 (art. 93)               | Vehicle registration and the plate requirement                   | <https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:1992-04-30;285>                     |
| `IT-REG` | _Regolamento di esecuzione_, D.P.R. 16 dicembre 1992, n. 495 (artt. 254-258) | Ordinary `AA 000 AA` series; letters `I`, `O`, `Q`, `U` not used | <https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.del.presidente.della.repubblica:1992-12-16;495> |

### Germany

| ID          | Reference                                                                                              | Used for                                                                                                                                                                                                         | URL                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DE-FZV`    | Fahrzeug-Zulassungsverordnung (FZV) of 20 July 2023, consolidated (replaced the FZV 2011)              | Plate composition: district + identifier (§ 9); Oldtimer `H` suffix (§ 10(1)); electric `E` suffix (§ 11(2)); identifier alphabet and number ranges (Anlage 1); character-count limits per plate type (Anlage 4) | <https://www.gesetze-im-internet.de/fzv_2023/>                                                                                                     |
| `DE-KBA-UZ` | Kraftfahrt-Bundesamt, _Kfz-Kennzeichen und auslaufende Kennzeichen in Deutschland_ (Stand: 16.04.2026) | District-code table (`metadata/tables/de-unterscheidungszeichen.json`): codes approved for assignment plus revoked codes still valid until deregistration (§ 9(3) FZV). Codes are set by the BMV per § 9(3)      | <https://www.kba.de/DE/Service/Veroeffentlichungen/Oeffentlichkeitsarbeit/Faltblaetter_Broschueren/kraftfahrzeugkennzeichen_faltblatt_inhalt.html> |

### Belgium

| ID           | Reference                                                                | Used for                                  | URL                                                                         |
| ------------ | ------------------------------------------------------------------------ | ----------------------------------------- | --------------------------------------------------------------------------- |
| `BE-KB-2001` | Arrêté royal du 20 juillet 2001 relatif à l'immatriculation de véhicules | Standard series `1-ABC-123`; red on white | <https://www.ejustice.just.fgov.be/eli/arrete/2001/07/20/2001014153/justel> |

### Netherlands

| ID            | Reference                       | Used for                                                                                | URL                                      |
| ------------- | ------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------- |
| `NL-KENTEKEN` | Kentekenreglement (BWBR0006951) | Current series `XXX-99-X` and recent sidecodes; letters omit vowels, `C`, `Q`, `M`, `W` | <https://wetten.overheid.nl/BWBR0006951> |

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

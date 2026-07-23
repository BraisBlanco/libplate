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
metadataVersion:  2026.07.0
```

---

## Currently referenced by shipped metadata

### Spain

| ID       | Reference                                                                                  | Used for                                                                               | URL                                                    |
| -------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `ES-RGV` | Real Decreto 2822/1998, _Reglamento General de Vehículos_ (consolidated), esp. Anexo XVIII | Ordinary series (I.A.a), special `E` (I.A.b), trailers `R` (I.A.c), mopeds `C` (I.A.d) | <https://www.boe.es/buscar/act.php?id=BOE-A-1999-1826> |

### Portugal

| ID          | Reference                                        | Used for                                       | URL                                                                                 |
| ----------- | ------------------------------------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| `PT-RULES`  | Decreto-Lei n.º 54/2005 (consolidated), art. 3.º | General series composition                     | <https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2005-128021130> |
| `PT-2020`   | Decreto-Lei n.º 2/2020                           | Current `AA 00 AA` series and 2020 plate model | <https://diariodarepublica.pt/dr/detalhe/decreto-lei/2-2020-128071719>              |
| `PT-IMT-ID` | IMT, vehicle identification                      | Official table of periods and formats          | <https://www.imt-ip.pt/veiculos/identificacao-veiculos/>                            |

### France

| ID          | Reference                             | Used for                                               | URL                                                           |
| ----------- | ------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| `FR-SIV`    | Service Public, SIV                   | Current SIV series `AA-123-AA`                         | <https://www.service-public.fr/particuliers/vosdroits/F17638> |
| `FR-PLATES` | Service Public, plate characteristics | Visual characteristics; letters `I`, `O`, `U` not used | <https://www.service-public.fr/particuliers/vosdroits/F20319> |

### Italy

| ID       | Reference                                                                    | Used for                                                         | URL                                                                                                           |
| -------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `IT-CDS` | _Codice della Strada_, D.Lgs. 30 aprile 1992, n. 285 (art. 93)               | Vehicle registration and the plate requirement                   | <https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:1992-04-30;285>                     |
| `IT-REG` | _Regolamento di esecuzione_, D.P.R. 16 dicembre 1992, n. 495 (artt. 254-258) | Ordinary `AA 000 AA` series; letters `I`, `O`, `Q`, `U` not used | <https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.del.presidente.della.repubblica:1992-12-16;495> |

---

## Reference library for upcoming schemes

Not yet cited by shipped metadata, but the primary sources planned for the next
schemes. Listed here so the citations are ready and reviewed before the schemes
land.

### Spain

| ID              | Reference                                                   | Covers                                                     | URL                                                                                                                  |
| --------------- | ----------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `ES-DGT-TYPES`  | DGT, "Matrículas de todos los colores"                      | Overview of current and historical plate types and systems | <https://www.dgt.es/comunicacion/noticias/tipos-matricula/>                                                          |
| `ES-HIST-RULES` | Real Decreto 892/2024, _Reglamento de Vehículos Históricos_ | Historical-vehicle regime (Group A / Group B, `H` prefix)  | <https://www.boe.es/buscar/act.php?id=BOE-A-2024-18614>                                                              |
| `ES-HIST-DGT`   | DGT, historical-vehicle registration, Group A               | Group A keeps its ordinary plate + circular `H` badge      | <https://www.dgt.es/nuestros-servicios/tu-vehiculo/vehiculos-historicos/matriculacion-vehiculos-historicos/grupo-a/> |

### Portugal

| ID                   | Reference                             | Covers                                                                       | URL                                                                       |
| -------------------- | ------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `PT-IMT-NEW`         | IMT, press release on the 2020 plates | Letter-exclusion rules in the current series (positional vowel restrictions) | <https://www.imt-ip.pt/noticias/comunicado-de-imprensa-novas-matriculas/> |
| `PT-IMT-NEW-VEHICLE` | IMT, registration of new vehicles     | Trailers and industrial machines details                                     | <https://www.imt-ip.pt/veiculos/matricula/matricula-de-veiculos-novos/>   |

### France

| ID               | Reference                                                        | Covers                                                      | URL                                                           |
| ---------------- | ---------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| `FR-TRAILERS`    | Service Public, trailer/caravan registration                     | Registration by PTAC                                        | <https://www.service-public.fr/particuliers/vosdroits/F21112> |
| `FR-MODALITIES`  | Arrêté du 9 février 2009 (registration procedures, consolidated) | Articles 8, 9 and Annexe VII (`W`, `WW`, diplomatic series) | <https://www.legifrance.gouv.fr/loda/id/JORFTEXT000020237165> |
| `FR-PLATE-SPECS` | Arrêté du 9 février 2009 (plate characteristics and mounting)    | Physical plate specifications                               | <https://www.legifrance.gouv.fr/loda/id/JORFTEXT000020237128> |

---

## Adding a source

1. Add a row here (or a `###` heading for a heavily-used primary source) with a
   stable ID, the full legal reference, what it covers, and a URL.
2. Reference the ID from the scheme YAML under `sources`, with a `section` when
   the document is long (e.g. `Anexo XVIII, I.A.c`).
3. Update `sourceCheckedAt` when you verify the source for a release.

> Do not base a scheme on photographs, blogs or unofficial listings. Every
> scheme must trace to an official, citable source.

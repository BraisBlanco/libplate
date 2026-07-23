# Validador europeo de matrículas

## Análisis funcional, regulatorio y propuesta de arquitectura

**Ámbito inicial:** España, Portugal y Francia  
**Fecha de referencia:** 22 de julio de 2026  
**Objetivo:** servir como documento de contexto para comenzar el diseño y desarrollo de una librería comparable conceptualmente con `libphonenumber`, pero aplicada a matrículas de vehículos.

> **Aviso importante:** esta librería puede validar formatos conocidos y extraer información codificada en ellos, pero no puede demostrar que una matrícula exista, esté actualmente asignada, corresponda al vehículo observado o no haya sido falsificada. Esa comprobación requiere acceso autorizado a registros administrativos.

---

## 1. Resumen ejecutivo

El proyecto es viable si se plantea como una librería de **normalización, análisis, formato y validación de esquemas de matrículas**, y no como una base de datos de vehículos.

La principal dificultad no está en escribir expresiones regulares, sino en mantener metadatos fiables sobre:

- países y jurisdicciones;
- sistemas actuales e históricos;
- clases de matrícula;
- tipos de vehículo que pueden deducirse;
- periodos de vigencia;
- alfabetos y combinaciones excluidas;
- reglas visuales, como color, dimensiones o bandas laterales;
- ambigüedades entre países y sistemas;
- fuentes oficiales y sus cambios regulatorios.

La arquitectura recomendada consiste en:

1. Definir las reglas como metadatos declarativos, preferiblemente YAML.
2. Validar esos metadatos con un esquema formal.
3. Compilarlos a una representación intermedia canónica.
4. Consumir la misma representación desde runtimes nativos para Java y TypeScript/JavaScript.
5. Ejecutar la misma batería de conformidad en todos los lenguajes.
6. Versionar por separado el runtime y los metadatos regulatorios.

Esta estrategia se inspira en el enfoque general de `libphonenumber`, que mantiene implementaciones para varios lenguajes y herramientas de generación de metadatos para Java y JavaScript. Véanse [LIBPHONE-REPO] y [LIBPHONE-BUILD].

---

## 2. Qué debería hacer la librería

### 2.1 Capacidades principales

La librería debería poder:

- normalizar una entrada;
- preservar la entrada original;
- detectar caracteres inválidos;
- reconocer uno o varios esquemas candidatos;
- validar una matrícula para un país conocido;
- detectar ambigüedades cuando no se facilita el país;
- dar formato nacional o compacto;
- extraer segmentos estructurados;
- identificar el tipo de matrícula;
- inferir una categoría de vehículo cuando el esquema lo permita;
- señalar qué información requiere evidencia visual;
- devolver explicaciones y códigos de error estables;
- exponer la versión del runtime y de los metadatos.

### 2.2 Lo que no debe prometer

La librería no debería afirmar, salvo integración externa autorizada, que:

- la matrícula ha sido realmente expedida;
- el número continúa activo;
- pertenece a una persona concreta;
- corresponde al vehículo observado;
- el vehículo está asegurado o tiene inspección vigente;
- el vehículo es robado;
- el número no ha sido clonado;
- una matrícula ordinaria revela el modelo o la clase exacta del vehículo cuando el sistema no la codifica.

### 2.3 Niveles de validación

Conviene separar al menos cuatro conceptos:

| Nivel          | Significado                                                                               |
| -------------- | ----------------------------------------------------------------------------------------- |
| `POSSIBLE`     | La longitud, los caracteres y la estructura general son plausibles.                       |
| `VALID_FORMAT` | Coincide con un esquema regulado conocido.                                                |
| `PLAUSIBLE`    | Además respeta alfabetos, prefijos, rangos, fechas o tablas auxiliares conocidas.         |
| `ISSUED`       | Consta como expedida en un registro oficial. No es comprobable sin integración registral. |

Una matrícula puede tener `VALID_FORMAT = true` y no haber sido expedida nunca.

---

## 3. Distinciones fundamentales del modelo

### 3.1 Tipo de matrícula no equivale a tipo de vehículo

Hay que separar:

- **tipo o régimen de matrícula:** ordinaria, temporal, diplomática, histórica, turística, profesional;
- **categoría del vehículo:** automóvil, motocicleta, ciclomotor, remolque, semirremolque, vehículo especial, máquina industrial;
- **uso o servicio:** taxi, VTC, administración pública, misión diplomática;
- **estado administrativo:** provisional, exportación, histórico, colección.

Ejemplos:

- Una matrícula española `R` permite inferir que corresponde a un remolque o semirremolque.
- Una matrícula francesa `WW` permite inferir que es provisional, pero no si corresponde a un turismo, una motocicleta o una máquina agrícola.
- Una matrícula portuguesa de la serie general no permite distinguir entre automóvil, motocicleta, ciclomotor, triciclo o cuadriciclo solo por el texto.

### 3.2 El texto no contiene toda la información de la placa

Parte de la clasificación puede estar codificada en:

- color del fondo;
- color de los caracteres;
- número de líneas;
- dimensiones físicas;
- banda europea y código nacional;
- distintivos territoriales;
- fecha de caducidad impresa;
- distintivo de vehículo histórico;
- posición del número en la placa.

Por ello, la API debería admitir opcionalmente datos observados de la placa, pero su ausencia no debería invalidar automáticamente el número textual.

### 3.3 La matrícula no es un identificador global

El identificador lógico mínimo es:

```text
país + número normalizado + esquema o régimen
```

Una misma cadena puede ser válida en varios países o sistemas históricos.

---

## 4. API conceptual

### 4.1 Validación con país conocido

```ts
const result = validatePlate("R-1234-BCD", {
  country: "ES",
});
```

Resultado conceptual:

```json
{
  "status": "VALID",
  "input": "R-1234-BCD",
  "normalized": "R1234BCD",
  "country": "ES",
  "scheme": "ES_TRAILER_CURRENT",
  "formatted": "R 1234 BCD",
  "registration": {
    "type": "ORDINARY",
    "temporary": false,
    "diplomatic": false,
    "historical": false
  },
  "vehicle": {
    "category": "TRAILER_OR_SEMITRAILER",
    "inferenceLevel": "DETERMINISTIC",
    "evidence": ["PREFIX_R"]
  },
  "visual": {
    "expectedBackground": "RED",
    "expectedForeground": "BLACK",
    "checked": false
  }
}
```

### 4.2 Detección sin país conocido

```ts
const result = detectPlate("AB1234");
```

Resultado conceptual:

```json
{
  "status": "AMBIGUOUS",
  "normalized": "AB1234",
  "candidates": [
    {
      "country": "ES",
      "scheme": "ES_PROVINCIAL_NUMERIC_1900_1971",
      "formatted": "AB-1234",
      "details": {
        "provinceCode": "AB",
        "province": "Albacete"
      }
    },
    {
      "country": "PT",
      "scheme": "PT_GENERAL_UNTIL_1992",
      "formatted": "AB-12-34"
    }
  ]
}
```

España utilizó un sistema provincial numérico entre 1900 y 1971 y reconoce `AB` como sigla de Albacete; Portugal utilizó hasta el 29 de febrero de 1992 el patrón `AA-00-00`. Véanse [ES-DGT-TYPES], [ES-RGV] y [PT-IMT-ID].

### 4.3 Posible interfaz común

```text
parsePlate
validatePlate
detectPlate
normalizePlate
formatPlate
getPlateCandidates
getExamplePlate
getSupportedCountries
getSupportedSchemes
getMetadataVersion
getLibraryVersion
explainPlate
```

### 4.4 Códigos de estado

```ts
type ValidationStatus = "VALID" | "INVALID" | "AMBIGUOUS" | "POSSIBLE" | "UNSUPPORTED";
```

### 4.5 Códigos de error estables

```ts
type ValidationReason =
  | "VALID"
  | "EMPTY_INPUT"
  | "TOO_SHORT"
  | "TOO_LONG"
  | "INVALID_CHARACTERS"
  | "INVALID_LENGTH"
  | "INVALID_STRUCTURE"
  | "INVALID_PREFIX"
  | "INVALID_SEQUENCE"
  | "OUTSIDE_VALIDITY_PERIOD"
  | "AMBIGUOUS_COUNTRY"
  | "AMBIGUOUS_SCHEME"
  | "UNSUPPORTED_COUNTRY"
  | "UNSUPPORTED_SCHEME"
  | "VISUAL_EVIDENCE_REQUIRED"
  | "REGISTRY_CHECK_REQUIRED";
```

Los mensajes localizados pueden cambiar; los códigos no deberían cambiar sin una versión mayor.

---

## 5. Modelo de inferencia

No conviene usar un único campo nullable `vehicleType`. Es mejor devolver evidencia y nivel de inferencia.

```ts
type InferenceLevel =
  | "DETERMINISTIC"
  | "CATEGORY_ONLY"
  | "VISUAL_EVIDENCE_REQUIRED"
  | "REGISTRY_REQUIRED"
  | "NOT_INFERABLE";

interface VehicleCategoryInference {
  category?: VehicleCategory;
  possibleCategories?: VehicleCategory[];
  inferenceLevel: InferenceLevel;
  evidence: Evidence[];
}
```

Categorías iniciales sugeridas:

```ts
type VehicleCategory =
  | "PASSENGER_CAR"
  | "MOTORCYCLE"
  | "MOPED_OR_MOTOR_CYCLE"
  | "TRICYCLE"
  | "QUADRICYCLE"
  | "VAN"
  | "TRUCK"
  | "BUS"
  | "TRAILER"
  | "SEMITRAILER"
  | "TRAILER_OR_SEMITRAILER"
  | "SPECIAL_VEHICLE"
  | "AGRICULTURAL_VEHICLE"
  | "INDUSTRIAL_MACHINE"
  | "UNKNOWN_MOTOR_VEHICLE"
  | "OTHER";
```

### 5.1 Evidencias

```ts
type Evidence =
  | { type: "PREFIX"; value: string }
  | { type: "PATTERN"; value: string }
  | { type: "COUNTRY_HINT"; value: string }
  | { type: "EU_COUNTRY_CODE"; value: string }
  | { type: "BACKGROUND_COLOR"; value: string }
  | { type: "FOREGROUND_COLOR"; value: string }
  | { type: "ISSUING_CODE"; value: string }
  | { type: "DATE_RANGE"; value: string }
  | { type: "USER_SUPPLIED_CATEGORY"; value: string };
```

---

## 6. Normalización

### 6.1 No destruir información demasiado pronto

Deben mantenerse varias representaciones:

```json
{
  "raw": "AB-123-CD",
  "unicodeNormalized": "AB-123-CD",
  "canonicalText": "AB-123-CD",
  "compact": "AB123CD"
}
```

Los separadores y la disposición pueden ayudar a diferenciar esquemas. El motor puede usar la versión compacta para encontrar candidatos, pero debe conservar el formato original como evidencia.

### 6.2 Operaciones razonables

- normalización Unicode, preferiblemente NFKC con cautela;
- conversión a mayúsculas con reglas independientes del locale;
- unificación opcional de guiones Unicode;
- eliminación controlada de espacios separadores;
- rechazo de caracteres invisibles no autorizados;
- longitud máxima estricta antes de ejecutar reglas;
- preservación del valor original.

### 6.3 OCR

Las sustituciones OCR no deberían aplicarse silenciosamente:

```text
O ↔ 0
I ↔ 1
B ↔ 8
S ↔ 5
Z ↔ 2
G ↔ 6
```

Es preferible devolver candidatos corregidos:

```json
{
  "status": "POSSIBLE",
  "warnings": ["OCR_CONFUSION_DETECTED"],
  "correctionCandidates": [
    {
      "value": "AB-123-CD",
      "changes": [{ "position": 3, "from": "I", "to": "1" }]
    }
  ]
}
```

---

## 7. Arquitectura multi-lenguaje

### 7.1 Principio central

No duplicar manualmente las reglas en Java y JavaScript.

Las reglas deben vivir en una fuente común y las implementaciones deben compartir:

- metadatos;
- semántica;
- códigos de error;
- casos de conformidad;
- versiones;
- referencias regulatorias.

### 7.2 Estructura del repositorio

```text
eu-license-plates/
├── metadata/
│   ├── ES/
│   ├── PT/
│   └── FR/
├── schema/
│   ├── plate-metadata.schema.json
│   └── conformance-case.schema.json
├── compiler/
│   ├── src/
│   └── tests/
├── generated/
│   ├── canonical-metadata.json
│   ├── java-resources/
│   └── javascript-resources/
├── runtimes/
│   ├── java/
│   └── typescript/
├── conformance/
│   ├── valid/
│   ├── invalid/
│   ├── ambiguous/
│   └── visual/
└── docs/
```

### 7.3 Flujo de compilación

```text
YAML fuente
   ↓
validación estructural
   ↓
validación semántica
   ↓
compilación a IR canónico
   ↓
metadatos optimizados por runtime
   ↓
Java + TypeScript/JavaScript
   ↓
tests de conformidad comunes
```

### 7.4 No depender de regex arbitrarias

Java `Pattern` y JavaScript `RegExp` no son idénticos. Se recomienda definir una gramática limitada:

```text
DIGITS(length)
LETTERS(length, alphabet)
CHARSET(length, chars)
LITERAL(value)
SEQUENCE(...)
CHOICE(...)
OPTIONAL(...)
RANGE(min, max)
TABLE_LOOKUP(tableId)
```

El compilador puede producir regex seguras o ejecutar directamente un pequeño autómata.

Ventajas:

- misma semántica en todos los lenguajes;
- menor riesgo de ReDoS;
- reglas inspeccionables;
- generación de documentación;
- validación automática de metadatos;
- facilidad para añadir Python, Go, .NET o PHP.

### 7.5 Ejemplo de metadato

```yaml
schemaVersion: 1
id: ES_TRAILER_CURRENT
country: ES
registrationType: ORDINARY
validFrom: 1999-07-26
vehicleInference:
  category: TRAILER_OR_SEMITRAILER
  level: DETERMINISTIC
  evidence:
    - PREFIX_R
normalization:
  uppercase: true
  acceptedSeparators:
    - " "
    - "-"
segments:
  - name: prefix
    type: LITERAL
    value: R
  - name: serial
    type: DIGITS
    length: 4
  - name: series
    type: CHARSET
    length: 3
    characters: BCDFGHJKLMNPRSTVWXYZ
formats:
  national: "{prefix} {serial} {series}"
  compact: "{prefix}{serial}{series}"
visual:
  background: RED
  foreground: BLACK
sources:
  - id: ES-RGV
    section: "Anexo XVIII, I.A.c"
examples:
  valid:
    - "R 1234 BCD"
    - "R-1234-BCD"
  invalid:
    - "R 123 BCD"
    - "R 1234 AEI"
```

### 7.6 Representación intermedia

El IR no debería ser API pública estable.

```json
{
  "schemaVersion": 1,
  "metadataVersion": "2026.07.0",
  "countries": {
    "ES": {
      "schemes": [
        {
          "id": "ES_TRAILER_CURRENT",
          "validFrom": "1999-07-26",
          "tokens": [
            { "kind": "LITERAL", "value": "R" },
            { "kind": "DIGITS", "min": 4, "max": 4 },
            {
              "kind": "CHARSET",
              "chars": "BCDFGHJKLMNPRSTVWXYZ",
              "min": 3,
              "max": 3
            }
          ]
        }
      ]
    }
  }
}
```

### 7.7 Runtimes nativos

#### Java

```java
PlateResult result = PlateNumbers.validate(
    "R-1234-BCD",
    ValidationOptions.builder()
        .country("ES")
        .build()
);

result.status();
result.normalized();
result.schemeId();
result.vehicleInference();
```

#### TypeScript

```ts
const result = validatePlate("R-1234-BCD", {
  country: "ES",
});

result.status;
result.normalized;
result.schemeId;
result.vehicleInference;
```

Los nombres pueden adaptarse a las convenciones de cada lenguaje, pero el JSON serializado y la semántica deben coincidir.

### 7.8 Tests de conformidad

```json
{
  "id": "ES_TRAILER_VALID_001",
  "input": "r-1234-bcd",
  "options": {
    "country": "ES"
  },
  "expected": {
    "status": "VALID",
    "normalized": "R1234BCD",
    "formatted": "R 1234 BCD",
    "scheme": "ES_TRAILER_CURRENT",
    "vehicleCategory": "TRAILER_OR_SEMITRAILER"
  }
}
```

Los mismos ficheros se ejecutan con JUnit y Vitest/Jest.

### 7.9 Distribución

#### Maven Central

```xml
<dependency>
  <groupId>io.github.example</groupId>
  <artifactId>eu-license-plates</artifactId>
  <version>0.1.0</version>
</dependency>
```

#### npm

```bash
npm install @example/eu-license-plates
```

```ts
import { validatePlate } from "@example/eu-license-plates";
```

Si el paquete europeo crece demasiado:

```ts
import { validatePlate } from "@example/eu-license-plates/core";
import esMetadata from "@example/eu-license-plates/metadata/es";
```

### 7.10 Versionado

```text
libraryVersion: 1.2.0
metadataVersion: 2026.07.1
```

Propuesta:

- `patch`: correcciones de metadatos compatibles;
- `minor`: nuevas funciones o países compatibles;
- `major`: cambios incompatibles en la API o semántica;
- versión de metadatos separada y visible.

`libphonenumber` genera metadatos específicos para Java y JavaScript y ofrece variantes reducidas de metadatos, por lo que es una referencia útil para esta separación. Véanse [LIBPHONE-BUILD], [LIBPHONE-JS] y [LIBPHONE-FAQ].

---

# 8. España

## 8.1 Serie ordinaria nacional actual

Formato conceptual:

```text
1234 BCD
```

Reglas principales:

- cuatro cifras, desde `0000` hasta `9999`;
- tres letras;
- se excluyen las cinco vocales;
- se excluyen `Ñ` y `Q`;
- fondo blanco y caracteres negros en el caso general;
- la placa trasera de taxis y VTC de hasta nueve plazas usa fondo azul y caracteres blancos, pero conserva el mismo número ordinario.

Fuente: [ES-RGV], anexo XVIII, apartado I.A.a.

### Inferencia

```json
{
  "registrationType": "ORDINARY",
  "vehicleCategory": null,
  "inferenceLevel": "NOT_INFERABLE"
}
```

No permite distinguir por texto entre turismo, motocicleta, furgoneta, camión, autobús u otros automóviles.

## 8.2 Vehículos especiales

Formato:

```text
E 1234 BCD
```

Características:

- prefijo `E`;
- cuatro cifras;
- tres letras del mismo alfabeto restringido;
- fondo blanco;
- caracteres rojos.

Fuente: [ES-RGV], anexo XVIII, apartado I.A.b.

### Inferencia

```json
{
  "vehicleCategory": "SPECIAL_VEHICLE",
  "inferenceLevel": "CATEGORY_ONLY"
}
```

El prefijo identifica una categoría amplia, pero no necesariamente si se trata de tractor agrícola, maquinaria de obras, tren turístico u otro subtipo.

## 8.3 Remolques y semirremolques

Formato:

```text
R 1234 BCD
```

Características:

- prefijo `R`;
- cuatro cifras;
- tres letras restringidas;
- fondo rojo;
- caracteres negros.

Fuente: [ES-RGV], anexo XVIII, apartado I.A.c.

Los remolques, semirremolques y determinadas máquinas remolcadas cuya masa máxima autorizada exceda de 750 kg deben portar su matrícula y también la del vehículo remolcador. Los restantes reproducen la del vehículo remolcador. Fuente: [ES-RGV], anexo XVIII, apartado III.4.

### Inferencia

```json
{
  "vehicleCategory": "TRAILER_OR_SEMITRAILER",
  "inferenceLevel": "DETERMINISTIC"
}
```

La matrícula no permite separar con certeza `TRAILER` de `SEMITRAILER`; por ello conviene usar la categoría combinada.

## 8.4 Ciclomotores y ciclos de motor

Formato lógico:

```text
C 1234 BCD
```

La disposición física suele ser vertical, pero el número lógico mantiene los tres grupos.

Características:

- prefijo `C`;
- cuatro cifras;
- tres letras restringidas;
- fondo amarillo;
- caracteres negros.

Fuente: [ES-RGV], anexo XVIII, apartado I.A.d.

### Inferencia

```json
{
  "vehicleCategory": "MOPED_OR_MOTOR_CYCLE",
  "inferenceLevel": "DETERMINISTIC"
}
```

La categoría debe conservar la terminología regulatoria amplia, evitando traducir automáticamente todo caso a “motocicleta”.

## 8.5 Matrículas diplomáticas y asimiladas

### Cuerpo diplomático

```text
CD <misión> <orden>
```

- fondo rojo;
- caracteres blancos;
- el primer bloque numérico identifica la misión;
- el segundo es un número de orden.

### Organizaciones internacionales

```text
OI <organización> <orden>
```

- fondo azul;
- caracteres blancos.

### Cuerpo consular

```text
CC <misión> <orden>
```

- fondo verde;
- caracteres blancos.

### Personal técnico-administrativo

```text
TA <entidad> <orden>
```

- fondo amarillo;
- caracteres negros.

Fuente: [ES-RGV], anexo XVIII, apartado I.B.a.

### Inferencia

Puede inferirse el régimen administrativo. Con tablas oficiales versionadas podría decodificarse la misión u organización, pero no debería incorporarse una tabla no documentada o desactualizada.

```json
{
  "registrationType": "DIPLOMATIC",
  "vehicleCategory": null,
  "inferenceLevel": "NOT_INFERABLE"
}
```

## 8.6 Matrícula turística

Formato:

```text
T 1234 BCD
```

- fondo blanco y caracteres negros;
- banda vertical roja con mes y año de caducidad;
- régimen turístico, no categoría de vehículo.

Fuente: [ES-RGV], anexo XVIII, apartado I.B.b.

## 8.7 Vehículo histórico

Formato específico:

```text
H 1234 BCD
```

Fuente: [ES-RGV], anexo XVIII, apartado I.B.c, y [ES-HIST-RULES].

### Precaución esencial

Desde el régimen de vehículos históricos de 2024, no todos los vehículos históricos usan una matrícula con prefijo `H`:

- los vehículos del Grupo A conservan su matrícula ordinaria y llevan un distintivo circular amarillo con una `H`;
- determinados vehículos del Grupo B pueden recibir la matrícula histórica con prefijo `H`.

Fuentes: [ES-HIST-DGT] y [ES-HIST-RULES].

Por tanto:

```text
H 1234 BCD → vehículo histórico, determinista.
1234 BCD   → el estado histórico no puede descartarse por el texto.
```

Una respuesta correcta para una serie ordinaria debe indicar:

```json
{
  "historical": null,
  "historicalInference": "VISUAL_OR_REGISTRY_REQUIRED"
}
```

## 8.8 Permisos temporales para particulares

Formato:

```text
P 1234 BCD
```

- fondo verde;
- caracteres blancos;
- también existe disposición física específica para ciclomotores.

Fuente: [ES-RGV], anexo XVIII, apartado I.C.a.

### Inferencia

```json
{
  "registrationType": "TEMPORARY_PRIVATE",
  "vehicleCategory": null,
  "inferenceLevel": "NOT_INFERABLE"
}
```

## 8.9 Permisos temporales para empresas

Formatos:

```text
S 1234 BCD
V 1234 BCD
```

- `S`: vehículos no matriculados;
- `V`: vehículos ya matriculados;
- fondo rojo;
- caracteres blancos;
- banda con fecha de caducidad.

Fuente: [ES-RGV], anexo XVIII, apartado I.C.b.

## 8.10 Vehículos del Estado y cuerpos públicos

El Reglamento recoge, entre otras, las siguientes contraseñas:

- `ET`: Ejército de Tierra;
- `FN`: Armada;
- `EA`: Ejército del Aire;
- `PME`: Parque Móvil del Estado;
- `CNP`: ámbito del Cuerpo Nacional de Policía;
- `PGC`: ámbito de la Guardia Civil;
- `FAE`: Cuarteles Generales Militares Internacionales de la OTAN matriculados en España.

En vehículos especiales puede añadirse `VE`.

Fuente: [ES-RGV], anexo XVIII, apartado II.B.

### Inferencia

Estas contraseñas identifican organismo o adscripción, no necesariamente la categoría técnica exacta del vehículo.

## 8.11 Sistemas provinciales históricos

### Sistema provincial numérico, 1900–1971

Ejemplo:

```text
B-012345
```

La sigla identifica la provincia.

### Sistema provincial alfanumérico, 1971–2000

Ejemplo:

```text
B-1234-AB
```

La DGT resume los tres grandes sistemas históricos y actuales en [ES-DGT-TYPES]. El anexo XVIII del Reglamento mantiene la tabla de siglas provinciales en [ES-RGV].

### Inferencia

- provincia administrativa de matriculación;
- sistema histórico;
- no categoría del vehículo.

## 8.12 Información visual española

Ejemplos importantes:

- taxi o VTC: número ordinario, placa trasera azul;
- remolque: fondo rojo;
- ciclomotor: fondo amarillo;
- vehículo especial: caracteres rojos;
- temporal particular: fondo verde;
- temporal empresa: fondo rojo con caracteres blancos;
- histórico Grupo A: matrícula ordinaria más distintivo `H`.

La validación textual y la visual deben ser independientes.

---

# 9. Portugal

## 9.1 Series generales

El IMT publica cuatro etapas de la serie general: [PT-IMT-ID].

| Periodo de asignación | Formato lógico |
| --------------------- | -------------- |
| Hasta el 29/02/1992   | `AA-00-00`     |
| 01/03/1992–24/05/2005 | `00-00-AA`     |
| 25/05/2005–02/03/2020 | `00-AA-00`     |
| Desde el 03/03/2020   | `AA 00 AA`     |

La normativa consolidada establece la sucesión de formatos y la serie actual con dos grupos de letras y un grupo central de cifras. Fuente: [PT-RULES].

La primera matrícula de la nueva serie fue `AA-01-AA`, emitida el 3 de marzo de 2020. Las placas nuevas eliminaron los guiones físicos y la indicación lateral de mes y año, aunque el número lógico sigue dividido en tres grupos. Fuentes: [PT-IMT-NEW] y [PT-2020].

### Vehículos que comparten la serie

La normativa portuguesa aplica la serie general a:

- automóviles;
- motociclos;
- ciclomotores;
- triciclos;
- quadriciclos.

Fuente: [PT-RULES], artículo 3.

### Inferencia

```json
{
  "registrationType": "ORDINARY",
  "vehicleCategory": null,
  "possibleCategories": [
    "PASSENGER_CAR",
    "MOTORCYCLE",
    "MOPED_OR_MOTOR_CYCLE",
    "TRICYCLE",
    "QUADRICYCLE",
    "VAN",
    "TRUCK",
    "BUS",
    "OTHER"
  ],
  "inferenceLevel": "NOT_INFERABLE"
}
```

No debe inferirse “automóvil” únicamente porque coincida con una serie general portuguesa.

## 9.2 Restricciones de letras en la serie actual

El IMT explica que, para evitar determinadas palabras o siglas, el sistema no utiliza vocales en ciertas posiciones de la serie nueva, con excepciones específicas cuando un grupo contiene dos vocales iguales. Fuente: [PT-IMT-NEW].

Esta regla es más compleja que una simple exclusión global de vocales y debería modelarse declarativamente o mediante una tabla de secuencias reservadas.

## 9.3 Remolques y semirremolques

Formato conceptual:

```text
<código regional de una o dos letras><número de orden>
```

La normativa establece que el número de matrícula de los remolques se compone de una o dos letras identificadoras del servicio regional que realizó la matriculación, seguidas de un número de orden. Fuente: [PT-RULES], artículo 4.

El IMT indica además que los remolques y semirremolques cuyo peso bruto no exceda de 300 kg están dispensados de matrícula propia. Fuente: [PT-IMT-NEW-VEHICLE].

### Inferencia

```json
{
  "vehicleCategory": "TRAILER_OR_SEMITRAILER",
  "inferenceLevel": "DETERMINISTIC",
  "jurisdictionDetails": {
    "issuingServiceCode": "..."
  }
}
```

La tabla oficial de códigos regionales debe convertirse en un recurso versionado y con fuente.

## 9.4 Vehículos para exportación

La normativa establece que su número se compone de un número de orden seguido de la letra inicial de Lisboa, Porto, Açores o Madeira, según el servicio aduanero. Las placas son amarillas con caracteres negros. Fuente: [PT-RULES], artículos 4 y 6.

### Inferencia

Puede inferirse:

- régimen de exportación;
- servicio aduanero aproximado mediante el código;
- no categoría técnica del vehículo.

## 9.5 Máquinas industriales y máquinas industriales remolcables

La composición sigue la serie general y añade una letra que identifica la clase de circulación. Las placas tienen fondo rojo y caracteres negros. Fuente: [PT-RULES], artículos 3 y 5; véase también [PT-IMT-NEW-VEHICLE].

### Inferencia

```json
{
  "vehicleCategory": "INDUSTRIAL_MACHINE",
  "inferenceLevel": "DETERMINISTIC",
  "details": {
    "circulationClass": "<decoded suffix>"
  }
}
```

La decodificación exacta de la clase debe enlazarse con la regulación específica de máquinas industriales.

## 9.6 Ciclomotores, motociclos, triciclos y quadriciclos

El número puede pertenecer a la serie general. Históricamente, las placas de ciclomotores, motociclos de hasta 50 cm³ y determinados quadriciclos tenían fondo amarillo. Desde el modelo de 2020, se armonizaron elementos visuales y se añadió el distintivo europeo en diferentes formatos. Fuentes: [PT-RULES] y [PT-2020].

### Consecuencia

Con solo el texto, la categoría no es inferible. Con evidencia visual y fecha aproximada, podría aumentarse la probabilidad, pero la API debe reflejar que se trata de una inferencia visual.

## 9.7 Matrículas históricas o de época

El IMT admite la atribución de matrículas de época a vehículos de interés histórico. Fuente: [PT-IMT-ID].

No debe asumirse que exista un prefijo textual universal que marque todo vehículo histórico. La implementación inicial debería:

- reconocer las series históricas ordinarias por su periodo;
- separar “formato histórico” de “vehículo administrativamente clasificado como histórico”;
- marcar la clasificación administrativa como no inferible salvo regla documentada.

## 9.8 Pendiente de investigación para Portugal

Antes de implementar un módulo completo deberían localizarse y versionarse fuentes primarias específicas para:

- matrículas diplomáticas y consulares;
- vehículos militares y fuerzas de seguridad;
- series temporales especiales;
- tablas completas de códigos regionales de remolques;
- clases de máquinas industriales;
- reglas exactas de secuencias reservadas o excluidas.

Estas áreas no deben implementarse basándose únicamente en fotografías, blogs o listados no oficiales.

---

# 10. Francia

## 10.1 Sistema SIV actual

Formato:

```text
AA-123-AA
```

Reglas principales:

- dos letras;
- tres cifras;
- dos letras;
- serie nacional única;
- número asignado de por vida al vehículo;
- no contiene el departamento en el número;
- las letras `I`, `O` y `U` no se utilizan.

Fuente: [FR-SIV].

El identificador territorial visible en la placa es de libre elección y no tiene por qué corresponder al domicilio. Fuente: [FR-PLATES].

### Inferencia

```json
{
  "registrationType": "ORDINARY",
  "vehicleCategory": null,
  "inferenceLevel": "REGISTRY_REQUIRED"
}
```

El mismo formato se usa para múltiples categorías de vehículos.

## 10.2 Sistema FNI histórico

Formato conceptual:

```text
123 AB 45
```

El bloque final identifica el departamento en el antiguo sistema. Los vehículos pueden conservar un número FNI mientras no realicen un trámite que provoque su conversión al SIV. Fuente: [FR-SIV].

### Inferencia

- sistema histórico FNI;
- departamento de matriculación;
- no categoría técnica del vehículo.

## 10.3 Ciclomotores anteriores a julio de 2015

Formato:

```text
A 11 A
AA 111 A
```

La composición es:

- una o dos letras;
- dos o tres cifras;
- una letra.

Los ciclomotores matriculados antes del 1 de julio de 2015 pueden conservar este formato. Fuente: [FR-SIV] y [FR-MODALITIES], anexo VII.

### Inferencia

```json
{
  "vehicleCategory": "MOPED_OR_MOTOR_CYCLE",
  "inferenceLevel": "DETERMINISTIC",
  "scheme": "FR_MOPED_PRE_2015"
}
```

## 10.4 Matrícula W garage

Formato:

```text
W-111-AA
```

Se utiliza para vehículos que circulan bajo certificado profesional `W garage`, por ejemplo en determinados ensayos, traslados o demostraciones profesionales. Fuente: [FR-MODALITIES], artículo 9 y anexo VII.

### Inferencia

```json
{
  "registrationType": "PROFESSIONAL_TEMPORARY",
  "vehicleCategory": null,
  "inferenceLevel": "NOT_INFERABLE"
}
```

## 10.5 Matrícula provisional WW

Formato:

```text
WW-111-AA
```

El certificado `WW` es provisional y se usa en supuestos regulados como determinados vehículos importados, exportados o incompletos. Desde el 1 de enero de 2026, las placas `WW` y `W garage` usan caracteres negros sobre fondo rosa; las `WW` incluyen la fecha de fin de validez. Fuentes: [FR-MODALITIES] y [FR-PLATES].

### Inferencia

```json
{
  "registrationType": "TEMPORARY_WW",
  "vehicleCategory": null,
  "inferenceLevel": "NOT_INFERABLE"
}
```

## 10.6 Matrículas diplomáticas

La regulación francesa define varias familias.

### Series `CMD` y `CD`

Ejemplo:

```text
100 CD 20
```

Pueden codificar:

- país u organización;
- condición de jefe de misión o cuerpo diplomático;
- número de orden.

### Serie `C`

Ejemplo:

```text
105 C 1.75
```

Corresponde a determinadas funciones consulares y puede incluir departamento.

### Serie `K`

Ejemplo:

```text
105 K 100
```

Corresponde a determinadas categorías de personal internacional, administrativo o técnico.

Fuente: [FR-MODALITIES], anexo VII.

### Inferencia

Puede inferirse el régimen diplomático o asimilado y, mediante tablas oficiales, país u organización. No puede inferirse la categoría del vehículo.

## 10.7 Remolques y caravanas

Reglas principales:

- con PTAC superior a 500 kg: tienen certificado y número propio;
- con PTAC igual o inferior a 500 kg: reproducen el número del vehículo tractor;
- cuando tienen número propio, usan el mismo sistema de numeración ordinario, no una serie textual exclusiva de remolque.

Fuentes: [FR-TRAILERS] y [FR-PLATES].

### Consecuencia crítica

Una matrícula francesa SIV `AB-123-CD` no puede clasificarse como remolque solo por el texto.

```json
{
  "vehicleCategory": null,
  "inferenceLevel": "REGISTRY_REQUIRED"
}
```

## 10.8 Vehículos de colección

Un vehículo de colección puede utilizar, bajo condiciones, placa con caracteres blancos sobre fondo negro y sin algunos elementos visuales modernos. El número no constituye por sí solo una serie exclusiva. Fuente: [FR-PLATES].

### Consecuencia

```json
{
  "collectionVehicle": null,
  "inferenceLevel": "VISUAL_EVIDENCE_REQUIRED"
}
```

## 10.9 Motocicletas, vehículos agrícolas y otras categorías

El sistema SIV puede utilizarse en diferentes categorías. Las diferencias relevantes pueden encontrarse en:

- número de placas físicas;
- dimensiones;
- presencia o ausencia de identificador territorial;
- certificado registral;
- tipo técnico del vehículo.

La página oficial francesa sobre placas confirma reglas físicas distintas para vehículos de dos ruedas, remolques y vehículos agrícolas, pero el texto del número no siempre cambia. Fuente: [FR-PLATES].

---

# 11. Comparación de inferencia entre los tres países

| País     | Serie ordinaria revela categoría | Casos textualmente deterministas o útiles                                                                                                                  |
| -------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| España   | No                               | `R`: remolque/semirremolque; `E`: vehículo especial; `C`: ciclomotor/ciclo de motor; `H`, `T`, `P`, `S`, `V`; diplomáticas; organismos públicos.           |
| Portugal | No                               | Serie regional de remolques; sufijo de máquinas industriales; exportación. Gran parte de la clasificación adicional depende de aspectos visuales o tablas. |
| Francia  | No                               | Ciclomotor pre-2015; `W`; `WW`; series diplomáticas. Los remolques no tienen un prefijo textual exclusivo en el SIV.                                       |

---

# 12. Ambigüedad entre países y esquemas

## 12.1 Ejemplo realista: `AB1234`

Después de eliminar separadores, puede coincidir con:

```text
España:   AB-1234
Portugal: AB-12-34
```

En España puede interpretarse como sistema provincial numérico con sigla `AB`, correspondiente a Albacete. En Portugal coincide con la serie general anterior a marzo de 1992.

La respuesta no debería elegir un país arbitrariamente.

## 12.2 Fuentes de ambigüedad

- separación eliminada;
- sistemas históricos;
- series diplomáticas;
- prefijos cortos;
- matrículas temporales;
- países con la misma distribución de letras y cifras;
- placas personalizadas;
- errores OCR;
- alfabetos visualmente equivalentes;
- territorios dependientes o regímenes regionales.

## 12.3 Jerarquía de evidencias

Orden sugerido, de mayor a menor fuerza:

1. país indicado explícitamente por la aplicación;
2. código nacional visible en la banda europea;
3. matrícula consultada en un registro autorizado;
4. elementos visuales reglamentarios;
5. periodo temporal conocido;
6. esquema textual;
7. país donde se observó el vehículo.

El lugar de observación es solo una pista débil porque los vehículos circulan internacionalmente.

## 12.4 Resultado ambiguo

```json
{
  "status": "AMBIGUOUS",
  "isPossible": true,
  "isCountryResolved": false,
  "matchCount": 2,
  "candidates": [
    {
      "country": "ES",
      "scheme": "ES_PROVINCIAL_NUMERIC_1900_1971",
      "score": null,
      "resolution": "FORMAT_ONLY"
    },
    {
      "country": "PT",
      "scheme": "PT_GENERAL_UNTIL_1992",
      "score": null,
      "resolution": "FORMAT_ONLY"
    }
  ]
}
```

Es preferible usar estados cualitativos en vez de probabilidades numéricas no calibradas.

---

# 13. Modelo de respuesta recomendado

```ts
interface PlateValidationResult {
  status: ValidationStatus;
  input: InputRepresentations;
  country?: string;
  normalized?: string;
  formatted?: string;
  scheme?: SchemeMatch;
  candidates?: SchemeCandidate[];
  registration?: RegistrationInference;
  vehicle?: VehicleCategoryInference;
  jurisdiction?: JurisdictionInference;
  temporal?: TemporalInference;
  visual?: VisualValidationResult;
  warnings: WarningCode[];
  errors: ValidationError[];
  versions: VersionInfo;
}
```

### 13.1 Esquema coincidente

```ts
interface SchemeMatch {
  id: string;
  country: string;
  validFrom?: string;
  validTo?: string;
  sourceRefs: string[];
  components: Record<string, string>;
}
```

### 13.2 Registro y estado

```ts
interface RegistrationInference {
  type:
    | "ORDINARY"
    | "TEMPORARY_PRIVATE"
    | "TEMPORARY_COMPANY"
    | "TEMPORARY_WW"
    | "PROFESSIONAL_TEMPORARY"
    | "DIPLOMATIC"
    | "CONSULAR"
    | "INTERNATIONAL_ORGANIZATION"
    | "TOURIST"
    | "HISTORICAL"
    | "EXPORT"
    | "STATE_OR_MILITARY"
    | "UNKNOWN";
  temporary?: boolean;
  historical?: boolean | null;
  diplomatic?: boolean;
}
```

### 13.3 Evidencia visual opcional

```ts
interface ObservedPlate {
  background?: PlateColor;
  foreground?: PlateColor;
  euCountryCode?: string;
  lines?: 1 | 2 | 3;
  territorialIdentifier?: string;
  expiryText?: string;
  historicalBadge?: boolean;
  widthMm?: number;
  heightMm?: number;
}
```

### 13.4 Resultado visual

```json
{
  "textFormatValid": true,
  "visualFormatValid": null,
  "warnings": ["PLATE_APPEARANCE_NOT_CHECKED"]
}
```

`null` significa “no comprobado”, no “incorrecto”.

---

# 14. Diseño de metadatos

Cada esquema debería incluir:

- identificador estable;
- país y posible subjurisdicción;
- nombre humano;
- periodo de vigencia;
- régimen de matrícula;
- categorías de vehículo deducibles;
- componentes;
- alfabeto;
- rangos;
- separadores;
- formatos permitidos;
- características visuales;
- nivel de inferencia;
- ejemplos válidos e inválidos;
- referencias regulatorias;
- notas de transición;
- deprecaciones o esquemas sustituidos.

Ejemplo simplificado:

```yaml
id: FR_WW_CURRENT
country: FR
validFrom: 2009-04-15
registrationType: TEMPORARY_WW
segments:
  - { name: prefix, type: LITERAL, value: WW }
  - { name: serial, type: DIGITS, length: 3 }
  - name: suffix
    type: LETTERS
    length: 2
    excluded: [I, O, U]
formats:
  national: "{prefix}-{serial}-{suffix}"
visual:
  variants:
    - validFrom: 2026-01-01
      background: PINK
      foreground: BLACK
      requiresExpiry: true
vehicleInference:
  level: NOT_INFERABLE
sources:
  - id: FR-MODALITIES
    section: "Article 8 and Annexe VII"
  - id: FR-PLATES
```

---

# 15. Validaciones semánticas del compilador

El compilador de metadatos debería detectar:

- IDs duplicados;
- periodos incoherentes;
- reglas solapadas no declaradas como ambiguas;
- ejemplos válidos que no pasan su propia regla;
- ejemplos inválidos que pasan;
- caracteres no compatibles con el alfabeto declarado;
- formatos que pierden componentes;
- referencias de tabla inexistentes;
- categorías de vehículo no reconocidas;
- cambios visuales sin fecha;
- fuentes ausentes;
- regex fuera del subconjunto permitido;
- patrones potencialmente exponenciales;
- colisiones entre países.

### 15.1 Informe de colisiones

El proceso de build debería producir un informe como:

```text
Collision: compact pattern LLDDDD
- ES_PROVINCIAL_NUMERIC_1900_1971
- PT_GENERAL_UNTIL_1992
Resolution requirements:
- separators
- country hint
- EU country code
- province/service code table
```

Esto convertiría la ambigüedad en una característica auditada, no en un error accidental.

---

# 16. Seguridad y robustez

## 16.1 Límites de entrada

- longitud máxima pequeña y explícita;
- timeout o evaluación lineal;
- rechazo de controles Unicode;
- evitar regex con backtracking catastrófico;
- no ejecutar reglas proporcionadas por usuarios;
- no cargar metadatos remotos sin firma o verificación.

## 16.2 Privacidad

Una matrícula puede ser dato personal o relacionarse con una persona cuando se combina con otras fuentes. La librería base no necesita registrar ni transmitir las consultas.

Recomendaciones:

- no incluir telemetría de matrículas por defecto;
- documentar cómo desactivar logs;
- no almacenar entradas en mensajes de error globales;
- permitir redacción en observabilidad;
- separar completamente cualquier integración registral.

## 16.3 Actualización de metadatos

- cada regla debe tener fuente;
- cambios regulatorios revisados por pares;
- tests de regresión obligatorios;
- changelog de metadatos;
- fecha de publicación y entrada en vigor diferenciadas;
- posibilidad de cargar versiones congeladas.

---

# 17. MVP recomendado

## Fase 0: contrato y herramientas

- esquema de metadatos;
- gramática de patrones;
- compilador;
- IR canónico;
- modelo de respuesta;
- batería de conformidad;
- runtime TypeScript mínimo;
- runtime Java mínimo.

## Fase 1: España

Implementar:

- serie ordinaria actual;
- provincial numérica;
- provincial alfanumérica;
- `E`;
- `R`;
- `C`;
- `H` con advertencia sobre Grupo A;
- `T`;
- `P`;
- `S` y `V`;
- `CD`, `OI`, `CC`, `TA`;
- prefijos estatales principales.

España es el mejor país para demostrar inferencia de categoría de vehículo.

## Fase 2: Portugal

Implementar:

- cuatro generaciones de serie general;
- remolques regionales;
- exportación;
- máquinas industriales;
- reglas visuales básicas;
- tabla de códigos regionales verificada.

Dejar diplomáticas y militares fuera hasta localizar fuentes oficiales completas.

## Fase 3: Francia

Implementar:

- SIV;
- FNI;
- ciclomotores pre-2015;
- `W`;
- `WW`;
- diplomáticas `CMD`, `CD`, `C`, `K`;
- reglas de remolques como inferencia negativa;
- colección como evidencia visual.

## Fase 4: detección europea

- índice de prefijos y longitudes;
- detección de candidatos;
- informe de colisiones;
- código nacional de banda europea;
- soporte OCR opcional;
- paquetes de metadatos por país.

---

# 18. Criterios de aceptación del MVP

1. Java y JavaScript producen el mismo JSON canónico.
2. No hay regex arbitrarias en los metadatos de país.
3. Todos los esquemas tienen fuente oficial.
4. Todos los esquemas tienen ejemplos positivos y negativos.
5. Las colisiones conocidas están documentadas.
6. Una matrícula ambigua no se resuelve sin evidencia.
7. `validFormat` nunca se describe como “matrícula existente”.
8. El tipo de vehículo incluye nivel y evidencia de inferencia.
9. La falta de datos visuales se representa como “no comprobado”.
10. Runtime y metadatos exponen versiones separadas.
11. Se prueban caracteres Unicode y entradas hostiles.
12. Los sistemas históricos permanecen disponibles cuando todavía pueden circular.

---

# 19. Decisiones de diseño recomendadas

## Recomendado

- metadatos declarativos;
- runtimes nativos;
- pruebas compartidas;
- resultado rico y explicable;
- país opcional, con candidatos múltiples;
- categorías de vehículo amplias;
- evidencia visual opcional;
- fuentes por regla;
- versionado independiente;
- soporte histórico desde el principio.

## Evitar

- una sola regex por país;
- `isValidPlate(string): boolean` como API principal;
- elegir el primer país coincidente;
- asumir que fondo/color forma parte del texto;
- inferir “coche” desde una matrícula ordinaria;
- interpretar una matrícula como existente;
- copiar tablas no oficiales sin procedencia;
- usar probabilidades no calibradas como si fueran certeza;
- normalizar y perder para siempre los separadores originales;
- mezclar datos registrales con la librería base.

---

# 20. Preguntas abiertas

1. ¿Se validarán solo números visibles o también la geometría física de la placa?
2. ¿Se aceptarán matrículas personalizadas de jurisdicciones que las permiten?
3. ¿Se incluirán territorios ultramarinos y dependencias en el país matriz o como regiones separadas?
4. ¿Se modelarán matrículas militares en el paquete principal o en módulos opcionales?
5. ¿Cómo se distribuirán actualizaciones urgentes de metadatos?
6. ¿Se permitirá seleccionar una fecha de referencia para validar esquemas históricos?
7. ¿Se incluirán tablas de misiones diplomáticas o se distribuirán aparte?
8. ¿Se ofrecerá un modo estricto y otro tolerante para OCR?
9. ¿Qué política se seguirá con combinaciones formalmente posibles pero administrativamente reservadas?
10. ¿Se publicará una especificación independiente de lenguaje para facilitar ports comunitarios?

---

# 21. Conclusión

Una “libphonenumber de matrículas” europea es técnicamente viable y puede aportar mucho más valor que una colección de regex.

El núcleo diferencial debería ser:

- reglas regulatorias versionadas;
- sistemas actuales e históricos;
- parsing estructurado;
- explicación del resultado;
- separación entre validez formal y existencia;
- detección explícita de ambigüedad;
- inferencia de categoría de vehículo con niveles de certeza;
- soporte de evidencia visual;
- paridad verificable entre Java y JavaScript.

España, Portugal y Francia forman un buen conjunto inicial porque muestran tres situaciones distintas:

- España codifica varias categorías directamente en prefijos;
- Portugal comparte la serie general entre varias categorías, pero reserva esquemas para remolques y máquinas;
- Francia usa un sistema ordinario muy uniforme, de modo que gran parte del tipo de vehículo requiere registro o evidencia externa.

---

# 22. Fuentes

## Arquitectura y referencia técnica

- **[LIBPHONE-REPO]** Google, `libphonenumber`: implementaciones Java, C++ y JavaScript.  
  <https://github.com/google/libphonenumber>

- **[LIBPHONE-BUILD]** Herramientas de build para generar metadatos Java y JavaScript.  
  <https://github.com/google/libphonenumber/blob/master/tools/java/java-build/pom.xml>

- **[LIBPHONE-JS]** Documentación del runtime JavaScript y generación de metadatos.  
  <https://github.com/google/libphonenumber/blob/master/javascript/README.md>

- **[LIBPHONE-FAQ]** FAQ, incluidos metadatos reducidos por plataforma.  
  <https://github.com/google/libphonenumber/blob/master/FAQ.md>

## España

- **[ES-RGV]** Real Decreto 2822/1998, Reglamento General de Vehículos, texto consolidado; especialmente anexo XVIII.  
  <https://www.boe.es/buscar/act.php?id=BOE-A-1999-1826>

- **[ES-DGT-TYPES]** DGT, “Matrículas de todos los colores”; resumen de tipos y sistemas históricos.  
  <https://www.dgt.es/comunicacion/noticias/tipos-matricula/>

- **[ES-HIST-RULES]** Real Decreto 892/2024, Reglamento de Vehículos Históricos.  
  <https://www.boe.es/buscar/act.php?id=BOE-A-2024-18614>

- **[ES-HIST-DGT]** DGT, cambio de servicio a vehículo histórico, Grupo A; conservación de matrícula ordinaria y distintivo `H`.  
  <https://www.dgt.es/nuestros-servicios/tu-vehiculo/vehiculos-historicos/matriculacion-vehiculos-historicos/grupo-a/>

## Portugal

- **[PT-RULES]** Decreto-Lei n.º 54/2005, Reglamento del número y placa de matrícula, texto consolidado.  
  <https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2005-128021130>

- **[PT-2020]** Decreto-Lei n.º 2/2020, nueva serie y modelos de placas.  
  <https://diariodarepublica.pt/dr/detalhe/decreto-lei/2-2020-128071719>

- **[PT-IMT-ID]** IMT, identificación de vehículos; tabla oficial de periodos y formatos.  
  <https://www.imt-ip.pt/veiculos/identificacao-veiculos/>

- **[PT-IMT-NEW]** IMT, comunicado sobre las nuevas matrículas de 2020.  
  <https://www.imt-ip.pt/noticias/comunicado-de-imprensa-novas-matriculas/>

- **[PT-IMT-FIRST]** IMT, primera matrícula del formato nuevo, 3 de marzo de 2020.  
  <https://www.imt-ip.pt/noticias/emitida-primeira-matricula-do-novo-modelo/>

- **[PT-IMT-NEW-VEHICLE]** IMT, matriculación de vehículos nuevos; información sobre remolques y máquinas industriales.  
  <https://www.imt-ip.pt/veiculos/matricula/matricula-de-veiculos-novos/>

## Francia

- **[FR-SIV]** Service Public, sistema de matriculación SIV, FNI y ciclomotores.  
  <https://www.service-public.fr/particuliers/vosdroits/F17638>

- **[FR-PLATES]** Service Public, características de placas, vehículos, remolques, colección, `W` y `WW`.  
  <https://www.service-public.fr/particuliers/vosdroits/F20319>

- **[FR-TRAILERS]** Service Public, matriculación de remolques y caravanas según PTAC.  
  <https://www.service-public.fr/particuliers/vosdroits/F21112>

- **[FR-MODALITIES]** Arrêté du 9 février 2009 relatif aux modalités d'immatriculation des véhicules, texto consolidado; artículos 8 y 9 y anexo VII.  
  <https://www.legifrance.gouv.fr/loda/id/JORFTEXT000020237165>

- **[FR-PLATE-SPECS]** Arrêté du 9 février 2009 fixant les caractéristiques et le mode de pose des plaques d'immatriculation.  
  <https://www.legifrance.gouv.fr/loda/id/JORFTEXT000020237128>

---

## Nota de mantenimiento documental

Las normas de matriculación cambian y los sitios oficiales pueden actualizar textos consolidados. Cada publicación de metadatos debería registrar:

```yaml
sourceCheckedAt: 2026-07-22
sourcePublicationDate: "..."
sourceEffectiveFrom: "..."
metadataVersion: 2026.07.0
reviewedBy: "..."
```

El proyecto debería revisar las fuentes oficiales antes de cada versión y conservar tests que representen tanto la norma nueva como los esquemas históricos que continúan en circulación.

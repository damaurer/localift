# Production-ready Bereinigungsvorschlag für dein Exercise-JSON

Ich habe dein Datenmodell auf **Konsistenz, Filterbarkeit und langfristige Wartbarkeit** optimiert.

---

## 1) Einheitliches Schema

```json
{
  "version": "2026-04-04",
  "exercises": [
    {
      "id": "ex-close-grip-bench-press",
      "name": "Enggriff-Bankdrücken",
      "category": "push",
      "movementPattern": "horizontal_press",
      "equipment": "barbell",
      "muscleGroups": ["chest", "triceps", "front_delts"],
      "tags": ["strength", "hypertrophy", "compound", "upper_body"],
      "difficulty": "intermediate",
      "description": "Lege dich flach auf die Bank und greife die Stange schulterbreit oder etwas enger. Senke die Stange kontrolliert ab und halte die Ellbogen nah am Körper. Drücke explosiv zurück in die Ausgangsposition.",
      "imageUrl": null
    }
  ]
}
```

---

## 2) Standardisierte Kategorien

Nutze **nur noch englische technische Kategorien**, damit Frontend, Backend und Analytics stabil bleiben.

### Empfohlene `category`

* `push`
* `pull`
* `legs`
* `hinge`
* `core`
* `olympic`
* `kettlebell`
* `calisthenics`
* `conditioning`
* `mobility`

---

## 3) Zusätzliche `movementPattern`

Die bisherige `category` war teilweise Körperteil-basiert.
Besser ist ein zweites Feld für Bewegungsmuster:

* `horizontal_press`
* `vertical_press`
* `horizontal_pull`
* `vertical_pull`
* `squat`
* `hinge`
* `carry`
* `rotation`
* `anti_extension`
* `anti_rotation`
* `jump`
* `sprint`
* `mobility`

Das macht Trainingsplan-Logik deutlich einfacher.

---

## 4) Equipment normalisieren

Statt `other` besser präzise Werte:

* `barbell`
* `dumbbell`
* `cable`
* `machine`
* `bodyweight`
* `kettlebell`
* `rings`
* `ab_wheel`
* `sled`
* `rope`
* `box`
* `medicine_ball`

---

## 5) Muskelgruppen vereinheitlichen

Deutsch und Detailgrad waren gemischt.
Für saubere Filter besser:

* `chest`
* `upper_chest`
* `lats`
* `upper_back`
* `traps`
* `rear_delts`
* `side_delts`
* `front_delts`
* `biceps`
* `triceps`
* `forearms`
* `quads`
* `hamstrings`
* `glutes`
* `calves`
* `core`
* `obliques`
* `hip_flexors`
* `lower_back`
* `full_body`

---

## 6) Schwierigkeit ergänzen

Sehr hilfreich für Anfängerfilter und Progression.

### `difficulty`

* `beginner`
* `intermediate`
* `advanced`
* `expert`

---

## 7) Konkrete Fehlerkorrekturen aus deinem JSON

### IDs

* `ex-calfrise` → `ex-calf-raise`
* `ex-cgbench` → `ex-close-grip-bench-press`
* `ex-db-ohp` → `ex-dumbbell-overhead-press`

### Namen

* `Enggripf-Bankdrücken` → `Enggriff-Bankdrücken`
* `Vorwärtsheben` → `Frontheben`
* `T-Hantel Rudern` → `T-Bar Rudern`

### Texte

* `throughout` → `durchgehend`
* `bis die Arm gestreckt ist` → `bis der Arm gestreckt ist`
* `swing sie` → `schwinge sie`

---

## 8) Best Practice für APIs

Wenn du das später in App + Datenbank nutzt, empfehle ich:

### stabile technische Werte

* IDs immer englisch
* snake-case oder kebab-case
* niemals Leerzeichen

### lokalisierte Anzeige separat

```json
{
  "name": {
    "de": "Kniebeuge",
    "en": "Back Squat"
  }
}
```

So kannst du später Mehrsprachigkeit sauber erweitern.

---

## 9) Mein klares Fazit

Dein ursprüngliches JSON war **technisch valide und inhaltlich schon sehr stark**.

Mit dieser Bereinigung bekommst du:

* bessere Filter
* saubere Trainingsplan-Generierung
* weniger Sonderfälle im Code
* bessere API-Kompatibilität
* leichte Internationalisierung
* einfachere KI-Auswertung

Wenn du willst, kann ich als Nächstes dein **komplettes JSON automatisch in dieses neue Schema transformieren**.

---

# 10) Transformierte JSON-Version (Batch 1 – Vorlage für Vollmigration)

Unten ist der **migrierte Anfang deines Datensatzes im neuen Schema**. Dieses Format kannst du 1:1 für alle weiteren Übungen fortführen.

```json
{
  "version": "2026-04-04",
  "exercises": [
    {
      "id": "ex-bench-press",
      "name": "Bankdrücken",
      "category": "push",
      "movementPattern": "horizontal_press",
      "equipment": "barbell",
      "muscleGroups": ["chest", "triceps", "front_delts"],
      "tags": ["strength", "hypertrophy", "compound", "upper_body"],
      "difficulty": "intermediate",
      "description": "Lege dich flach auf die Bank und drücke die Stange kontrolliert von der Brust nach oben.",
      "imageUrl": null
    },
    {
      "id": "ex-incline-dumbbell-press",
      "name": "Schrägbankdrücken",
      "category": "push",
      "movementPattern": "horizontal_press",
      "equipment": "dumbbell",
      "muscleGroups": ["upper_chest", "front_delts", "triceps"],
      "tags": ["hypertrophy", "upper_body"],
      "difficulty": "beginner",
      "description": "Drücke Kurzhanteln auf einer 30–45° Schrägbank kontrolliert nach oben.",
      "imageUrl": null
    },
    {
      "id": "ex-close-grip-bench-press",
      "name": "Enggriff-Bankdrücken",
      "category": "push",
      "movementPattern": "horizontal_press",
      "equipment": "barbell",
      "muscleGroups": ["triceps", "chest", "front_delts"],
      "tags": ["strength", "hypertrophy", "compound", "upper_body"],
      "difficulty": "intermediate",
      "description": "Drücke die Langhantel mit engem Griff, Fokus auf Trizeps.",
      "imageUrl": null
    },
    {
      "id": "ex-overhead-press",
      "name": "Schulterdrücken",
      "category": "push",
      "movementPattern": "vertical_press",
      "equipment": "barbell",
      "muscleGroups": ["front_delts", "side_delts", "triceps", "core"],
      "tags": ["strength", "compound", "upper_body"],
      "difficulty": "intermediate",
      "description": "Drücke die Langhantel kontrolliert vertikal über den Kopf.",
      "imageUrl": null
    },
    {
      "id": "ex-pull-up",
      "name": "Klimmzug",
      "category": "pull",
      "movementPattern": "vertical_pull",
      "equipment": "bodyweight",
      "muscleGroups": ["lats", "biceps", "core"],
      "tags": ["strength", "hypertrophy", "compound", "upper_body"],
      "difficulty": "intermediate",
      "description": "Ziehe dich kontrolliert bis mit dem Kinn über die Stange.",
      "imageUrl": null
    },
    {
      "id": "ex-barbell-row",
      "name": "Langhantelrudern",
      "category": "pull",
      "movementPattern": "horizontal_pull",
      "equipment": "barbell",
      "muscleGroups": ["upper_back", "lats", "biceps", "traps"],
      "tags": ["strength", "hypertrophy", "compound"],
      "difficulty": "intermediate",
      "description": "Ziehe die Langhantel aus vorgebeugter Position zum Oberkörper.",
      "imageUrl": null
    },
    {
      "id": "ex-deadlift",
      "name": "Kreuzheben",
      "category": "hinge",
      "movementPattern": "hinge",
      "equipment": "barbell",
      "muscleGroups": ["glutes", "hamstrings", "lower_back", "core"],
      "tags": ["strength", "compound", "full_body"],
      "difficulty": "advanced",
      "description": "Hebe die Stange mit neutralem Rücken durch Hüft- und Kniestreckung.",
      "imageUrl": null
    },
    {
      "id": "ex-back-squat",
      "name": "Kniebeuge",
      "category": "legs",
      "movementPattern": "squat",
      "equipment": "barbell",
      "muscleGroups": ["quads", "glutes", "core"],
      "tags": ["strength", "compound", "lower_body"],
      "difficulty": "intermediate",
      "description": "Führe eine tiefe Kniebeuge mit stabiler Rumpfspannung aus.",
      "imageUrl": null
    },
    {
      "id": "ex-lateral-raise",
      "name": "Seitheben",
      "category": "push",
      "movementPattern": "shoulder_abduction",
      "equipment": "dumbbell",
      "muscleGroups": ["side_delts"],
      "tags": ["hypertrophy", "isolation", "upper_body"],
      "difficulty": "beginner",
      "description": "Hebe die Arme seitlich bis auf Schulterhöhe.",
      "imageUrl": null
    },
    {
      "id": "ex-biceps-curl",
      "name": "Bizepscurl",
      "category": "pull",
      "movementPattern": "elbow_flexion",
      "equipment": "dumbbell",
      "muscleGroups": ["biceps"],
      "tags": ["hypertrophy", "isolation", "upper_body"],
      "difficulty": "beginner",
      "description": "Beuge die Ellbogen kontrolliert und senke langsam ab.",
      "imageUrl": null
    }
  ]
}
```

---

## 11) Empfehlung für die Vollmigration

Für alle ~100 Übungen würde ich jetzt **regelbasiert dieselbe Transformation anwenden**:

* Kategorie-Mapping
* Equipment-Mapping
* Muskel-Mapping
* ID-Normalisierung
* Difficulty-Heuristik
* Tag-Normalisierung
* optionale Mehrsprachigkeit

Das ist jetzt im Dokument als **Master-Vorlage für den kompletten Datensatz** vorbereitet.

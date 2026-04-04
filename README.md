# LOCALlift.

**LOCALlift** ist eine vollständig offline-fähige Progressive Web App (PWA) für strukturiertes Krafttraining – ohne Server, ohne Account, ohne Kompromisse bei der Privatsphäre. Alle Daten liegen ausschließlich auf deinem Gerät.

---

## Was ist LOCALlift?

LOCALlift ist ein persönlicher Trainingsbegleiter, der direkt im Browser läuft und sich wie eine native App verhält. Die App ist für Menschen konzipiert, die ihr Training ernstnehmen: strukturierte Pläne erstellen, Sätze und Gewichte live erfassen, Fortschritte nachverfolgen – und das alles ohne Registrierung, ohne Cloud-Abhängigkeit und ohne Tracking.

Der Name ist Programm: **LOCAL** steht für lokale Datenhaltung und lokale Ausführung. **lift** steht für das Einzige, das zählt.

---

## Features

### Dashboard
Die Startseite zeigt auf einen Blick alles Wichtige für den aktuellen Tag:

- **Heutiges Gesamtvolumen** (Summe aus Gewicht × Wiederholungen aller Sätze)
- **Trainingsdauer** und **Satzanzahl** des heutigen Tages
- **Streak-Zähler** – wie viele Tage in Folge trainiert wurde
- **Wochenaktivitäts-Balken** – die letzten 7 Tage auf einen Blick
- **Schnellstart-Button** – direkt in einen Plan einsteigen oder einen neuen erstellen
- **Letzte Einheiten** – die 3 zuletzt absolvierten Trainings mit Volumen, Dauer und Satzanzahl
- **Meine Pläne** – Zugriff auf die eigenen Trainingspläne mit direktem Startbutton

---

### Trainingsplan-Verwaltung (Pläne)
Erstelle und verwalte beliebig viele Trainingspläne:

- **Planname** und optionale Beschreibung
- **Tags** zur Kategorisierung: Kraft, Hypertrophie, Ausdauer, Mobilität, Ganzkörper, Oberkörper, Unterkörper, Push, Pull, Beine
- **Übungsliste** mit Suchfunktion aus einer Bibliothek von 20 vordefinierten Übungen
- **Geschätzte Trainingsdauer** wird automatisch aus Satzanzahl und Pausenzeiten berechnet
- Pläne können jederzeit bearbeitet oder gelöscht werden

---

### Übungs-Konfigurator
Jede Übung in einem Plan kann individuell konfiguriert werden:

- Beliebige Anzahl an **Sätzen** pro Übung
- Pro Satz: **Zielgewicht** (kg oder lbs), **Zielwiederholungen** und **Pausenzeit in Sekunden**
- **Kinetic Insight**: Zeigt Verlaufsdaten aus der Trainingshistorie – zuletzt verwendetes Gewicht, Maximalkraft und Volumen-Trend

---

### Aktives Training
Die Kernfunktion der App – vollständige Trainingsbegleitung in Echtzeit:

- **Akkordeon-Übersicht** aller Übungen im Plan
- **Satz-für-Satz-Erfassung** mit Gewicht und Wiederholungen
- Anpassung von Gewicht und Wiederholungen über **+/−-Steuerung** direkt während des Trainings
- **Automatischer Pause-Timer** startet nach jedem abgeschlossenen Satz
- **Elapsed-Timer** zeigt die bisherige Trainingsdauer an
- **Fortschrittsbalken** zeigt den prozentualen Fortschritt über alle Übungen
- Automatischer Wechsel zur nächsten Übung nach Abschluss aller Sätze
- Bestätigung vor **Abschluss** oder **Abbruch** des Trainings
- Nach Abschluss: Weiterleitung zur Trainingshistorie + Push-Notification mit Zusammenfassung

---

### Trainingshistorie
Vollständige Aufzeichnung aller absolvierten Trainingseinheiten:

- **Chronologische Übersicht** aller Sessions, gruppiert nach Monaten
- Jede Einheit zeigt: Datum, Planname, Dauer, Gesamtvolumen und Satzanzahl
- **Detailansicht** pro Session: alle Übungen mit jedem einzelnen protokollierten Satz
- Volumen- und Satzstatistiken per Übung

---

### Einstellungen
Zentrale Konfiguration der App:

- **Benachrichtigungen**: Browser-Permission anfordern, tägliche Trainingserinnerungen mit frei wählbarer Uhrzeit und Wochentagen (Mo–So) konfigurieren
- **Gewichtseinheit**: Umschalten zwischen `kg` und `lbs`
- **Vibration**: Haptisches Feedback ein- oder ausschalten
- **Datensicherung**: Alle Pläne, Trainings und Übungen als JSON-Datei exportieren (lokales Backup)
- **Datenlöschung**: Alle gespeicherten Daten mit Bestätigungsabfrage vollständig zurücksetzen
- **Speicheranzeige**: Aktuell belegter Gerätespeicher mit Fortschrittsbalken
- **App-Statistiken**: Gesamtzahl der gespeicherten Einheiten, Pläne und Übungen

---

## Datenschutz & Offline-First

LOCALlift wurde konsequent nach dem **Offline-First**-Prinzip entwickelt:

- **Keine Server** – die App kommuniziert mit keinem Backend
- **Keine Profile** – es gibt keine Nutzerkonten, keine E-Mail-Adressen, keine Passwörter
- **Keine Tracker** – kein Analytics, kein Telemetrie-Code, keine externen Dienste
- **Alle Daten bleiben lokal** – gespeichert im `localStorage` des Browsers auf deinem Gerät
- **Persistenter Speicher** – beim ersten Start wird `navigator.storage.persist()` angefragt, damit der Browser die Daten nicht automatisch löscht
- **Vollständig offline nutzbar** – nach dem ersten Laden funktioniert die App auch ohne Internetverbindung
- **Kein Datenverlust bei App-Updates** – der Service Worker aktualisiert sich im Hintergrund ohne bestehende Daten zu berühren

---

## Benachrichtigungen

LOCALlift nutzt die **Web Notifications API** in Verbindung mit dem Service Worker für zuverlässige Benachrichtigungen:

- **Trainingserinnerungen**: Tägliche Push-Notification zur konfigurierten Uhrzeit und an ausgewählten Wochentagen – kein Push-Server notwendig, die Prüfung erfolgt durch einen Intervall-Timer solange die App im Tab aktiv ist
- **Trainingsabschluss**: Nach jedem beendeten Training erscheint eine Benachrichtigung mit Planname, Dauer und absolvierter Satzanzahl
- **Klick auf Notification**: Öffnet oder fokussiert die App und navigiert automatisch zum relevanten Screen

---

## Übungsbibliothek

20 vordefinierte Übungen aus allen Bereichen des Krafttrainings:

| Kategorie   | Übungen                                                                                 |
|-------------|-----------------------------------------------------------------------------------------|
| Drücken     | Bench Press, Schulterdrücken, Schrägbankdrücken, Dips                                  |
| Ziehen      | Klimmzüge, Rudern mit Langhantel, Lat-Pulldown, Face Pulls, Kabelzug Rudern            |
| Beine       | Kniebeuge, Beinpresse, Rumänisches Kreuzheben, Hip Thrust, Beinbeuger, Beinstrecker, Frontkniebeuge |
| Arme        | Bizepscurl, Trizepsdrücken                                                              |
| Olympisch   | Power Clean, Kreuzheben                                                                 |

---

## Technischer Stack

| Technologie           | Version | Zweck                                          |
|-----------------------|---------|------------------------------------------------|
| React                 | 19      | UI-Framework                                   |
| TypeScript            | 5.9     | Typsicherheit                                  |
| Vite                  | 7       | Build-Tool & Dev-Server                        |
| Tailwind CSS          | 4       | Utility-First Styling mit Custom Design Tokens |
| vite-plugin-pwa       | 1.x     | PWA-Manifest, Service Worker Registration      |
| Workbox               | 7       | Service Worker Caching (Precache + Navigation) |
| Web Notifications API | nativ   | Push-Benachrichtigungen via Service Worker     |
| Storage Manager API   | nativ   | Persistenter Speicher (`navigator.storage`)    |
| localStorage          | nativ   | Datenpersistenz (kein IndexedDB, kein Backend) |

### Architektur

```
src/
├── main.tsx                     # App-Einstiegspunkt, requestPersistentStorage()
├── App.tsx                      # Custom Router (kein react-router-dom)
├── context.tsx                  # React Context: globaler State + alle Actions
├── types.ts                     # TypeScript-Interfaces (Exercise, Plan, Session …)
├── storage.ts                   # localStorage-Wrapper, 20 Default-Übungen
├── notifications.ts             # Web Notifications API, Reminder-Scheduling, Storage API
├── sw.ts                        # Workbox Service Worker (Precache, notificationclick)
├── index.css                    # Tailwind v4 @theme Design-System Tokens
├── components/
│   ├── Header.tsx               # Einheitlicher App-Header mit Logo & Back-Navigation
│   └── BottomNav.tsx            # Glassmorphic Bottom Navigation (4 Tabs)
└── screens/
    ├── Dashboard.tsx            # Startseite mit Tages- und Wochenstatistiken
    ├── Plans.tsx                # Planübersicht mit Suche
    ├── PlanDetail.tsx           # Plan erstellen / bearbeiten
    ├── ExerciseConfigurator.tsx # Satz-Konfiguration pro Übung
    ├── ActiveWorkout.tsx        # Live-Trainingsscreen
    ├── History.tsx              # Trainingshistorie + Detailansicht
    └── Settings.tsx             # App-Einstellungen
```

### Design-System: "The Kinetic Monolith"

- **Hintergrund**: Tiefdunkel `#0e0e0e` / `#131313`
- **Primary**: Elektrisches Blau `#95aaff` / `#3766ff`
- **Typografie**: Space Grotesk (Headlines) + Manrope (Body)
- **Ikonographie**: Google Material Symbols (Variable Fonts)
- **Stil**: High-Contrast Dark UI, kinetic Gradient-Akzente, Glassmorphism-Elemente

---

## Installation & Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev

# Produktions-Build erstellen
npm run build

# Build-Vorschau
npm run preview
```

Die App ist unter `http://localhost:5173` erreichbar. Für PWA-Features (Service Worker, Installierbarkeit) wird ein Produktions-Build und HTTPS empfohlen.

---

## Daten-Export & Backup

Unter **Einstellungen → Daten exportieren** kann ein vollständiges JSON-Backup heruntergeladen werden:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Generated schema for Root",
  "type": "object",
  "properties": {
    "exportDate": {
      "type": "string"
    },
    "plans": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "description": {
            "type": "string"
          },
          "tags": {
            "type": "array",
            "items": {}
          },
          "exercises": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string"
                },
                "exerciseId": {
                  "type": "string"
                },
                "order": {
                  "type": "integer"
                },
                "sets": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "id": {
                        "type": "string"
                      },
                      "weight": {
                        "type": "integer"
                      },
                      "reps": {
                        "type": "integer"
                      },
                      "restSeconds": {
                        "type": "integer"
                      },
                      "weightUnit": {
                        "type": "string"
                      }
                    },
                    "required": [
                      "id",
                      "weight",
                      "reps",
                      "restSeconds"
                    ]
                  }
                }
              },
              "required": [
                "id",
                "exerciseId",
                "order",
                "sets"
              ]
            }
          },
          "estimatedDuration": {
            "type": "number"
          },
          "createdAt": {
            "type": "string"
          },
          "updatedAt": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "description",
          "tags",
          "exercises",
          "estimatedDuration",
          "createdAt",
          "updatedAt"
        ]
      }
    },
    "sessions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "planId": {
            "type": "string"
          },
          "planName": {
            "type": "string"
          },
          "startedAt": {
            "type": "string"
          },
          "completedAt": {
            "type": "string"
          },
          "durationSeconds": {
            "type": "integer"
          },
          "exercises": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "exerciseId": {
                  "type": "string"
                },
                "exerciseName": {
                  "type": "string"
                },
                "loggedSets": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "weight": {
                        "type": "number"
                      },
                      "reps": {
                        "type": "integer"
                      },
                      "completedAt": {
                        "type": "string"
                      }
                    },
                    "required": [
                      "weight",
                      "reps",
                      "completedAt"
                    ]
                  }
                }
              },
              "required": [
                "exerciseId",
                "exerciseName",
                "loggedSets"
              ]
            }
          }
        },
        "required": [
          "id",
          "planId",
          "planName",
          "startedAt",
          "completedAt",
          "durationSeconds",
          "exercises"
        ]
      }
    },
    "exercises": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "category": {
            "type": "string"
          },
          "equipment": {
            "type": "string"
          },
          "muscleGroups": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "tags": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "description": {
            "type": "string"
          },
          "imageUrl": {
            "type": "null"
          }
        },
        "required": [
          "id",
          "name",
          "category",
          "equipment",
          "muscleGroups",
          "tags",
          "description",
          "imageUrl"
        ]
      }
    }
  },
  "required": [
    "exportDate",
    "plans",
    "sessions",
    "exercises"
  ]
}
```

Die Datei enthält alle Trainingspläne, Trainingseinheiten und individuelle Übungen und kann zur Datensicherung lokal gespeichert werden.

---

## Lizenz

Privates Projekt. Alle Rechte vorbehalten.

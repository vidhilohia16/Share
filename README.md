# Travel Buddy | Weather Decision Engine & Smart Packing Assistant

> **Tech Vertical Recruitment Task Submission**  
> Turning raw forecast numbers into clear travel decisions and deduplicated packing lists.

![Travel Buddy](https://img.shields.io/badge/Open--Meteo-Live%20API-10b981?style=for-the-badge&logo=cloud)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

---

## 🌟 Overview

Raw forecast data is everywhere and free, but most weather apps fail because they give users a wall of numbers (highs, lows, precipitation %, wind speeds) without answering the two things travelers actually want:
1. **Is this going to be a decent trip weather-wise?**
2. **What should I pack?**

**Travel Buddy** bridges this gap. Built for *The Outdoor Sightseer & Leisure Explorer*, it evaluates daily forecast metrics using a prioritized decision engine and outputs plain-language advice before raw numbers, alongside a unified, deduplicated trip packing list.

---

## ✨ Key Features

- **Smart Location Disambiguation (Step 1):** Uses Open-Meteo Geocoding API (`/v1/search`). If a city query has multiple matches (e.g., 10 places named *Springfield*), an interactive selection card grid surfaces country, state/region, coordinates, and population so the user picks their exact destination.
- **Live Runtime API Calls (Step 2):** 100% live calls to Open-Meteo Forecast API (`/v1/forecast`) with zero hardcoded or pre-saved data. Enforces max 14-day trip range and max 15-day forecast horizon constraints gracefully.
- **Verdict FIRST Hierarchy (Step 3 & 4):** Every day displays a bold plain-language verdict (e.g., *"Hot & intense sun — explore early morning or after 4 PM, wear SPF 50"*) above secondary weather metrics.
- **Deduplicated Packing List (Step 3):** Scans the entire trip forecast and computes one deduplicated packing list grouped into *Clothing & Footwear*, *Weather Gear & Protection*, and *Travel Essentials*. Includes interactive checkboxes and a **Copy Packing List** button.
- **Overall Trip Summary (Step 3):** Displays a top hero verdict headline answering *"How is this trip looking?"*.
- **4 UI States (Step 4):** Empty state with popular trip presets, Loading state with glassmorphism shimmer skeletons, Error state for invalid inputs/network failures, and Results state.
- **Methodology & Workflow Note (Step 7):** Built-in interactive modal drawer detailing persona justification, quantitative threshold rules, deliberately omitted features, and v2 roadmap.

---

## 🛠️ Threshold Matrix & Decision Rules

| Metric Signal | Threshold Condition | Plain Language Output |
| :--- | :--- | :--- |
| **Severe Storm** | WMO Code $\ge$ 80 OR Wind $> 42\text{ km/h}$ | *"Weather alert: Heavy rain or strong winds expected — stay indoors or keep plans flexible."* |
| **High Rain Risk** | Precip Prob $> 55\%$ OR Precip Sum $> 4.5\text{ mm}$ | *"Rain likely — carry a compact umbrella/raincoat and plan indoor activities during peak hours."* |
| **Intense Heat & UV** | Max Temp $> 32^\circ\text{C}$ OR UV Index $> 7.5$ | *"Hot & intense sun — do outdoor sightseeing before 11 AM or after 4 PM; wear SPF 50."* |
| **Chilly & Wind** | Min Temp $< 12^\circ\text{C}$ OR Wind $> 25\text{ km/h}$ | *"Chilly & breezy — layer up with a fleece sweater or windbreaker for outdoor walks."* |
| **Unremarkable Day** | Mild ($18-28^\circ\text{C}$), Rain $< 25\%$, UV $< 6.5$ | *"Pleasant & comfortable — great weather for strolling, sightseeing, and outdoor terrace dining."* |

---

## 🚀 How to Run Locally

1. Clone this repository:
   ```bash
   git clone https://github.com/vidhilohia16/Share.git
   cd Share
   ```
2. Open `index.html` in any web browser, or serve using any static HTTP server:
   ```bash
   npx http-server . -p 8080
   ```
3. Open `http://localhost:8080` in your browser.

---

## 📂 Project Structure

```
├── index.html        # Single-page HTML markup with 4 UI state containers & modal
├── styles.css        # Emerald Green & White CSS design system (Glassmorphism, Micro-animations)
├── app.js            # Live Geocoding, Forecast API, Decision Engine & State Manager
├── workflow_note.md  # Detailed Step 7 recruitment submission write-up
└── README.md         # Documentation & GitHub Overview
```

---

## 📄 Recruitment Submission Note (Step 7 Summary)

- **Target Persona:** The Outdoor Sightseer & Leisure Explorer.
- **Disambiguation:** Solved via interactive selection grid for multi-match cities.
- **Deliberately Omitted:** Interactive 24-hour hourly graphs (omitted to prevent cognitive overload for travelers).
- **What We Would Build Next:** Activity Feasibility Scores, Rain Radar PWA Alerts, and Luggage Weight Calculator.

# Vithenics

![Express](https://img.shields.io/badge/Express-000000.svg?style=flat-square&logo=Express&logoColor=white)  ![JSON](https://img.shields.io/badge/JSON-000000.svg?style=flat-square&logo=JSON&logoColor=white)  ![npm](https://img.shields.io/badge/npm-CB3837.svg?style=flat-square&logo=npm&logoColor=white)  ![.ENV](https://img.shields.io/badge/.ENV-ECD53F.svg?style=flat-square&logo=dotenv&logoColor=black)  ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E.svg?style=flat-square&logo=JavaScript&logoColor=black)  ![Nodemon](https://img.shields.io/badge/Nodemon-76D04B.svg?style=flat-square&logo=Nodemon&logoColor=white)  ![GNU%20Bash](https://img.shields.io/badge/GNU%20Bash-4EAA25.svg?style=flat-square&logo=GNU-Bash&logoColor=white)  ![React](https://img.shields.io/badge/React-61DAFB.svg?style=flat-square&logo=React&logoColor=black)  ![Docker](https://img.shields.io/badge/Docker-2496ED.svg?style=flat-square&logo=Docker&logoColor=white)  ![Python](https://img.shields.io/badge/Python-3776AB.svg?style=flat-square&logo=Python&logoColor=white)  ![Zod](https://img.shields.io/badge/Zod-3E67B1.svg?style=flat-square&logo=Zod&logoColor=white)  ![Vite](https://img.shields.io/badge/Vite-646CFF.svg?style=flat-square&logo=Vite&logoColor=white)  ![ESLint](https://img.shields.io/badge/ESLint-4B32C3.svg?style=flat-square&logo=ESLint&logoColor=white)  ![Axios](https://img.shields.io/badge/Axios-5A29E4.svg?style=flat-square&logo=Axios&logoColor=white)  ![CSS](https://img.shields.io/badge/CSS-663399.svg?style=flat-square&logo=CSS&logoColor=white)  ![datefns](https://img.shields.io/badge/datefns-770C56.svg?style=flat-square&logo=date-fns&logoColor=white)  ![React%20Hook%20Form](https://img.shields.io/badge/React%20Hook%20Form-EC5990.svg?style=flat-square&logo=React-Hook-Form&logoColor=white)

## Overview

Vithenics is a calisthenics training web application. A deployment script launches the backend and builds the frontend for production. The MySQL database is seeded from structured JSON files covering exercises, skills, workouts, progressions, and achievements.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Contributing](#contributing)
- [License](#license)

---

## Features

|      | Component         | Details                                                                                                                                                                                                                                                                                                                  |
| :--- | :---------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ⚙️   | **Architecture**  | <ul><li>**Full-stack monorepo** split into `client/` (React SPA) and `server/` (Express REST API)</li><li>Client bootstrapped with **Vite + React**; server runs on **Node.js + Express**</li><li>**Mobile-first** hybrid app layer via **Capacitor** (`capacitor.config.json`, `@capacitor/android`)</li><li>MySQL relational database accessed via `mysql2`</li><li>JWT-based stateless auth flow between client and server</li></ul> |
| 🔩   | **Code Quality**  | <ul><li>**ESLint** configured with `@eslint/js`, `eslint-plugin-react-hooks`, and `eslint-plugin-react-refresh`</li><li>`jsconfig.json` for JS path resolution and editor intelligence</li><li>Form validation enforced via `react-hook-form` + `zod` schema resolvers (`@hookform/resolvers`)</li><li>Server-side input sanitization via `express-validator`</li><li>`nodemon` used for dev-time auto-reload</li></ul> |
| 📄   | **Documentation** | <ul><li>Minimal — primary documented artifact is `server/.env` (referenced in Docker context)</li><li>`LICENSE` file present at root</li><li>`components.json` documents shadcn/ui component configuration</li><li>No dedicated docs folder, wiki, or JSDoc annotations detected</li></ul> |
| 🔌   | **Integrations**  | <ul><li>**Capacitor plugins:** `@capacitor/camera`, `@capacitor/push-notifications`, `@capacitor/status-bar`, `@capacitor/app` — native mobile device APIs</li><li>**`nodemailer`** — transactional email (e.g., verification, notifications)</li><li>**`axios`** — HTTP client for client↔server communication</li><li>**`recharts`** — data visualization / analytics charts</li><li>**`framer-motion`** — UI animation layer</li><li>**`multer`** — multipart file/image upload handling on the server</li></ul> |

---

## Project Structure

```
└── Vithenics/
    ├── client
    │   ├── android
    │   ├── assets
    │   ├── capacitor.config.json
    │   ├── components.json
    │   ├── dist
    │   ├── eslint.config.js
    │   ├── icons
    │   ├── index.html
    │   ├── jsconfig.json
    ├── data
    │   ├── achievementsList.json
    │   ├── basicProgressions.json
    │   ├── exerciseList.json
    │   ├── routineList.json
    │   └── skillList.json
    ├── deploy.sh
    ├── LICENSE
    ├── load_data.py
    ├── prepare.sh
    ├── README.md
    └── server
        ├── .env
        ├── assets
        ├── config
        ├── index.js
        ├── middleware
        ├── package-lock.json
        ├── package.json
        ├── routes
        ├── uploads
        └── utils
```

---

## Getting Started

### Prerequisites

- Python 3.10+ / Node.js 18+ *(depending on the stack above)*

### Installation

```sh
git clone "https://github.com/IlluzyonistCode/Vithenics
cd Vithenics"
npm install && pip install -r requirements.txt
```

### Usage

```sh
bash deploy.sh
```

---

## Contributing

- [Report Issues](https://github.com/IlluzyonistCode/Vithenics/issues)
- [Submit Pull Requests](https://github.com/IlluzyonistCode/Vithenics/pulls)
- [Discussions](https://github.com/IlluzyonistCode/Vithenics/discussions)

---

## License

Distributed under the [AGPL-3.0](LICENSE) license.

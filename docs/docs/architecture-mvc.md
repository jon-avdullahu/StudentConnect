---
id: architecture-mvc
title: Backend MVC Architecture
sidebar_position: 4
---

# Model-View-Controller (MVC) Implementation

Following structural engineering best practices, our Express API has been explicitly reorganized to fully adopt the **Model-View-Controller (MVC)** architectural pattern. Since our "View" operates discretely in Next.js/React, our Node.js backend implements **M-C** plus routing.

## 1. Directory Structure

We shifted our logic from direct Express routing to a clean separation of concerns:
```
server/
├── controllers/          # Request/Response processing & entry logic
│   ├── authController.js
│   ├── listingController.js
│   ├── messageController.js
│   ├── profileController.js
│   ├── reportController.js
│   ├── studentsController.js
│   └── teamController.js
├── models/               # Directly interfaces with PostgreSQL
│   ├── userModel.js
│   ├── listingModel.js
│   ├── messageModel.js
│   ├── reportModel.js
│   └── teamModel.js
├── routes/               # API endpoint definitions mapped to controllers
│   ├── auth.js
│   ├── listings.js
│   ├── messages.js
│   ├── profile.js
│   ├── reports.js
│   ├── students.js
│   └── teams.js
├── middleware/
│   └── auth.js           # JWT verification middleware
├── scripts/
│   └── seed-admin.js     # Bootstrap admin users
└── db.js                 # PostgreSQL Pool and init logic (full schema)
```

## 2. Models
Models act as the data-access layer. Each file (`*Model.js`) encapsulates `pg` pool queries exclusively, meaning zero Express logic (`req`, `res`) resides here.

## 3. Controllers
Controllers abstract the heavy-lifting logic from `routes/`. They:
1. Destructure data coming from `req.body` or `req.params`.
2. Validate incoming requests structure.
3. Call precise operations within the `Models`.
4. Render the API responses explicitly using `res.status().json()`.

## 4. Routes
Our routes are now completely stripped of complexity. They merely define the literal endpoint and plug the relevant middleware (e.g., `authMiddleware`) straight into the mapped controller logic.

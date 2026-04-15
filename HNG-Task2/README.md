# Backend Wizards Stage 1 - Task 2: Data Persistence & API Design

A REST API that integrates with three external APIs (Genderize, Agify, Nationalize) to create user profiles, store them in a database, and expose endpoints to manage that data.

## Features

- **Multi-API Integration**: Calls 3 free external APIs with no authentication required
- **Data Persistence**: SQLite database for storing profiles
- **Duplicate Handling**: Checks for existing profiles before creating new ones (idempotency)
- **Classification Logic**: Classifies age groups and country based on API responses
- **CRUD Operations**: Full Create, Read, Update, Delete functionality
- **Comprehensive Error Handling**: Proper HTTP status codes and error messages
- **CORS Support**: Accessible from any origin

## Installation

```bash
npm install
```

## Running

Development (with auto-reload):
```bash
npm run dev
```

Production:
```bash
npm start
```

The server runs on port 3000 by default.

## API Endpoints

### 1. Create Profile
**POST** `/api/profiles`

Request body:
```json
{ "name": "ella" }
```

Success Response (201):
```json
{
  "status": "success",
  "data": {
    "id": "b3f9c1e2-7d4a-4c91-9c2a-1f0a8e5b6d12",
    "name": "ella",
    "gender": "female",
    "gender_probability": 0.99,
    "sample_size": 1234,
    "age": 46,
    "age_group": "adult",
    "country_id": "DRC",
    "country_probability": 0.85,
    "created_at": "2026-04-01T12:00:00Z"
  }
}
```

If profile exists (200):
```json
{
  "status": "success",
  "message": "Profile already exists",
  "data": { ...existing profile... }
}
```

### 2. Get Single Profile
**GET** `/api/profiles/{id}`

Success Response (200):
```json
{
  "status": "success",
  "data": {
    "id": "b3f9c1e2-7d4a-4c91-9c2a-1f0a8e5b6d12",
    "name": "emmanuel",
    "gender": "male",
    "gender_probability": 0.99,
    "sample_size": 1234,
    "age": 25,
    "age_group": "adult",
    "country_id": "NG",
    "country_probability": 0.85,
    "created_at": "2026-04-01T12:00:00Z"
  }
}
```

### 3. Get All Profiles
**GET** `/api/profiles`

Query parameters:
- `gender` (optional, case-insensitive)
- `country_id` (optional, case-insensitive)
- `age_group` (optional, case-insensitive)

Example: `/api/profiles?gender=male&country_id=NG`

Success Response (200):
```json
{
  "status": "success",
  "count": 2,
  "data": [
    {
      "id": "id-1",
      "name": "emmanuel",
      "gender": "male",
      "age": 25,
      "age_group": "adult",
      "country_id": "NG"
    },
    {
      "id": "id-2",
      "name": "sarah",
      "gender": "female",
      "age": 28,
      "age_group": "adult",
      "country_id": "US"
    }
  ]
}
```

### 4. Delete Profile
**DELETE** `/api/profiles/{id}`

Success Response: 204 No Content

## Error Handling

All errors follow this structure:
```json
{ "status": "error", "message": "<error message>" }
```

### Status Codes
- **400** Bad Request: Missing or empty name
- **404** Not Found: Profile not found
- **502** Bad Gateway: External API returned invalid response
- **500** Internal Server Error: Server error

### Edge Cases
- Genderize returns `gender: null` or `count: 0` → 502 error
- Agify returns `age: null` → 502 error
- Nationalize returns no country data → 502 error

## External APIs Used

1. **Genderize.io**: `https://api.genderize.io?name={name}`
2. **Agify.io**: `https://api.agify.io?name={name}`
3. **Nationalize.io**: `https://api.nationalize.io?name={name}`

## Age Group Classification

- 0–12 → child
- 13–19 → teenager
- 20–59 → adult
- 60+ → senior

## Database

Uses SQLite3 (better-sqlite3) for data persistence. Database file: `profiles.db`

## Response Format

- All timestamps in UTC ISO 8601 format
- All IDs use UUID v7
- All responses follow the specified structure exactly

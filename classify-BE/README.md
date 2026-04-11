# Backend Wizards Stage 0 - API Integration & Data Processing

A Node.js/Express API that integrates with the Genderize API and returns processed gender classification data.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

The server will run on `http://localhost:3000`

## Endpoints

### Health Check

```
GET /health
```

Returns server status.

### Classify Name

```
GET /api/classify?name={name}
```

**Query Parameters:**

- `name` (required): The name to classify

**Success Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "name": "john",
    "gender": "male",
    "probability": 0.99,
    "sample_size": 1234,
    "is_confident": true,
    "processed_at": "2026-04-01T12:00:00Z"
  }
}
```

**Error Responses:**

- **400 Bad Request**: Missing or empty name parameter
- **422 Unprocessable Entity**: Name is not a string
- **500 Internal Server Error**: Server error
- **502 Bad Gateway**: External API unavailable
- **504 Gateway Timeout**: External API timeout

## Features

✅ CORS enabled (Access-Control-Allow-Origin: \*)
✅ Calls Genderize API with name query parameter
✅ Processes raw API response
✅ Renames `count` to `sample_size`
✅ Computes `is_confident` (probability >= 0.7 AND sample_size >= 100)
✅ Generates `processed_at` in UTC ISO 8601 format
✅ Handles edge cases (null gender, count=0)
✅ Handles multiple concurrent requests
✅ Error handling for timeouts and upstream failures

## Testing

```bash
# Success case
curl "http://localhost:3000/api/classify?name=john"

# Missing name parameter
curl "http://localhost:3000/api/classify"

# Empty name
curl "http://localhost:3000/api/classify?name="
```

import express from "express";
import cors from "cors";
import axios from "axios";
import { v7 } from "uuid";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({ origin: "*" }));

// Database setup
const db = new Database(path.join(__dirname, "profiles.db"));
db.pragma("journal_mode = WAL");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    gender TEXT,
    gender_probability REAL,
    sample_size INTEGER,
    age INTEGER,
    age_group TEXT,
    country_id TEXT,
    country_probability REAL,
    created_at TEXT NOT NULL
  )
`);

// Classification functions
function classifyAgeGroup(age) {
  if (age === null || age === undefined) return null;
  if (age >= 0 && age <= 12) return "child";
  if (age >= 13 && age <= 19) return "teenager";
  if (age >= 20 && age <= 59) return "adult";
  if (age >= 60) return "senior";
  return null;
}

// Fetch data from external APIs
async function fetchProfileData(name) {
  const timeout = 10000; // 10 seconds
  try {
    const [genderRes, agifyRes, nationalizeRes] = await Promise.all([
      axios.get(`https://api.genderize.io?name=${encodeURIComponent(name)}`, {
        timeout,
      }),
      axios.get(`https://api.agify.io?name=${encodeURIComponent(name)}`, {
        timeout,
      }),
      axios.get(`https://api.nationalize.io?name=${encodeURIComponent(name)}`, {
        timeout,
      }),
    ]);

    // Validate Genderize response
    if (!genderRes.data.gender || genderRes.data.count === 0) {
      return {
        error: true,
        api: "Genderize",
        statusCode: 502,
      };
    }

    // Validate Agify response
    if (agifyRes.data.age === null) {
      return {
        error: true,
        api: "Agify",
        statusCode: 502,
      };
    }

    // Validate Nationalize response
    if (
      !nationalizeRes.data.country ||
      nationalizeRes.data.country.length === 0
    ) {
      return {
        error: true,
        api: "Nationalize",
        statusCode: 502,
      };
    }

    // Get country with highest probability
    const country = nationalizeRes.data.country.reduce((prev, current) =>
      prev.probability > current.probability ? prev : current,
    );

    return {
      gender: genderRes.data.gender,
      gender_probability: genderRes.data.probability,
      sample_size: genderRes.data.count,
      age: agifyRes.data.age,
      country_id: country.country_id,
      country_probability: country.probability,
    };
  } catch (error) {
    console.error("External API Error:", error.message, error.config?.url);
    let apiName = "External API";
    if (error.config?.url?.includes("genderize")) apiName = "Genderize";
    if (error.config?.url?.includes("agify")) apiName = "Agify";
    if (error.config?.url?.includes("nationalize")) apiName = "Nationalize";

    return {
      error: true,
      api: apiName,
      statusCode: error.code === "ECONNABORTED" ? 504 : 502,
    };
  }
}

// Create Profile - POST /api/profiles
app.post("/api/profiles", async (req, res) => {
  console.log("POST /api/profiles", req.body);
  try {
    const { name } = req.body;

    // Validation
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Missing or empty name",
      });
    }

    const trimmedName = name.trim().toLowerCase();

    // Check if profile already exists
    const existingProfile = db
      .prepare("SELECT * FROM profiles WHERE LOWER(name) = ?")
      .get(trimmedName);

    if (existingProfile) {
      return res.status(200).json({
        status: "success",
        message: "Profile already exists",
        data: formatProfile(existingProfile),
      });
    }

    // Fetch data from external APIs
    const profileData = await fetchProfileData(trimmedName);

    if (profileData.error) {
      const message =
        profileData.statusCode === 504
          ? `${profileData.api} request timed out`
          : `${profileData.api} returned an invalid response`;

      return res.status(profileData.statusCode).json({
        status: "error",
        message: message,
      });
    }

    // Create new profile
    const id = v7();
    const createdAt = new Date().toISOString();
    const ageGroup = classifyAgeGroup(profileData.age);

    const insertStmt = db.prepare(`
      INSERT INTO profiles (
        id, name, gender, gender_probability, sample_size,
        age, age_group, country_id, country_probability, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      id,
      trimmedName,
      profileData.gender,
      profileData.gender_probability,
      profileData.sample_size,
      profileData.age,
      ageGroup,
      profileData.country_id,
      profileData.country_probability,
      createdAt,
    );

    const newProfile = db
      .prepare("SELECT * FROM profiles WHERE id = ?")
      .get(id);

    return res.status(201).json({
      status: "success",
      data: formatProfile(newProfile),
    });
  } catch (error) {
    console.error("Error creating profile:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

// Get Single Profile - GET /api/profiles/:id
app.get("/api/profiles/:id", (req, res) => {
  try {
    const { id } = req.params;

    const profile = db.prepare("SELECT * FROM profiles WHERE id = ?").get(id);

    if (!profile) {
      return res.status(404).json({
        status: "error",
        message: "Profile not found",
      });
    }

    return res.status(200).json({
      status: "success",
      data: formatProfile(profile),
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

// Get All Profiles - GET /api/profiles
app.get("/api/profiles", (req, res) => {
  try {
    const { gender, country_id, age_group } = req.query;

    let query = "SELECT * FROM profiles WHERE 1=1";
    const params = [];

    if (gender) {
      query += " AND LOWER(gender) = ?";
      params.push(gender.toLowerCase());
    }

    if (country_id) {
      query += " AND UPPER(country_id) = ?";
      params.push(country_id.toUpperCase());
    }

    if (age_group) {
      query += " AND LOWER(age_group) = ?";
      params.push(age_group.toLowerCase());
    }

    const profiles = db.prepare(query).all(...params);

    return res.status(200).json({
      status: "success",
      count: profiles.length,
      data: profiles.map(formatProfile),
    });
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

// Delete Profile - DELETE /api/profiles/:id
app.delete("/api/profiles/:id", (req, res) => {
  try {
    const { id } = req.params;

    const profile = db.prepare("SELECT * FROM profiles WHERE id = ?").get(id);

    if (!profile) {
      return res.status(404).json({
        status: "error",
        message: "Profile not found",
      });
    }

    db.prepare("DELETE FROM profiles WHERE id = ?").run(id);

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting profile:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

// Helper function to format profile response
function formatProfile(profile) {
  return {
    id: profile.id,
    name: profile.name,
    gender: profile.gender,
    gender_probability: profile.gender_probability,
    sample_size: profile.sample_size,
    age: profile.age,
    age_group: profile.age_group,
    country_id: profile.country_id,
    country_probability: profile.country_probability,
    created_at: profile.created_at,
  };
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

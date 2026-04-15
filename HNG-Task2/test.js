import axios from "axios";

const BASE_URL = "http://localhost:3000/api/profiles";

async function runTests() {
    console.log("🚀 Starting HNG-Task2 Integration Tests...\n");

    try {
        // 1. Create Profile
        console.log("📝 Test: Create Profile");
        const createRes = await axios.post(BASE_URL, { name: "TestUser_" + Date.now() });
        if (createRes.status === 201 && createRes.data.status === "success") {
            console.log("✅ Success: Profile created\n");
        } else {
            throw new Error(`Failed to create profile: ${JSON.stringify(createRes.data)}`);
        }

        const profileId = createRes.data.data.id;

        // 2. Create Duplicate Profile
        console.log("📝 Test: Create Duplicate Profile");
        const dupRes = await axios.post(BASE_URL, { name: createRes.data.data.name });
        if (dupRes.status === 200 && dupRes.data.message === "Profile already exists") {
            console.log("✅ Success: Duplicate handled correctly\n");
        } else {
            throw new Error(`Failed duplicate test: ${JSON.stringify(dupRes.data)}`);
        }

        // 3. Get Single Profile
        console.log("📝 Test: Get Single Profile");
        const getRes = await axios.get(`${BASE_URL}/${profileId}`);
        if (getRes.status === 200 && getRes.data.data.id === profileId) {
            console.log("✅ Success: Profile retrieved\n");
        } else {
            throw new Error(`Failed to get profile: ${JSON.stringify(getRes.data)}`);
        }

        // 4. Get All Profiles
        console.log("📝 Test: Get All Profiles");
        const getAllRes = await axios.get(BASE_URL);
        if (getAllRes.status === 200 && getAllRes.data.count >= 1) {
            console.log(`✅ Success: Retrieved ${getAllRes.data.count} profiles\n`);
        } else {
            throw new Error(`Failed to get all profiles: ${JSON.stringify(getAllRes.data)}`);
        }

        // 5. Delete Profile
        console.log("📝 Test: Delete Profile");
        const delRes = await axios.delete(`${BASE_URL}/${profileId}`);
        if (delRes.status === 204) {
            console.log("✅ Success: Profile deleted\n");
        } else {
            throw new Error(`Failed to delete profile: Status ${delRes.status}`);
        }

        // 6. Verify Deletion
        console.log("📝 Test: Verify Deletion");
        try {
            await axios.get(`${BASE_URL}/${profileId}`);
            throw new Error("Profile still exists after deletion");
        } catch (error) {
            if (error.response?.status === 404) {
                console.log("✅ Success: Deletion verified (404 returned)\n");
            } else {
                throw error;
            }
        }

        console.log("🎉 All tests passed successfully!");
    } catch (error) {
        console.error("❌ Test failed:");
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data: ${JSON.stringify(error.response.data)}`);
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

runTests();

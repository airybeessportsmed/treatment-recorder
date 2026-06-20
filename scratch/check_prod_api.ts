import axios from 'axios';

async function main() {
  const url = 'https://treatment-recorder.onrender.com/api/trpc/athletes.list';
  const username = 'airybees';
  const password = 'sportsmed';
  const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

  try {
    const res = await axios.get(url, {
      headers: {
        'Authorization': authHeader
      }
    });
    console.log("Prod API Response:", JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    console.error("Error fetching from prod API:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

main();

from google import genai
from google.genai.types import HttpOptions

# initialize the client for Gemini via Vertex AI
client = genai.Client(http_options=HttpOptions(api_version="v1"))

# send a simple text prompt
response = client.models.generate_content(
    model="gemini-2.0-flash-001",
    contents="Give me three fun facts about hummingbirds.",
)

print(response.text)

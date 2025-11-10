import logging
import os
import json
import azure.functions as func
import requests
from openai import AzureOpenAI

# Constants
MAX_PROMPT_LENGTH = 1000


def verify_firebase_token(token):
    """Verify Firebase ID token

    This implementation logs diagnostic information, validates that the
    required environment variables are present, calls the Firebase
    `accounts:lookup` endpoint and returns the user object on success.
    It handles timeouts and logs response details for easier debugging.
    """
    try:
        firebase_project_id = os.environ.get("FIREBASE_PROJECT_ID")
        firebase_api_key = os.environ.get("FIREBASE_API_KEY")

        logging.info("🔍 Starting token verification...")
        logging.info(f"🔑 Firebase Project ID: {firebase_project_id}")
        logging.info(f"🔑 Firebase API Key present: {'Yes' if firebase_api_key else 'No'}")

        if not firebase_project_id:
            logging.warning("❌ Firebase project ID not configured")
            return None

        if not firebase_api_key:
            logging.warning("❌ Firebase API key not configured")
            return None

        url = f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={firebase_api_key}"
        logging.info(f"📡 Calling Firebase API: {url[:100]}...")

        response = requests.post(
            url,
            json={"idToken": token},
            timeout=10  # Increased timeout for network calls
        )

        logging.info(f"📥 Firebase API response status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            logging.info("✅ Firebase API returned valid data")
            if 'users' in data and len(data['users']) > 0:
                user = data['users'][0]
                logging.info(f"✅ Authenticated user: {user.get('email', 'Unknown')}")
                return user
            else:
                logging.warning("❌ No users found in response")
        else:
            logging.error(f"❌ Firebase API error: {response.status_code}")
            logging.error(f"❌ Response body: {response.text}")

        return None

    except requests.exceptions.Timeout:
        logging.error("❌ Firebase API timeout after 10 seconds")
        return None
    except Exception as e:
        logging.error(f"❌ Token verification error: {type(e).__name__}: {str(e)}")
        return None


def _cors_response(body='', status=200):
    """Return HttpResponse with standard CORS headers applied."""
    headers = {
        # In production set specific origin instead of '*'
        "Access-Control-Allow-Origin": os.environ.get("CORS_ALLOW_ORIGIN", "*"),
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Credentials": "true"
    }
    # body may be a dict or string
    if isinstance(body, (dict, list)):
        body_text = json.dumps(body, ensure_ascii=False)
    else:
        body_text = body or ""
    return func.HttpResponse(
        body=body_text,
        status_code=status,
        headers=headers,
        mimetype="application/json"
    )


def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('DALL-E 3 Image Generation function triggered.')

    # Handle CORS preflight
    if req.method == "OPTIONS":
        # 204 No Content for preflight
        return _cors_response('', status=204)

    # Verify Firebase token (required for image generation)
    auth_header = req.headers.get('Authorization')
    user_info = None

    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        user_info = verify_firebase_token(token)
    else:
        logging.info("No Authorization header present in request")

    # Allow skipping auth for tests/staging using an env var
    skip_auth = os.environ.get("SKIP_AUTH_FOR_TESTS", "false").lower() == "true"
    if not user_info:
        if skip_auth:
            logging.warning("Invalid or expired token - SKIPPING FOR TEST (SKIP_AUTH_FOR_TESTS=true)")
            user_info = {"email": "test@test.com", "localId": "test123"}
        else:
            return _cors_response({"error": "Unauthorized: Invalid or expired token. Please log in."}, status=401)

    # Validate environment variables for Azure OpenAI
    try:
        AZURE_OPENAI_KEY = os.environ["AZURE_OPENAI_KEY"]
        AZURE_OPENAI_ENDPOINT = os.environ["AZURE_OPENAI_ENDPOINT"]
        AZURE_OPENAI_DEPLOYMENT = os.environ.get("AZURE_OPENAI_DALLE_DEPLOYMENT", "dall-e-3")
        AZURE_OPENAI_API_VERSION = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-02-01")

        if not AZURE_OPENAI_KEY or not AZURE_OPENAI_ENDPOINT:
            raise ValueError("Azure OpenAI keys are empty")

    except (KeyError, ValueError) as e:
        logging.error(f"CRITICAL ERROR: Missing Azure OpenAI configuration. {e}")
        return _cors_response({"error": "Server error: Azure OpenAI keys not configured."}, status=500)

    # Get prompt from request
    try:
        req_body = req.get_json()
        prompt = req_body.get('prompt', '').strip()
        size = req_body.get('size', '1024x1024')  # Default size
        quality = req_body.get('quality', 'standard')  # standard or hd
        style = req_body.get('style', 'vivid')  # vivid or natural

    except ValueError:
        return _cors_response({"error": "Invalid JSON in request body."}, status=400)

    # Validate prompt
    if not prompt:
        return _cors_response({"error": "No prompt provided. Please provide a 'prompt' field."}, status=400)

    if len(prompt) > MAX_PROMPT_LENGTH:
        return _cors_response({"error": f"Prompt too long. Maximum length: {MAX_PROMPT_LENGTH} characters."}, status=400)

    # Validate size
    valid_sizes = ['1024x1024', '1792x1024', '1024x1792']
    if size not in valid_sizes:
        return _cors_response({"error": f"Invalid size. Allowed sizes: {', '.join(valid_sizes)}"}, status=400)

    # Generate image with DALL-E 3
    try:
        logging.info(f"Generating image for user: {user_info.get('email')} | Prompt: {prompt[:50]}...")

        # Initialize Azure OpenAI client
        client = AzureOpenAI(
            api_key=AZURE_OPENAI_KEY,
            api_version=AZURE_OPENAI_API_VERSION,
            azure_endpoint=AZURE_OPENAI_ENDPOINT
        )

        # Generate image
        result = client.images.generate(
            model=AZURE_OPENAI_DEPLOYMENT,
            prompt=prompt,
            size=size,
            quality=quality,
            style=style,
            n=1
        )

        # Get image URL
        image_url = result.data[0].url
        revised_prompt = getattr(result.data[0], 'revised_prompt', prompt)

        response_data = {
            "success": True,
            "image_url": image_url,
            "prompt": prompt,
            "revised_prompt": revised_prompt,
            "size": size,
            "quality": quality,
            "style": style,
            "user_email": user_info.get('email', 'Unknown')
        }

        logging.info(f"Image generated successfully for user: {user_info.get('email')}")

        return _cors_response(response_data, status=200)

    except Exception as e:
        logging.error(f"ERROR DURING IMAGE GENERATION: {type(e).__name__}: {str(e)}", exc_info=True)

        error_message = str(e)
        if "content_policy_violation" in error_message.lower():
            return _cors_response({"error": "Content policy violation: Your prompt was rejected by the safety system."}, status=400)

        return _cors_response({"error": "Error during image generation. Please try again."}, status=500)

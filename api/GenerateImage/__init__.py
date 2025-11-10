import logging
import os
import json
import azure.functions as func
import requests
from openai import AzureOpenAI

# Constants
MAX_PROMPT_LENGTH = 1000

def verify_firebase_token(token):
    """Verify Firebase ID token via Firebase REST Identity Toolkit (accounts:lookup).
    Returns user dict on success or None on failure. Logs helpful debug info.
    """
    try:
        if not token:
            logging.warning("verify_firebase_token: no token provided")
            return None

        # ensure no stray whitespace/newlines
        token = token.strip()

        firebase_project_id = os.environ.get("FIREBASE_PROJECT_ID")
        firebase_api_key = os.environ.get("FIREBASE_API_KEY")

        logging.info("🔍 Starting token verification...")
        logging.info(f"🔑 Firebase Project ID: {firebase_project_id}")
        logging.info(f"🔑 Firebase API Key present: {'Yes' if firebase_api_key else 'No'}")
        logging.info(f"🔐 Token snippet (verify start): {token[:60]}...")

        if not firebase_project_id:
            logging.warning("❌ Firebase project ID not configured")
            return None

        if not firebase_api_key:
            logging.warning("❌ Firebase API key not configured")
            return None

        url = f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={firebase_api_key}"
        logging.info(f"📡 Calling Firebase API: {url[:120]}")

        response = requests.post(
            url,
            json={"idToken": token},
            timeout=10
        )

        logging.info(f"📥 Firebase API response status: {response.status_code}")
        # log start of response text for debugging (trim to avoid huge logs)
        try:
            logging.info(f"📥 Firebase response text (start): {response.text[:800]}")
        except Exception:
            logging.info("📥 Could not log full response text")

        if response.status_code == 200:
            data = response.json()
            if 'users' in data and len(data['users']) > 0:
                user = data['users'][0]
                logging.info(f"✅ Authenticated user: {user.get('email', 'Unknown')} (localId: {user.get('localId')})")
                return user
            else:
                logging.warning("❌ No users found in response")
                return None
        else:
            logging.error(f"❌ Firebase API error: {response.status_code}")
            # response.text already logged above
            return None

    except requests.exceptions.Timeout:
        logging.error("❌ Firebase API timeout after 10 seconds")
        return None
    except Exception as e:
        logging.error(f"❌ Token verification error: {type(e).__name__}: {str(e)}")
        return None


def _cors_response(body='', status=200):
    """Return HttpResponse with CORS headers."""
    headers = {
        "Access-Control-Allow-Origin": os.environ.get("CORS_ALLOW_ORIGIN", "*"),
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Credentials": "true"
    }
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
        return _cors_response('', status=204)

    # Read Authorization header (case-insensitive)
    auth_header = req.headers.get('Authorization') or req.headers.get('authorization')
    logging.info(f"DEBUG: raw Authorization header present: {bool(auth_header)}")
    if auth_header:
        # log only start for safety
        logging.info(f"DEBUG: auth header start: {auth_header[:80]}")

    user_info = None

    if auth_header and auth_header.startswith('Bearer '):
        # split once, strip whitespace/newlines
        token = auth_header.split(' ', 1)[1].strip()
        logging.info(f"DEBUG: token snippet backend: {token[:60]}...")
        user_info = verify_firebase_token(token)
    else:
        logging.info("No (valid) Authorization header present in request")

    # Allow skipping auth for tests/staging via env var
    skip_auth = os.environ.get("SKIP_AUTH_FOR_TESTS", "false").lower() == "true"
    if not user_info:
        if skip_auth:
            logging.warning("Invalid or expired token - SKIPPING FOR TEST (SKIP_AUTH_FOR_TESTS=true)")
            user_info = {"email": "test@test.com", "localId": "test123"}
        else:
            return _cors_response({"error": "Unauthorized: Invalid or expired token. Please log in."}, status=401)

    # Validate Azure OpenAI env variables
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

    # Parse request body
    try:
        req_body = req.get_json()
        prompt = req_body.get('prompt', '').strip()
        size = req_body.get('size', '1024x1024')
        quality = req_body.get('quality', 'standard')
        style = req_body.get('style', 'vivid')

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

    # Generate image using Azure OpenAI
    try:
        logging.info(f"Generating image for user: {user_info.get('email')} | Prompt start: {prompt[:50]}...")

        client = AzureOpenAI(
            api_key=AZURE_OPENAI_KEY,
            api_version=AZURE_OPENAI_API_VERSION,
            azure_endpoint=AZURE_OPENAI_ENDPOINT
        )

        result = client.images.generate(
            model=AZURE_OPENAI_DEPLOYMENT,
            prompt=prompt,
            size=size,
            quality=quality,
            style=style,
            n=1
        )

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
        error_message = str(e).lower()
        if "content_policy_violation" in error_message:
            return _cors_response({"error": "Content policy violation: Your prompt was rejected by the safety system."}, status=400)
        return _cors_response({"error": "Error during image generation. Please try again."}, status=500)

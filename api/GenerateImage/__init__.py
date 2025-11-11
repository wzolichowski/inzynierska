import logging
import os
import json
import azure.functions as func
import requests
from openai import AzureOpenAI

# Constants
MAX_PROMPT_LENGTH = 1000

def verify_firebase_token(token):
    """Verify Firebase ID token with detailed logging"""
    try:
        firebase_project_id = os.environ.get("FIREBASE_PROJECT_ID")
        firebase_api_key = os.environ.get("FIREBASE_API_KEY")
        
        logging.info(f"🔍 Starting token verification...")
        logging.info(f"🔑 Firebase Project ID: {firebase_project_id}")
        logging.info(f"🔑 Firebase API Key present: {'Yes' if firebase_api_key else 'No'}")
        logging.info(f"🔑 Token length received: {len(token) if token else 0}")
        
        if not firebase_project_id:
            logging.warning("❌ Firebase project ID not configured")
            return None
        
        if not firebase_api_key:
            logging.warning("❌ Firebase API key not configured")
            return None
        
        if not token or len(token) < 500:
            logging.error(f"❌ Token too short or empty: {len(token) if token else 0} chars")
            return None
        
        url = f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={firebase_api_key}"
        logging.info(f"📡 Calling Firebase API...")
        
        response = requests.post(
            url,
            json={"idToken": token},
            timeout=10
        )
        
        logging.info(f"📥 Firebase API response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            logging.info(f"✅ Firebase API returned valid data")
            if 'users' in data and len(data['users']) > 0:
                user = data['users'][0]
                logging.info(f"✅ Authenticated user: {user.get('email', 'Unknown')}")
                return user
            else:
                logging.warning("❌ No users found in response")
        else:
            logging.error(f"❌ Firebase API error: {response.status_code}")
            logging.error(f"❌ Response body: {response.text[:500]}")
        
        return None
        
    except requests.exceptions.Timeout:
        logging.error("❌ Firebase API timeout after 10 seconds")
        return None
    except Exception as e:
        logging.error(f"❌ Token verification error: {type(e).__name__}: {str(e)}")
        return None

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('🎨 DALL-E 3 Image Generation function triggered.')

    # IMPORTANT: Try to get token from BOTH header AND body
    # Some proxies/CDNs truncate long headers
    auth_header = req.headers.get('Authorization')
    token = None
    token_source = None
    
    # Method 1: Try header first (standard)
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        token_source = "header"
        logging.info(f"🔐 Got token from Authorization header, length: {len(token)}")
    
    # Method 2: If header token is too short, try body (backup)
    if not token or len(token) < 500:
        try:
            req_body = req.get_json()
            body_token = req_body.get('token')
            if body_token and len(body_token) > len(token if token else ''):
                token = body_token
                token_source = "body"
                logging.info(f"🔐 Using token from request body instead, length: {len(token)}")
        except:
            pass
    
    if not token:
        logging.warning("❌ No authentication token provided in header or body")
        return func.HttpResponse(
            "Unauthorized: No authentication token provided.",
            status_code=401
        )
    
    if len(token) < 500:
        logging.error(f"❌ Token too short from {token_source}: {len(token)} chars (expected ~800-1500)")
        return func.HttpResponse(
            "Unauthorized: Invalid token format (token too short).",
            status_code=401
        )
    
    logging.info(f"✅ Token validated from {token_source}, length: {len(token)}")
    
    # Verify Firebase token
    user_info = verify_firebase_token(token)
    
    if not user_info:
        logging.warning("❌ Invalid or expired token")
        return func.HttpResponse(
            "Unauthorized: Invalid or expired token. Please log in.",
            status_code=401
        )
    
    logging.info(f"✅ User authenticated: {user_info.get('email', 'Unknown')}")
    
    # Validate environment variables
    try:
        AZURE_OPENAI_KEY = os.environ["AZURE_OPENAI_KEY"]
        AZURE_OPENAI_ENDPOINT = os.environ["AZURE_OPENAI_ENDPOINT"]
        AZURE_OPENAI_DEPLOYMENT = os.environ.get("AZURE_OPENAI_DALLE_DEPLOYMENT", "dall-e-3")
        AZURE_OPENAI_API_VERSION = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-02-01")
        
        logging.info(f"🔧 Azure OpenAI config:")
        logging.info(f"   Endpoint: {AZURE_OPENAI_ENDPOINT}")
        logging.info(f"   Deployment: {AZURE_OPENAI_DEPLOYMENT}")
        logging.info(f"   API Version: {AZURE_OPENAI_API_VERSION}")
        logging.info(f"   Key present: {'Yes' if AZURE_OPENAI_KEY else 'No'}")
        
        if not AZURE_OPENAI_KEY or not AZURE_OPENAI_ENDPOINT:
            raise ValueError("Azure OpenAI keys are empty")
            
    except (KeyError, ValueError) as e:
        logging.error(f"❌ CRITICAL ERROR: Missing Azure OpenAI configuration. {e}")
        return func.HttpResponse(
             "Server error: Azure OpenAI keys not configured.",
             status_code=500
        )

    # Get prompt from request
    try:
        req_body = req.get_json()
        prompt = req_body.get('prompt', '').strip()
        size = req_body.get('size', '1024x1024')
        quality = req_body.get('quality', 'standard')
        style = req_body.get('style', 'vivid')
        
        logging.info(f"📝 Request params:")
        logging.info(f"   Prompt length: {len(prompt)}")
        logging.info(f"   Size: {size}")
        logging.info(f"   Quality: {quality}")
        logging.info(f"   Style: {style}")
        
    except ValueError as e:
        logging.error(f"❌ Invalid JSON in request body: {e}")
        return func.HttpResponse(
            "Invalid JSON in request body.",
            status_code=400
        )

    # Validate prompt
    if not prompt:
        logging.warning("❌ No prompt provided")
        return func.HttpResponse(
            "No prompt provided. Please provide a 'prompt' field.",
            status_code=400
        )
    
    if len(prompt) > MAX_PROMPT_LENGTH:
        logging.warning(f"❌ Prompt too long: {len(prompt)} characters")
        return func.HttpResponse(
            f"Prompt too long. Maximum length: {MAX_PROMPT_LENGTH} characters.",
            status_code=400
        )

    # Validate size
    valid_sizes = ['1024x1024', '1792x1024', '1024x1792']
    if size not in valid_sizes:
        logging.warning(f"❌ Invalid size: {size}")
        return func.HttpResponse(
            f"Invalid size. Allowed sizes: {', '.join(valid_sizes)}",
            status_code=400
        )

    # Generate image with DALL-E 3
    try:
        logging.info(f"🎨 Generating image for user: {user_info.get('email')} | Prompt: {prompt[:100]}...")
        
        # Initialize Azure OpenAI client
        client = AzureOpenAI(
            api_key=AZURE_OPENAI_KEY,
            api_version=AZURE_OPENAI_API_VERSION,
            azure_endpoint=AZURE_OPENAI_ENDPOINT
        )
        
        logging.info(f"✅ Azure OpenAI client initialized")
        logging.info(f"🚀 Calling DALL-E 3 API...")
        
        # Generate image
        result = client.images.generate(
            model=AZURE_OPENAI_DEPLOYMENT,
            prompt=prompt,
            size=size,
            quality=quality,
            style=style,
            n=1
        )
        
        logging.info(f"✅ DALL-E 3 API call successful")
        
        # Get image URL
        image_url = result.data[0].url
        revised_prompt = result.data[0].revised_prompt if hasattr(result.data[0], 'revised_prompt') else prompt
        
        logging.info(f"🖼️ Image URL obtained: {image_url[:100]}...")
        
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

        logging.info(f"✅ Image generated successfully for user: {user_info.get('email')}")

        return func.HttpResponse(
            body=json.dumps(response_data, ensure_ascii=False),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        logging.error(f"❌ ERROR DURING IMAGE GENERATION: {type(e).__name__}: {str(e)}", exc_info=True)
        
        error_message = str(e)
        if "content_policy_violation" in error_message.lower():
            logging.warning(f"⚠️ Content policy violation for prompt: {prompt[:100]}")
            return func.HttpResponse(
                "Content policy violation: Your prompt was rejected by the safety system.",
                status_code=400
            )
        
        return func.HttpResponse(
            f"Error during image generation: {error_message[:200]}",
            status_code=500
        )
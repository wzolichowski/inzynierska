import logging
import os
import json
import azure.functions as func
import requests
from openai import AzureOpenAI

# Constants
MAX_PROMPT_LENGTH = 1000

def verify_firebase_token(token):
    """Verify Firebase ID token"""
    try:
        firebase_project_id = os.environ.get("FIREBASE_PROJECT_ID")
        
        if not firebase_project_id:
            logging.warning("Firebase project ID not configured")
            return None
        
        url = f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={os.environ.get('FIREBASE_API_KEY')}"
        
        response = requests.post(
            url,
            json={"idToken": token},
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            if 'users' in data and len(data['users']) > 0:
                user = data['users'][0]
                logging.info(f"Authenticated user: {user.get('email', 'Unknown')}")
                return user
        
        return None
        
    except Exception as e:
        logging.error(f"Token verification error: {e}")
        return None

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('DALL-E 3 Image Generation function triggered.')

    # Verify Firebase token (required for image generation)
    auth_header = req.headers.get('Authorization')
    user_info = None
    
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        user_info = verify_firebase_token(token)
        
        if not user_info:
            logging.warning("Invalid or expired token")
            return func.HttpResponse(
                "Unauthorized: Invalid or expired token. Please log in.",
                status_code=401
            )
    else:
        return func.HttpResponse(
            "Unauthorized: No authentication token provided.",
            status_code=401
        )
    
    # Validate environment variables
    try:
        AZURE_OPENAI_KEY = os.environ["AZURE_OPENAI_KEY"]
        AZURE_OPENAI_ENDPOINT = os.environ["AZURE_OPENAI_ENDPOINT"]
        AZURE_OPENAI_DEPLOYMENT = os.environ.get("AZURE_OPENAI_DALLE_DEPLOYMENT", "dall-e-3")
        AZURE_OPENAI_API_VERSION = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-02-01")
        
        if not AZURE_OPENAI_KEY or not AZURE_OPENAI_ENDPOINT:
            raise ValueError("Azure OpenAI keys are empty")
            
    except (KeyError, ValueError) as e:
        logging.error(f"CRITICAL ERROR: Missing Azure OpenAI configuration. {e}")
        return func.HttpResponse(
             "Server error: Azure OpenAI keys not configured.",
             status_code=500
        )

    # Get prompt from request
    try:
        req_body = req.get_json()
        prompt = req_body.get('prompt', '').strip()
        size = req_body.get('size', '1024x1024')  # Default size
        quality = req_body.get('quality', 'standard')  # standard or hd
        style = req_body.get('style', 'vivid')  # vivid or natural
        
    except ValueError:
        return func.HttpResponse(
            "Invalid JSON in request body.",
            status_code=400
        )

    # Validate prompt
    if not prompt:
        return func.HttpResponse(
            "No prompt provided. Please provide a 'prompt' field.",
            status_code=400
        )
    
    if len(prompt) > MAX_PROMPT_LENGTH:
        return func.HttpResponse(
            f"Prompt too long. Maximum length: {MAX_PROMPT_LENGTH} characters.",
            status_code=400
        )

    # Validate size
    valid_sizes = ['1024x1024', '1792x1024', '1024x1792']
    if size not in valid_sizes:
        return func.HttpResponse(
            f"Invalid size. Allowed sizes: {', '.join(valid_sizes)}",
            status_code=400
        )

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
        revised_prompt = result.data[0].revised_prompt if hasattr(result.data[0], 'revised_prompt') else prompt
        
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

        return func.HttpResponse(
            body=json.dumps(response_data, ensure_ascii=False),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        logging.error(f"ERROR DURING IMAGE GENERATION: {type(e).__name__}: {str(e)}", exc_info=True)
        
        error_message = str(e)
        if "content_policy_violation" in error_message.lower():
            return func.HttpResponse(
                "Content policy violation: Your prompt was rejected by the safety system.",
                status_code=400
            )
        
        return func.HttpResponse(
            "Error during image generation. Please try again.",
            status_code=500
        )
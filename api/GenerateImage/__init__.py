import logging
import os
import json
import azure.functions as func
import requests
from openai import AzureOpenAI

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
    logging.info('Funkcja GenerateImage została wywołana.')

    # Verify Firebase token (REQUIRED for image generation)
    auth_header = req.headers.get('Authorization')
    user_info = None
    
    if not auth_header or not auth_header.startswith('Bearer '):
        logging.warning("Missing authorization header")
        return func.HttpResponse(
            "Unauthorized: Missing authorization token",
            status_code=401
        )
    
    token = auth_header.split(' ')[1]
    user_info = verify_firebase_token(token)
    
    if not user_info:
        logging.warning("Invalid or expired token")
        return func.HttpResponse(
            "Unauthorized: Invalid or expired token",
            status_code=401
        )
    
    # Validate environment variables
    try:
        AZURE_OPENAI_KEY = os.environ["AZURE_OPENAI_KEY"]
        AZURE_OPENAI_ENDPOINT = os.environ["AZURE_OPENAI_ENDPOINT"]
        AZURE_OPENAI_API_VERSION = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-02-01")
        
        if not AZURE_OPENAI_KEY or not AZURE_OPENAI_ENDPOINT:
            raise ValueError("Klucze API są puste")
            
    except (KeyError, ValueError) as e:
        logging.error(f"KRYTYCZNY BŁĄD: Brak ustawień Azure OpenAI. {e}")
        return func.HttpResponse(
             "Błąd serwera: Klucze API dla Azure OpenAI nie są skonfigurowane.",
             status_code=500
        )

    # Get request body
    try:
        req_body = req.get_json()
    except ValueError:
        return func.HttpResponse(
            "Nieprawidłowe żądanie JSON",
            status_code=400
        )

    # Extract parameters
    caption = req_body.get('caption', '')
    tags = req_body.get('tags', [])
    
    if not caption and not tags:
        return func.HttpResponse(
            "Brak opisu lub tagów do wygenerowania obrazu",
            status_code=400
        )

    # Create prompt from caption and tags
    if caption:
        prompt = f"{caption}"
    else:
        prompt = f"An image containing: {', '.join(tags[:10])}"
    
    # Add artistic style
    prompt += ". Professional photograph, high quality, detailed, realistic."
    
    logging.info(f"Generated prompt: {prompt}")

    # Generate image using Azure OpenAI DALL-E 3
    try:
        client = AzureOpenAI(
            api_key=AZURE_OPENAI_KEY,
            api_version=AZURE_OPENAI_API_VERSION,
            azure_endpoint=AZURE_OPENAI_ENDPOINT
        )
        
        logging.info(f"Generating image for user: {user_info.get('email', 'Unknown')}")
        
        result = client.images.generate(
            model="dall-e-3",  # or your deployment name
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1
        )

        image_url = result.data[0].url
        revised_prompt = result.data[0].revised_prompt

        response_data = {
            "success": True,
            "image_url": image_url,
            "original_prompt": prompt,
            "revised_prompt": revised_prompt,
            "user_email": user_info.get('email', 'Unknown')
        }

        logging.info(f"Obraz wygenerowany pomyślnie dla: {user_info.get('email')}")

        return func.HttpResponse(
            body=json.dumps(response_data, ensure_ascii=False),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        logging.error(f"BŁĄD PODCZAS GENEROWANIA OBRAZU: {type(e).__name__}: {str(e)}", exc_info=True)
        
        error_message = str(e)
        
        # Handle specific errors
        if "content_policy_violation" in error_message.lower():
            return func.HttpResponse(
                "Obraz nie może być wygenerowany - naruszenie polityki treści",
                status_code=400
            )
        elif "rate_limit" in error_message.lower():
            return func.HttpResponse(
                "Limit zapytań wyczerpany. Spróbuj ponownie za chwilę.",
                status_code=429
            )
        
        return func.HttpResponse(
            f"Błąd podczas generowania obrazu: {error_message}",
            status_code=500
        )
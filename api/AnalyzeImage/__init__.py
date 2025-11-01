import logging
import os
import json
import azure.functions as func
import requests

from azure.cognitiveservices.vision.computervision import ComputerVisionClient
from msrest.authentication import CognitiveServicesCredentials

# Constants
ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png', 'image/jpg'}
MAX_FILE_SIZE = 4 * 1024 * 1024  # 4MB

def verify_firebase_token(token):
    """Verify Firebase ID token"""
    try:
        # Get Firebase project ID from environment
        firebase_project_id = os.environ.get("FIREBASE_PROJECT_ID")
        
        if not firebase_project_id:
            logging.warning("Firebase project ID not configured")
            return None
        
        # Verify token with Firebase REST API
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
    logging.info('Funkcja HTTP Trigger (Upload) została wywołana.')

    # Verify Firebase token (optional - make required if needed)
    auth_header = req.headers.get('Authorization')
    user_info = None
    
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        user_info = verify_firebase_token(token)
        
        if not user_info:
            logging.warning("Invalid or expired token")
            # Uncomment to require authentication:
            # return func.HttpResponse(
            #     "Unauthorized: Invalid or expired token",
            #     status_code=401
            # )
    
    # Validate environment variables
    try:
        AI_VISION_KEY = os.environ["AI_VISION_KEY"]
        AI_VISION_ENDPOINT = os.environ["AI_VISION_ENDPOINT"]
        
        if not AI_VISION_KEY or not AI_VISION_ENDPOINT:
            raise ValueError("Klucze API są puste")
            
    except (KeyError, ValueError) as e:
        logging.error(f"KRYTYCZNY BŁĄD: Brak ustawień AI_VISION_KEY lub AI_VISION_ENDPOINT. {e}")
        return func.HttpResponse(
             "Błąd serwera: Klucze API dla AI Vision nie są skonfigurowane.",
             status_code=500
        )

    # Create AI client
    try:
        credentials = CognitiveServicesCredentials(AI_VISION_KEY)
        client = ComputerVisionClient(AI_VISION_ENDPOINT, credentials)
    except Exception as e:
        logging.error(f"BŁĄD TWORZENIA KLIENTA AI: {e}")
        return func.HttpResponse(
            f"Błąd serwera: Nie można połączyć się z usługą AI.",
            status_code=500
        )

    # Get uploaded file
    try:
        image_file = req.files.get('file')
    except Exception as e:
        logging.error(f"Błąd odczytu pliku: {e}")
        return func.HttpResponse(
            "Błąd odczytu pliku z żądania.",
            status_code=400
        )

    # Validate file exists
    if not image_file:
        logging.warning("Żądanie bez pliku")
        return func.HttpResponse(
            "Nie wysłano pliku. Proszę wysłać plik w polu formularza o nazwie 'file'.",
            status_code=400
        )

    # Validate file type
    if image_file.mimetype not in ALLOWED_MIME_TYPES:
        logging.warning(f"Nieprawidłowy typ pliku: {image_file.mimetype}")
        return func.HttpResponse(
            f"Nieprawidłowy typ pliku. Dozwolone formaty: JPEG, PNG. Otrzymano: {image_file.mimetype}",
            status_code=400
        )

    # Validate file size
    image_file.stream.seek(0, 2)
    file_size = image_file.stream.tell()
    image_file.stream.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        logging.warning(f"Plik za duży: {file_size} bajtów")
        return func.HttpResponse(
            f"Plik jest za duży. Maksymalny rozmiar: {MAX_FILE_SIZE / (1024*1024):.1f}MB",
            status_code=400
        )
    
    if file_size == 0:
        logging.warning("Pusty plik")
        return func.HttpResponse(
            "Przesłany plik jest pusty.",
            status_code=400
        )

    # Analyze image
    try:
        logging.info(f"Analizowanie pliku: {image_file.filename} ({file_size} bajtów)")
        
        features = ["Tags", "Description"]
        analysis_result = client.analyze_image_in_stream(image_file, features)

        caption = "No description"
        if analysis_result.description and analysis_result.description.captions:
            caption = analysis_result.description.captions[0].text

        tags = []
        if analysis_result.tags:
            tags = [tag.name for tag in analysis_result.tags]

        result = {
            "filename": image_file.filename,
            "content_type": image_file.mimetype,
            "caption": caption,
            "tags": tags,
            "tags_count": len(tags)
        }
        
        # Add user info if authenticated
        if user_info:
            result["user_email"] = user_info.get('email', 'Unknown')

        logging.info(f"Analiza zakończona pomyślnie. Wykryto {len(tags)} tagów.")

        return func.HttpResponse(
            body=json.dumps(result, ensure_ascii=False),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        logging.error(f"BŁĄD PODCZAS ANALIZY OBRAZU: {type(e).__name__}: {str(e)}", exc_info=True)
        
        return func.HttpResponse(
            "Błąd podczas analizy obrazu. Sprawdź format pliku i spróbuj ponownie.",
            status_code=500
        )
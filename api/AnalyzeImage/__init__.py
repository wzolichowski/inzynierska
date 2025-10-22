import logging
import os
import json
import azure.functions as func

from azure.cognitiveservices.vision.computervision import ComputerVisionClient
from msrest.authentication import CognitiveServicesCredentials

# Constants
ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png', 'image/jpg'}
MAX_FILE_SIZE = 4 * 1024 * 1024  # 4MB - Azure Vision API limit

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Funkcja HTTP Trigger (Upload) została wywołana.')

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
    image_file.stream.seek(0, 2)  # Seek to end
    file_size = image_file.stream.tell()
    image_file.stream.seek(0)  # Reset to beginning
    
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

        # Extract results with better error handling
        caption = "Brak opisu"
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

        logging.info(f"Analiza zakończona pomyślnie. Wykryto {len(tags)} tagów.")

        return func.HttpResponse(
            body=json.dumps(result, ensure_ascii=False),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        # Log full exception details
        logging.error(f"BŁĄD PODCZAS ANALIZY OBRAZU: {type(e).__name__}: {str(e)}", exc_info=True)
        
        # Return user-friendly error
        return func.HttpResponse(
            "Błąd podczas analizy obrazu. Sprawdź format pliku i spróbuj ponownie.",
            status_code=500
        )
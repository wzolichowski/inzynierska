import logging
import os
import json
import azure.functions as func

from azure.cognitiveservices.vision.computervision import ComputerVisionClient
from msrest.authentication import CognitiveServicesCredentials

# --- Konfiguracja klienta AI Vision ---
# Ustaw je w zakładce "Konfiguracja" w Azure Static Web Apps
try:
    AI_VISION_KEY = os.environ["AI_VISION_KEY"]
    AI_VISION_ENDPOINT = os.environ["AI_VISION_ENDPOINT"]
except KeyError:
    AI_VISION_KEY = None 
    AI_VISION_ENDPOINT = None

# Autoryzacja klienta AI
credentials = CognitiveServicesCredentials(AI_VISION_KEY)
client = ComputerVisionClient(AI_VISION_ENDPOINT, credentials)
# ----------------------------------------


def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Funkcja HTTP Trigger (Upload) została wywołana.')

    if not AI_VISION_KEY or not AI_VISION_ENDPOINT:
        return func.HttpResponse(
             "Błąd serwera: Klucze API dla AI Vision nie są skonfigurowane.",
             status_code=500
        )

    # --- Nowa logika: Odbieranie pliku ---
    # Oczekujemy, że plik zostanie wysłany w formularzu pod nazwą 'file'
    try:
        image_file = req.files.get('file')
    except Exception as e:
         return func.HttpResponse(f"Błąd odczytu pliku: {e}", status_code=400)


    if image_file:
        try:
            # Plik 'image_file' jest obiektem strumieniowym (stream)
            # Możemy go przekazać bezpośrednio do klienta AI Vision
            
            logging.info(f"Otrzymano plik: {image_file.filename}, typ: {image_file.mimetype}")

            # --- Główna logika ---
            features = ["Tags", "Description"]
            
            # Używamy analyze_image_in_stream, ponieważ mamy strumień danych, a nie URL
            # Ustawiamy 'raw=True', aby uzyskać pełny obiekt odpowiedzi
            analysis_result = client.analyze_image_in_stream(image_file, features)

            # --- Przygotowanie odpowiedzi ---
            result = {
                "filename": image_file.filename,
                "content_type": image_file.mimetype,
                "caption": analysis_result.description.captions[0].text if analysis_result.description.captions else "Brak opisu",
                "tags": [tag.name for tag in analysis_result.tags]
            }

            # Zwracamy wynik jako JSON
            return func.HttpResponse(
                body=json.dumps(result, ensure_ascii=False),
                status_code=200,
                mimetype="application/json"
            )

        except Exception as e:
            logging.error(f"Błąd podczas analizy obrazu: {e}")
            # Zwracamy bardziej szczegółowy błąd, jeśli to możliwe
            return func.HttpResponse(
                f"Błąd analizy obrazu. Sprawdź, czy usługa AI Vision jest poprawnie skonfigurowana. Błąd: {str(e)}",
                status_code=500
            )

    else:
        # Jeśli nie wysłano pliku
        return func.HttpResponse(
             "Nie wysłano pliku. Proszę wysłać plik w polu formularza o nazwie 'file'.",
             status_code=400
        )
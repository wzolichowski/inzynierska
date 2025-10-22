import logging
import os
import json
import azure.functions as func

# Importujemy TYLKO to, co konieczne na górze
from azure.cognitiveservices.vision.computervision import ComputerVisionClient
from msrest.authentication import CognitiveServicesCredentials

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Funkcja HTTP Trigger (Upload) została wywołana.')

    # --- Przenosimy całą logikę do środka funkcji ---
    # To jest "bezpieczniejsze" i lepsze dla logowania
    try:
        AI_VISION_KEY = os.environ["AI_VISION_KEY"]
        AI_VISION_ENDPOINT = os.environ["AI_VISION_ENDPOINT"]
    except KeyError:
        logging.error("KRYTYCZNY BŁĄD: Brak ustawień AI_VISION_KEY lub AI_VISION_ENDPOINT.")
        return func.HttpResponse(
             "Błąd serwera: Klucze API dla AI Vision nie są skonfigurowane.",
             status_code=500
        )

    # Tworzymy klienta AI dopiero teraz, wewnątrz funkcji
    try:
        credentials = CognitiveServicesCredentials(AI_VISION_KEY)
        client = ComputerVisionClient(AI_VISION_ENDPOINT, credentials)
    except Exception as e:
        logging.error(f"BŁĄD TWORZENIA KLIENTA AI: {e}")
        return func.HttpResponse(f"Błąd serwera: Nie można połączyć się z usługą AI. Błąd: {str(e)}", status_code=500)
    # ---------------------------------------------------

    
    try:
        image_file = req.files.get('file')
    except Exception as e:
         logging.error(f"Błąd odczytu pliku: {e}")
         return func.HttpResponse(f"Błąd odczytu pliku: {e}", status_code=400)


    if image_file:
        try:
            logging.info(f"Otrzymano plik: {image_file.filename}, typ: {image_file.mimetype}")

            features = ["Tags", "Description"]
            
            # Używamy analyze_image_in_stream
            analysis_result = client.analyze_image_in_stream(image_file, features)

            result = {
                "filename": image_file.filename,
                "content_type": image_file.mimetype,
                "caption": analysis_result.description.captions[0].text if analysis_result.description.captions else "Brak opisu",
                "tags": [tag.name for tag in analysis_result.tags]
            }

            return func.HttpResponse(
                body=json.dumps(result, ensure_ascii=False),
                status_code=200,
                mimetype="application/json"
            )

        except Exception as e:
            # To jest błąd, który NAJPRAWDOPODOBNIEJ teraz zobaczysz w logach
            logging.error(f"BŁĄD PODCZAS ANALIZY OBRAZU: {e}")
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
import logging
import os
import json
import base64
import azure.functions as func
import requests
from openai import OpenAI

# ----- pomocnicze -----
def verify_firebase_token(token: str):
    """Verify Firebase ID token using Firebase REST API (accounts:lookup)."""
    try:
        firebase_project_id = os.environ.get("FIREBASE_PROJECT_ID")
        firebase_api_key = os.environ.get("FIREBASE_API_KEY")
        if not firebase_project_id or not firebase_api_key:
            logging.warning("Firebase not configured (FIREBASE_PROJECT_ID or FIREBASE_API_KEY missing)")
            return None

        url = f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={firebase_api_key}"
        resp = requests.post(url, json={"idToken": token}, timeout=5)
        logging.debug(f"Firebase verify status: {resp.status_code} body: {resp.text[:300]}")
        if resp.status_code == 200:
            data = resp.json()
            if "users" in data and len(data["users"]) > 0:
                return data["users"][0]
        return None

    except Exception:
        logging.exception("Token verification error")
        return None

# ----- funkcja główna -----
def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info("GenerateImage invoked")

    # 1) Autoryzacja (Firebase ID token wymagany)
    auth_header = req.headers.get("Authorization") or req.headers.get("authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        logging.warning("Missing Authorization header")
        return func.HttpResponse("Unauthorized: Missing authorization token", status_code=401)

    token = auth_header.split(" ", 1)[1]
    user_info = verify_firebase_token(token)
    if not user_info:
        logging.warning("Invalid or expired token")
        return func.HttpResponse("Unauthorized: Invalid or expired token", status_code=401)

    # 2) Sprawdź zmienne środowiskowe
    AZURE_OPENAI_KEY = os.environ.get("AZURE_OPENAI_KEY")
    AZURE_OPENAI_ENDPOINT = os.environ.get("AZURE_OPENAI_ENDPOINT")
    AZURE_OPENAI_API_VERSION = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-02-01")
    logging.info(f"Env presence: AZURE_OPENAI_KEY={'set' if AZURE_OPENAI_KEY else 'MISSING'}, AZURE_OPENAI_ENDPOINT={'set' if AZURE_OPENAI_ENDPOINT else 'MISSING'}")
    if not AZURE_OPENAI_KEY or not AZURE_OPENAI_ENDPOINT:
        logging.error("Missing Azure OpenAI configuration")
        return func.HttpResponse("Server error: Azure OpenAI keys not configured.", status_code=500)

    # 3) Pobierz body
    try:
        body = req.get_json()
    except ValueError:
        logging.warning("Invalid JSON body")
        return func.HttpResponse("Invalid JSON", status_code=400)

    caption = body.get("caption", "")
    tags = body.get("tags", [])
    if not caption and not tags:
        return func.HttpResponse("Missing caption or tags", status_code=400)

    # 4) Zbuduj prompt
    prompt = caption if caption else f"An image containing: {', '.join(tags[:10])}"
    prompt += ". Professional photograph, high quality, detailed, realistic."
    logging.info(f"Prompt: {prompt[:200]}")

    # 5) Utwórz klienta OpenAI (Azure)
    try:
        client = OpenAI(
            api_key=AZURE_OPENAI_KEY,
            api_base=AZURE_OPENAI_ENDPOINT,
            api_type="azure",
            api_version=AZURE_OPENAI_API_VERSION
        )
    except Exception:
        logging.exception("Failed to create OpenAI client")
        return func.HttpResponse("Server error: cannot create OpenAI client", status_code=500)

    # 6) Wywołaj generowanie obrazu
    try:
        logging.info("Calling OpenAI images.generate")
        # Jeśli w Azure korzystasz z deployment name zamiast model name, wstaw tu deployment name
        result = client.images.generate(model="dall-e-3", prompt=prompt, size="1024x1024", n=1)

        logging.debug(f"OpenAI raw response (truncated): {str(result)[:1000]}")

        # Parsowanie odpowiedzi bezpiecznie (różne struktury zwrotne)
        img_item = None
        if hasattr(result, "data") and result.data:
            img_item = result.data[0]
        elif isinstance(result, dict) and result.get("data"):
            img_item = result["data"][0]

        image_url = None
        image_b64 = None
        if img_item is not None:
            # próbuj atrybutów lub słownika
            image_url = getattr(img_item, "url", None) or (img_item.get("url") if isinstance(img_item, dict) else None)
            image_b64 = getattr(img_item, "b64_json", None) or (img_item.get("b64_json") if isinstance(img_item, dict) else None)

        if not image_url and not image_b64:
            logging.error("OpenAI response does not contain image data")
            return func.HttpResponse("Server error: no image in OpenAI response", status_code=500)

        response_data = {
            "success": True,
            "original_prompt": prompt,
            "user_email": user_info.get("email", "Unknown")
        }
        if image_url:
            response_data["image_url"] = image_url
        else:
            # jeśli mamy base64 -> zwróć jako string (uważaj na rozmiary)
            response_data["image_b64"] = image_b64

        logging.info("Image generated successfully")
        return func.HttpResponse(body=json.dumps(response_data, ensure_ascii=False), status_code=200, mimetype="application/json")

    except Exception as e:
        logging.exception("Error while generating image")
        # Tymczasowo zwracamy typ i treść wyjątku (usuń szczegóły w produkcji)
        return func.HttpResponse(f"Internal Server Error: {type(e).__name__}: {str(e)}", status_code=500)

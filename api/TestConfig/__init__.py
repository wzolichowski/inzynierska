import logging
import os
import azure.functions as func

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Test config endpoint called')
    
    config_check = {
        "FIREBASE_API_KEY": "✅ SET" if os.environ.get("FIREBASE_API_KEY") else "❌ MISSING",
        "FIREBASE_PROJECT_ID": "✅ SET" if os.environ.get("FIREBASE_PROJECT_ID") else "❌ MISSING",
        "FIREBASE_AUTH_DOMAIN": "✅ SET" if os.environ.get("FIREBASE_AUTH_DOMAIN") else "❌ MISSING",
        "AZURE_OPENAI_KEY": "✅ SET" if os.environ.get("AZURE_OPENAI_KEY") else "❌ MISSING",
        "AZURE_OPENAI_ENDPOINT": "✅ SET" if os.environ.get("AZURE_OPENAI_ENDPOINT") else "❌ MISSING",
        "AZURE_OPENAI_DALLE_DEPLOYMENT": "✅ SET" if os.environ.get("AZURE_OPENAI_DALLE_DEPLOYMENT") else "❌ MISSING",
        "AZURE_OPENAI_API_VERSION": "✅ SET" if os.environ.get("AZURE_OPENAI_API_VERSION") else "❌ MISSING",
    }
    
    return func.HttpResponse(
        body=str(config_check),
        status_code=200,
        mimetype="text/plain"
    )
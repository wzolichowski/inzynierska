import logging
import os
import json
import requests
import azure.functions as func

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Firebase Auth proxy wywołany')
    
    try:
        req_body = req.get_json()
        action = req_body.get('action')  # 'login', 'register', 'googleAuth'
        email = req_body.get('email')
        password = req_body.get('password')
        
        firebase_api_key = os.environ["FIREBASE_API_KEY"]
        
        if action == 'register':
            # Firebase REST API - Sign up
            url = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={firebase_api_key}"
            response = requests.post(url, json={
                'email': email,
                'password': password,
                'returnSecureToken': True
            })
            
        elif action == 'login':
            # Firebase REST API - Sign in
            url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={firebase_api_key}"
            response = requests.post(url, json={
                'email': email,
                'password': password,
                'returnSecureToken': True
            })
            
        elif action == 'googleAuth':
            # Google OAuth token exchange
            id_token = req_body.get('idToken')
            url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key={firebase_api_key}"
            response = requests.post(url, json={
                'postBody': f'id_token={id_token}&providerId=google.com',
                'requestUri': 'http://localhost',
                'returnSecureToken': True
            })
        
        if response.status_code == 200:
            data = response.json()
            return func.HttpResponse(
                body=json.dumps(data),
                status_code=200,
                mimetype="application/json"
            )
        else:
            return func.HttpResponse(
                response.text,
                status_code=response.status_code
            )
            
    except Exception as e:
        logging.error(f"Error: {e}")
        return func.HttpResponse(
            f"Error: {str(e)}",
            status_code=500
        )
import logging
import requests
import os
from typing import Optional, Tuple


def verify_firebase_token(token: str) -> Tuple[bool, Optional[dict], Optional[str]]:
    if not token:
        logging.warning('No token provided for verification')
        return False, None, 'No authentication token provided'

    firebase_api_key = os.environ.get('FIREBASE_API_KEY')

    if not firebase_api_key:
        logging.error('FIREBASE_API_KEY not configured in environment')
        return False, None, 'Server configuration error'

    try:
        logging.info(f'Verifying Firebase token (length: {len(token)})')

        verify_url = f'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={firebase_api_key}'

        headers = {
            'Content-Type': 'application/json'
        }

        payload = {
            'idToken': token
        }

        response = requests.post(verify_url, json=payload, headers=headers, timeout=10)

        if response.status_code == 200:
            data = response.json()

            if 'users' in data and len(data['users']) > 0:
                user_data = data['users'][0]
                logging.info(f"Token verified for user: {user_data.get('email', 'unknown')}")
                return True, user_data, None
            else:
                logging.warning('No user data in Firebase response')
                return False, None, 'Invalid token - no user data'
        else:
            error_text = response.text
            logging.error(f'Firebase verification failed: {error_text}')

            error_messages = {
                'INVALID_ID_TOKEN': 'Invalid or expired token',
                'USER_NOT_FOUND': 'User not found',
                'TOKEN_EXPIRED': 'Token has expired'
            }

            for error_code, message in error_messages.items():
                if error_code in error_text:
                    return False, None, message

            return False, None, 'Token verification failed'

    except requests.exceptions.Timeout:
        logging.error('Firebase verification timeout')
        return False, None, 'Authentication service timeout'
    except Exception as e:
        logging.error(f'Token verification error: {str(e)}')
        return False, None, 'Authentication error'


def extract_token_from_request(req) -> Optional[str]:
    auth_header = req.headers.get('Authorization', '')

    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header[7:]
        logging.info(f'Extracted token from header (length: {len(token)})')
        return token

    logging.warning('No Authorization header found')
    return None


def check_required_env_vars(var_names: list) -> dict:
    missing = []
    present = {}

    for var_name in var_names:
        value = os.environ.get(var_name)
        if value:
            present[var_name] = value
        else:
            missing.append(var_name)

    return {
        'missing': missing,
        'present': present,
        'all_present': len(missing) == 0
    }


def validate_firebase_config() -> Tuple[bool, str]:
    result = check_required_env_vars(['FIREBASE_API_KEY'])

    if not result['all_present']:
        error_msg = f"Missing environment variables: {', '.join(result['missing'])}"
        logging.error(error_msg)
        return False, error_msg

    return True, 'Firebase configuration valid'

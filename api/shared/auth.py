"""
Shared Firebase Authentication Module
Centralized token verification for Azure Functions
"""

import logging
import requests
import os
from typing import Optional, Tuple


def verify_firebase_token(token: str) -> Tuple[bool, Optional[dict], Optional[str]]:
    """
    Verify Firebase ID token using Firebase REST API

    Args:
        token: Firebase ID token to verify

    Returns:
        Tuple of (is_valid, user_data, error_message)
        - is_valid: True if token is valid
        - user_data: User data dict if valid, None otherwise
        - error_message: Error message if invalid, None otherwise
    """
    if not token:
        logging.warning('⚠️ No token provided for verification')
        return False, None, 'No authentication token provided'

    # Get Firebase Web API Key from environment
    firebase_api_key = os.environ.get('FIREBASE_API_KEY')

    if not firebase_api_key:
        logging.error('❌ FIREBASE_API_KEY not configured in environment')
        return False, None, 'Server configuration error'

    try:
        logging.info(f'🔐 Verifying Firebase token (length: {len(token)})')

        # Verify token using Firebase REST API
        verify_url = f'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={firebase_api_key}'

        verify_response = requests.post(
            verify_url,
            json={'idToken': token},
            timeout=10
        )

        if verify_response.status_code == 200:
            verify_data = verify_response.json()

            if 'users' in verify_data and len(verify_data['users']) > 0:
                user_data = verify_data['users'][0]
                user_email = user_data.get('email', 'Unknown')
                user_id = user_data.get('localId', 'Unknown')

                logging.info(f'✅ Token verified for user: {user_email} (ID: {user_id})')

                return True, user_data, None
            else:
                logging.warning('⚠️ Token verification returned no users')
                return False, None, 'Invalid token: no user data'
        else:
            error_data = verify_response.json() if verify_response.content else {}
            error_message = error_data.get('error', {}).get('message', 'Unknown error')

            logging.error(f'❌ Token verification failed: {error_message} (Status: {verify_response.status_code})')

            # Map common Firebase errors to user-friendly messages
            if 'INVALID_ID_TOKEN' in error_message:
                return False, None, 'Invalid or expired authentication token'
            elif 'USER_NOT_FOUND' in error_message:
                return False, None, 'User account not found'
            else:
                return False, None, f'Authentication failed: {error_message}'

    except requests.exceptions.Timeout:
        logging.error('❌ Firebase verification timeout')
        return False, None, 'Authentication service timeout'

    except requests.exceptions.RequestException as e:
        logging.error(f'❌ Firebase verification request error: {str(e)}')
        return False, None, 'Authentication service unavailable'

    except Exception as e:
        logging.error(f'❌ Unexpected error during token verification: {str(e)}')
        return False, None, 'Internal authentication error'


def extract_token_from_request(req) -> Optional[str]:
    """
    Extract bearer token from Authorization header

    Args:
        req: Azure Function HTTP request object

    Returns:
        Token string if found, None otherwise
    """
    auth_header = req.headers.get('Authorization', '')

    if auth_header.startswith('Bearer '):
        token = auth_header[7:]  # Remove 'Bearer ' prefix
        logging.info(f'✅ Token extracted from Authorization header (length: {len(token)})')
        return token
    elif auth_header:
        logging.warning(f'⚠️ Authorization header present but not in Bearer format: {auth_header[:20]}...')
        return None
    else:
        logging.warning('⚠️ No Authorization header found')
        return None


def check_required_env_vars(var_names: list) -> dict:
    """
    Check if required environment variables are configured

    Args:
        var_names: List of environment variable names to check

    Returns:
        Dict mapping variable names to boolean (True if configured)
    """
    results = {}
    for var_name in var_names:
        value = os.environ.get(var_name)
        results[var_name] = bool(value)

        if value:
            logging.info(f'✅ {var_name} is configured')
        else:
            logging.error(f'❌ {var_name} is NOT configured')

    return results


# Configuration validation
def validate_firebase_config() -> Tuple[bool, str]:
    """
    Validate Firebase configuration

    Returns:
        Tuple of (is_valid, error_message)
    """
    required_vars = ['FIREBASE_API_KEY']
    results = check_required_env_vars(required_vars)

    missing_vars = [var for var, configured in results.items() if not configured]

    if missing_vars:
        error_msg = f"Missing required environment variables: {', '.join(missing_vars)}"
        logging.error(f'❌ Firebase config validation failed: {error_msg}')
        return False, error_msg

    logging.info('✅ Firebase configuration is valid')
    return True, ''

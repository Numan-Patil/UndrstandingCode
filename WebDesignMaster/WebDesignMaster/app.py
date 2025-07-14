import os
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix

# Set up logging
logging.basicConfig(level=logging.DEBUG)

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

# Create the app
app = Flask(__name__, template_folder='templates', static_folder='static')
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-for-testing")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Configure the database
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///mentor.db")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

# Initialize the app with the extension
db.init_app(app)

# Import routes after app is configured
with app.app_context():
    # Import models to ensure tables are created
    import models
    db.create_all()

# Import routes
from routes import *

@app.route('/api/translate-error', methods=['POST'])
def translate_error():
    """Translate terminal errors into human-readable messages"""
    try:
        data = request.get_json()
        error_message = data.get('error', '')

        if not error_message:
            return jsonify({
                'success': False,
                'error': 'No error message provided'
            })

        # Use AI mentor to translate the error
        mentor = AIMentor()
        translated_message = mentor.translate_error_message(error_message)

        # Also try to provide contextual help
        context_prompt = f"""A user got this error in their terminal: {error_message}

Please provide a brief, friendly explanation of what went wrong and a simple suggestion for how to fix it. Keep it conversational and don't use technical jargon."""

        ai_response = mentor.get_response(context_prompt)

        return jsonify({
            'success': True,
            'translated_message': translated_message,
            'ai_explanation': ai_response.get('response', ''),
            'original_error': error_message
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })
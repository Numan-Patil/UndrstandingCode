from app import db
from datetime import datetime

class Session(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(256), unique=True, nullable=False)
    current_problem = db.Column(db.String(256))
    progress_data = db.Column(db.Text)  # JSON string
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Interaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(256), nullable=False)
    user_input = db.Column(db.Text, nullable=False)
    mentor_response = db.Column(db.Text, nullable=False)
    interaction_type = db.Column(db.String(50))  # 'learn' or 'code'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

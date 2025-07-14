# AI Coding Mentor - Replit Guide

## Overview

This is a Flask-based AI coding mentor application that provides interactive programming assistance without directly giving complete code solutions. The application uses a VS Code-like interface and integrates with OpenRouter's API to provide guided coding instruction through the DeepSeek model.

## System Architecture

### Backend Architecture
- **Framework**: Flask with SQLAlchemy ORM
- **Database**: SQLite (with support for PostgreSQL via DATABASE_URL environment variable)
- **AI Integration**: OpenRouter API using DeepSeek R1 model
- **Session Management**: Flask sessions with UUID-based session tracking
- **Data Persistence**: SQLAlchemy models for session and interaction storage

### Frontend Architecture
- **UI Framework**: Bootstrap 5 with custom CSS
- **Design System**: VS Code-inspired interface with file explorer, code editor, and terminal panels
- **JavaScript**: Vanilla JS with modular class-based structure
- **Syntax Highlighting**: Prism.js integration
- **Real-time Chat**: AJAX-based communication with the AI mentor

## Key Components

### Core Classes
1. **AIMentor** (`ai_mentor.py`): Handles API communication with OpenRouter
2. **CodeEditor** (`static/js/code-editor.js`): Manages code input and syntax highlighting
3. **AICodeMentor** (`static/js/app.js`): Main frontend application controller

### Database Models
- **Session**: Tracks user sessions with progress data
- **Interaction**: Stores conversation history between user and AI mentor

### API Endpoints
- `/`: Main application interface
- `/api/chat`: Chat interaction with AI mentor
- `/docs/<topic>`: Documentation pages for learning mode

## Data Flow

1. User interacts with the VS Code-like interface
2. Chat messages are sent to `/api/chat` endpoint
3. Flask routes process requests and query conversation history
4. AIMentor class formats requests for OpenRouter API
5. AI responses are processed and stored in the database
6. Frontend updates chat interface with structured responses

## External Dependencies

### Third-Party Services
- **OpenRouter API**: AI model access (DeepSeek R1)
- **Bootstrap 5**: UI framework
- **Font Awesome**: Icon library
- **Prism.js**: Syntax highlighting

### Python Packages
- Flask, Flask-SQLAlchemy: Web framework and ORM
- requests: HTTP client for API calls
- Werkzeug: WSGI utilities

## Deployment Strategy

### Environment Configuration
- `OPENROUTER_API_KEY`: API key for OpenRouter service
- `DATABASE_URL`: Database connection string (defaults to SQLite)
- `SESSION_SECRET`: Flask session encryption key

### Database Setup
- SQLite for development (default)
- PostgreSQL support via DATABASE_URL
- Automatic table creation on startup

### Hosting Requirements
- Python 3.x environment
- Flask-compatible hosting (Replit, Heroku, etc.)
- Environment variables for sensitive configuration

## Key Features

### AI Mentor Behavior
- **No Direct Solutions**: Provides guidance without complete code implementations
- **Two-Mode Interaction**: "Learn" mode (documentation) vs "Code" mode (guided assistance)
- **Step-by-Step Guidance**: Breaks down problems into manageable stages
- **Error Identification**: Helps users understand mistakes conceptually

### User Interface
- **File Explorer**: Navigate between different code files
- **Code Editor**: Syntax-highlighted code input area
- **Chat Interface**: Real-time conversation with AI mentor
- **Documentation System**: Built-in learning resources

## Changelog
- July 08, 2025: Initial setup with VS Code-like interface
- July 08, 2025: Major UI redesign following Dieter Rams principles and Replit-style layout
  - Separated AI assistant into dedicated right panel
  - Implemented modern color scheme with playful gradients
  - Added chat avatars and message timestamps
  - Enhanced typography with JetBrains Mono font
  - Improved button designs with hover animations
  - Added status indicators and improved visual hierarchy
- July 08, 2025: Complete UI rebuild from scratch
  - Rebuilt entire interface with modern dark theme
  - Implemented clean 3-panel layout: Files, Editor, Assistant
  - Added proper code editor with line numbers and syntax highlighting
  - Enhanced AI response formatting for conversational, human-readable output
  - Improved chat interface with typing indicators and message animations
  - Added console area with output and problems tabs
  - Implemented responsive design with proper scrolling and animations
- July 08, 2025: Final UI implementation based on JSON design system specifications
  - Applied exact color palette: primary (#1e1e1e), secondary (#252526), accent (#0e639c)
  - Implemented VS Code-style layout with Explorer, Code Display, and Bottom Panel
  - Added proper typography using Consolas/Courier New monospace fonts
  - Created tabbed interface with close buttons and active indicators
  - Implemented status bar with language mode, cursor position, and line count
  - Added syntax highlighting color scheme (keywords, functions, strings, numbers)
  - Created proper file tree with expandable folders and file icons
  - Implemented error handling with visual cues and proper scrollbars

## User Preferences

Preferred communication style: Simple, everyday language.
UI Design preferences: Playful but clean design following Dieter Rams' 10 principles of good design, Replit-style layout with separate assistant panel.
# Nepali Sign Language Recognition

This project is a full-stack application for recognizing Nepali sign language gestures using webcam input and machine learning. It consists of a React frontend and a Django backend.

## Project Structure

```
.gitignore
backend/
    db.sqlite3
    gesture_model.h5
    manage.py
    predict_webcam.py
    api/
        __init__.py
        admin.py
        apps.py
        models.py
        tests.py
        urls.py
        views.py
        migrations/
    backend/
        __init__.py
        asgi.py
        settings.py
        urls.py
        wsgi.py
frontend/
    package.json
    public/
        favicon.ico
        index.html
        ...
    src/
        App.js
        App.css
        ...
```

## Features

- **Frontend:**  
  - Built with React ([frontend/src/App.js](frontend/src/App.js))
  - Uses MediaPipe Hands for hand landmark detection
  - Webcam-based gesture recognition
  - Displays recognized words and sentences

- **Backend:**  
  - Built with Django ([backend/manage.py](backend/manage.py))
  - REST API for gesture prediction ([backend/api/views.py](backend/api/views.py))
  - Uses a trained model (`gesture_model.h5`) for classification

## Getting Started

### Prerequisites

- Node.js & npm (for frontend)
- Python 3.x (for backend)
- pip (Python package manager)

### Setup

#### Backend

1. Navigate to the `backend` directory:
    ```sh
    cd backend
    ```
2. Install dependencies:
    ```sh
    pip install -r requirements.txt
    ```
3. Run migrations:
    ```sh
    python manage.py migrate
    ```
4. Start the backend server:
    ```sh
    python manage.py runserver
    ```

#### Frontend

1. Navigate to the `frontend` directory:
    ```sh
    cd frontend
    ```
2. Install dependencies:
    ```sh
    npm install
    ```
3. Start the frontend development server:
    ```sh
    npm start
    ```

### Usage

- Open [http://localhost:3000](http://localhost:3000) in your browser.
- Allow webcam access.
- Perform Nepali sign language gestures; recognized words will appear on the screen.

## Testing

- Frontend tests:  
  ```sh
  npm test
  ```
- Backend tests:  
  ```sh
  python manage.py test
  ```

## License

This project is for educational purposes.

---

**Key files:**  
- Frontend main app: [`App.js`](frontend/src/App.js)  
-
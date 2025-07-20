from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
import tensorflow as tf
from PIL import Image
import numpy as np
import os
import logging

# Set up logging
logger = logging.getLogger(__name__)

# Create your views here.

MODEL_PATH = os.path.join(settings.BASE_DIR, 'gesture_model.h5')

try:
    model = tf.keras.models.load_model(MODEL_PATH)
    logger.info(f"Model loaded successfully from {MODEL_PATH}")
except Exception as e:
    logger.error(f"Failed to load model from {MODEL_PATH}: {str(e)}")
    model = None

class PredictGestureView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        try:
            # Check if model is loaded
            if model is None:
                return Response({
                    'error': 'Model not loaded. Please check the model file.',
                    'predicted_class': None,
                    'confidence': 0.0
                }, status=500)

            file_obj = request.FILES.get('image')
            if not file_obj:
                return Response({
                    'error': 'No image provided.',
                    'predicted_class': None,
                    'confidence': 0.0
                }, status=400)

            # Load and preprocess image
            image = Image.open(file_obj).convert('RGB')
            
            # Check image dimensions
            if image.size[0] < 64 or image.size[1] < 64:
                return Response({
                    'error': 'Image too small. Please ensure hands are clearly visible.',
                    'predicted_class': None,
                    'confidence': 0.0
                }, status=400)

            # Resize to model's expected input size
            image = image.resize((128, 128))
            
            # Convert to numpy array and normalize
            img_array = np.array(image) / 255.0
            
            # Add batch dimension
            img_array = np.expand_dims(img_array, axis=0)
            
            # Make prediction
            predictions = model.predict(img_array, verbose=0)
            
            # Get predicted class and confidence
            predicted_class = int(np.argmax(predictions, axis=1)[0])
            confidence = float(np.max(predictions, axis=1)[0])
            
            # Define class labels
            class_names = ['dhanyabaad', 'ghar', 'ma', 'namaskaar']
            predicted_label = class_names[predicted_class] if predicted_class < len(class_names) else f'Class {predicted_class}'
            
            # Log prediction for debugging
            logger.info(f"Prediction: {predicted_label} (class {predicted_class}) with confidence {confidence:.3f}")
            
            return Response({
                'predicted_class': predicted_class,
                'predicted_label': predicted_label,
                'confidence': confidence,
                'all_probabilities': predictions[0].tolist(),
                'class_names': class_names
            })
            
        except Exception as e:
            logger.error(f"Prediction error: {str(e)}")
            return Response({
                'error': f'Prediction failed: {str(e)}',
                'predicted_class': None,
                'confidence': 0.0
            }, status=500)

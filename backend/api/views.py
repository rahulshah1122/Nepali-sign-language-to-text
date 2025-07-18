from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
import tensorflow as tf
from PIL import Image
import numpy as np
import os

# Create your views here.

MODEL_PATH = os.path.join(settings.BASE_DIR, 'gesture_model.h5')
model = tf.keras.models.load_model(MODEL_PATH)

class PredictGestureView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get('image')
        if not file_obj:
            return Response({'error': 'No image provided.'}, status=400)
        image = Image.open(file_obj).convert('RGB')
        image = image.resize((128, 128))  # Match model's expected input size
        img_array = np.array(image) / 255.0
        img_array = np.expand_dims(img_array, axis=0)
        prediction = model.predict(img_array)
        predicted_class = int(np.argmax(prediction, axis=1)[0])
        return Response({'predicted_class': predicted_class})

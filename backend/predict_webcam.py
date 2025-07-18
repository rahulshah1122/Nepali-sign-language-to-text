import cv2
import numpy as np
import tensorflow as tf

# Load trained model
model = tf.keras.models.load_model('backend\gesture_model.h5')

# Define the class labels (in order of folders used during training)
class_names = ['dhanyabaad', 'ghar', 'ma', 'namaskaar']

# Image settings
img_height, img_width = 128, 128

# Start webcam
cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Flip and copy the frame for displaying
    display_frame = cv2.flip(frame, 1)

    # Define a region of interest (ROI) where gesture is expected
    x1, y1, x2, y2 = 100, 100, 300, 300
    roi = frame[y1:y2, x1:x2]

    # Preprocess ROI
    roi_resized = cv2.resize(roi, (img_width, img_height))
    roi_normalized = roi_resized / 255.0
    roi_input = np.expand_dims(roi_normalized, axis=0)

    # Predict
    predictions = model.predict(roi_input)
    class_index = np.argmax(predictions[0])
    predicted_label = class_names[class_index]

    # Draw box and label
    cv2.rectangle(display_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
    cv2.putText(display_frame, f"Prediction: {predicted_label}",
                (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

    # Show result
    cv2.imshow("Gesture Prediction", display_frame)

    # Exit on 'q' key
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Cleanup
cap.release()
cv2.destroyAllWindows()

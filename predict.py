import joblib
import sys


# Load the saved model
model = joblib.load('model.pkl')

# Read the image path from the command line
image_path = sys.stdin.readline().strip()

# Perform the prediction using the loaded model
prediction = model.predict([image_path])

# Print the prediction result
print(prediction)
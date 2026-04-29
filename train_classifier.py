"""
Train a simple clause type classifier using the built-in dataset.
"""
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
import joblib

# Load dataset
DATA_PATH = "sample_legal_clauses.csv"
df = pd.read_csv(DATA_PATH)

# Build pipeline
pipeline = Pipeline([
    ("tfidf", TfidfVectorizer()),
    ("clf", MultinomialNB()),
])

# Train
pipeline.fit(df["clause_text"], df["clause_type"])

# Save model
joblib.dump(pipeline, "clause_classifier.joblib")

print("Model trained and saved as clause_classifier.joblib")

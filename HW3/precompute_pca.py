# File: precompute_pca.py

import json
from gensim.models import Word2Vec
from sklearn.decomposition import PCA
import numpy as np

print("--- Starting One-Time PCA Pre-computation ---")
print("This should be much faster than t-SNE.")

# List of models to process
model_files = {
    "skipgram": "pubmed_skipgram.model",
    "cbow": "pubmed_cbow.model",
    "skipgram_no_stopwords": "pubmed_skipgram_no_stopwords.model",
    "cbow_no_stopwords": "pubmed_cbow_no_stopwords.model",
    "skipgram_stemmed": "pubmed_skipgram_stemmed.model",
    "cbow_stemmed": "pubmed_cbow_stemmed.model"
}

for name, filename in model_files.items():
    try:
        print(f"\nProcessing model: {filename}...")
        
        # 1. Load the model and its vocabulary
        model = Word2Vec.load(filename)
        words = list(model.wv.index_to_key)
        vectors = model.wv[words]
        
        print(f"  - Vocabulary size: {len(words)}")
        print("  - Running PCA...")

        # 2. Run PCA to reduce to 2 components
        pca = PCA(n_components=2, random_state=42)
        pca_coords = pca.fit_transform(vectors)
        
        print("  - PCA calculation complete.")

        # 3. Create the coordinate map and save to JSON
        coordinate_map = {}
        for i, word in enumerate(words):
            coordinate_map[word] = {
                "x": float(pca_coords[i, 0]),
                "y": float(pca_coords[i, 1])
            }
        
        output_filename = f"pca_coords_{name}.json"
        with open(output_filename, 'w', encoding='utf-8') as f:
            json.dump(coordinate_map, f)
            
        print(f"  - Successfully saved coordinates to {output_filename}")

    except FileNotFoundError:
        print(f"  - WARNING: Model file not found: {filename}. Skipping.")
    except Exception as e:
        print(f"  - An error occurred processing {filename}: {e}")

print("\n--- All models processed. PCA pre-computation complete. ---")
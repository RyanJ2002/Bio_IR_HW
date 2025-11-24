from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from gensim.models import Word2Vec
import os
import json
from nltk.stem import PorterStemmer
# PCA is not needed here as we pre-load coordinates
# from sklearn.decomposition import PCA 
from sklearn.manifold import TSNE
import numpy as np
import random

app = Flask(__name__)
# Enable CORS to allow requests from your HTML file opened in the browser
CORS(app)

### HW3 ======
input_corpus_path = "pubmed_corpus_no_stopwords.txt"
output_corpus_path = "pubmed_corpus_stemmed.txt"
map_output_path = "reverse_stem_map.json" # The new map file

stemmer = PorterStemmer()
reverse_stem_map = {}
models = {}
tsne_coordinate_maps = {}
pca_coordinate_maps = {} # NEW: Dictionary for PCA coordinates

def load_pca_coordinates():
    """Loads all pre-computed PCA coordinate maps from JSON files."""
    print("--- Loading pre-computed PCA coordinate maps ---")
    model_names = ["skipgram", "cbow", "skipgram_no_stopwords", "cbow_no_stopwords", "skipgram_stemmed", "cbow_stemmed"]
    
    for name in model_names:
        filename = f"pca_coords_{name}.json"
        if os.path.exists(filename):
            try:
                with open(filename, 'r', encoding='utf-8') as f:
                    pca_coordinate_maps[name] = json.load(f)
                print(f"  - Loaded PCA coordinates for '{name}'")
            except Exception as e:
                print(f"  - Error loading {filename}: {e}")
        else:
            print(f"  - WARNING: PCA coordinate file not found: {filename}")


def load_tsne_coordinates():
    """Loads all pre-computed t-SNE coordinate maps from JSON files."""
    print("--- Loading pre-computed t-SNE coordinate maps ---")
    model_names = ["skipgram", "cbow", "skipgram_no_stopwords", "cbow_no_stopwords", "skipgram_stemmed", "cbow_stemmed"]
    
    for name in model_names:
        filename = f"tsne_coords_{name}.json"
        if os.path.exists(filename):
            try:
                with open(filename, 'r', encoding='utf-8') as f:
                    tsne_coordinate_maps[name] = json.load(f)
                print(f"  - Loaded t-SNE coordinates for '{name}'")
            except Exception as e:
                print(f"  - Error loading {filename}: {e}")
        else:
            print(f"  - WARNING: t-SNE coordinate file not found: {filename}")

def load_reverse_stem_map():
    """Loads the reverse stem map from JSON file."""
    map_file = "reverse_stem_map.json"
    print(f"--- Loading reverse stem map from {map_file} ---")
    if os.path.exists(map_file):
        try:
            with open(map_file, 'r', encoding='utf-8') as f:
                global reverse_stem_map
                reverse_stem_map = json.load(f)
            print("Reverse stem map loaded successfully.")
        except Exception as e:
            print(f"Error loading reverse stem map: {e}")
    else:
        print(f"WARNING: {map_file} not found. Stemmed results will not be enriched.")


def load_models():
    """
    Loads all Word2Vec models from the disk into the 'models' dictionary.
    This function is called once when the server starts.
    """
    print("--- Loading Word2Vec models ---")
    
    model_files = {
        "cbow": "pubmed_cbow.model",
        "skipgram": "pubmed_skipgram.model",
        "cbow_no_stopwords": "pubmed_cbow_no_stopwords.model",
        "skipgram_no_stopwords": "pubmed_skipgram_no_stopwords.model",
        "cbow_stemmed": "pubmed_cbow_stemmed.model",
        "skipgram_stemmed": "pubmed_skipgram_stemmed.model"
    }

    for name, filename in model_files.items():
        if os.path.exists(filename):
            try:
                print(f"Loading model: {filename}...")
                models[name] = Word2Vec.load(filename)
                print(f"'{name}' model loaded successfully.")
            except Exception as e:
                print(f"Error loading model '{filename}': {e}")
        else:
            print(f"WARNING: Model file not found: {filename}. This model will not be available.")

    print("--- Model loading complete ---")


@app.route('/get-stem-map', methods=['GET'])
def get_stem_map():
    return jsonify(stem_map)
### ======

@app.route('/fetch-xml', methods=['GET'])
def fetch_pubmed_xml():
    pmid = request.args.get('pmid')
    if not pmid:
        return jsonify({"error": "PMID is required"}), 400
    print(f"Received request for PMID: {pmid}")
    base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
    params = {"db": "pubmed", "id": pmid, "rettype": "abstract", "retmode": "xml"}
    try:
        response = requests.get(base_url, params=params)
        response.raise_for_status()
        return response.text, 200, {'Content-Type': 'application/xml'}
    except requests.exceptions.RequestException as e:
        print(f"Error fetching from NCBI: {e}")
        return jsonify({"error": f"Failed to fetch data from NCBI: {e}"}), 500

### HW3 ======
@app.route('/get-all-similarities', methods=['GET'])
def get_all_similarities():
    keyword = request.args.get('keyword').lower().strip()
    all_results = {}
    stemmed_models = ["cbow_stemmed", "skipgram_stemmed"]
    stemmed_keyword = stemmer.stem(keyword)
    model_order = ["skipgram", "cbow","skipgram_no_stopwords", "cbow_no_stopwords", "skipgram_stemmed", "cbow_stemmed"]

    for name in model_order:
        if name in models:
            model = models[name]
            query_word = stemmed_keyword if name in stemmed_models else keyword
            try:
                similar_words = model.wv.most_similar(query_word, topn=10)
                enriched_results = []
                for word, score in similar_words:
                    result_item = {"word": word, "score": float(score)}
                    if name in stemmed_models:
                        result_item["originals"] = reverse_stem_map.get(word, [word])
                    enriched_results.append(result_item)
                all_results[name] = enriched_results
            except KeyError:
                all_results[name] = []
        else:
            all_results[name] = []
            
    return jsonify(all_results)

def get_projection_data(keyword, coord_maps, models):
    """Helper function to get data for both t-SNE and PCA."""
    if not keyword:
        return {"error": "A 'keyword' is required."}, 400

    all_results = {}
    stemmed_models = ["cbow_stemmed", "skipgram_stemmed"]
    stemmed_keyword = stemmer.stem(keyword)
    model_order = ["skipgram", "cbow", "skipgram_no_stopwords", "cbow_no_stopwords", "skipgram_stemmed", "cbow_stemmed"]
    SAMPLE_SIZE = 500

    for name in model_order:
        if name in models and name in coord_maps:
            model = models[name]
            coord_map = coord_maps[name]
            query_word = stemmed_keyword if name in stemmed_models else keyword
            
            if query_word not in coord_map:
                all_results[name] = []
                continue

            try:
                similar_words = [w for w, s in model.wv.most_similar(query_word, topn=10)]
                highlight_words = [query_word] + similar_words
                
                data_points = []
                for i, word in enumerate(highlight_words):
                    if word in coord_map:
                        coords = coord_map[word]
                        data_points.append({
                            "label": word, "x": coords['x'], "y": coords['y'],
                            "type": "keyword" if i == 0 else "similar"
                        })
                
                other_words = [w for w in coord_map if w not in highlight_words]
                sample_words = random.sample(other_words, min(SAMPLE_SIZE, len(other_words)))

                for word in sample_words:
                    coords = coord_map[word]
                    data_points.append({
                        "label": word, "x": coords['x'], "y": coords['y'],
                        "type": "sample"
                    })
                
                all_results[name] = data_points

            except Exception as e:
                print(f"Error processing projection for {name}: {e}")
                all_results[name] = []
        else:
            all_results[name] = []
            
    return all_results

@app.route('/get-tsne-visualization', methods=['GET'])
def get_tsne_visualization():
    keyword = request.args.get('keyword', '').lower().strip()
    result = get_projection_data(keyword, tsne_coordinate_maps, models)
    if "error" in result:
        return jsonify(result), 400
    return jsonify(result)

# NEW: PCA visualization endpoint
@app.route('/get-pca-visualization', methods=['GET'])
def get_pca_visualization():
    keyword = request.args.get('keyword', '').lower().strip()
    result = get_projection_data(keyword, pca_coordinate_maps, models)
    if "error" in result:
        return jsonify(result), 400
    return jsonify(result)
### ======

if __name__ == '__main__':
    load_models()
    load_reverse_stem_map()
    load_tsne_coordinates()
    load_pca_coordinates() # <-- ADD THIS LINE
    app.run(debug=True, port=5000)
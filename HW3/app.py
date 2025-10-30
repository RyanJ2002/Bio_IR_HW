from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from gensim.models import Word2Vec
import os
import json
from nltk.stem import PorterStemmer

app = Flask(__name__)
# Enable CORS to allow requests from your HTML file opened in the browser
CORS(app)

### HW3 ======
input_corpus_path = "pubmed_corpus_no_stopwords.txt"
output_corpus_path = "pubmed_corpus_stemmed.txt"
map_output_path = "reverse_stem_map.json" # The new map file

stemmer = PorterStemmer()
reverse_stem_map = {}
reverse_stem_map = {}
models = {}

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
    
    # This dictionary must contain ALL SIX models
    model_files = {
        "cbow": "pubmed_cbow.model",
        "skipgram": "pubmed_skipgram.model",
        "cbow_no_stopwords": "pubmed_cbow_no_stopwords.model",
        "skipgram_no_stopwords": "pubmed_skipgram_no_stopwords.model",
        # --- THESE TWO LINES WERE MISSING ---
        "cbow_stemmed": "pubmed_cbow_stemmed.model",
        "skipgram_stemmed": "pubmed_skipgram_stemmed.model"
    }

    for name, filename in model_files.items():
        if os.path.exists(filename):
            try:
                print(f"Loading model: {filename}...")
                # The 'global models' line is not needed here as we are modifying the dictionary directly.
                models[name] = Word2Vec.load(filename)
                print(f"'{name}' model loaded successfully.")
            except Exception as e:
                print(f"Error loading model '{filename}': {e}")
        else:
            print(f"WARNING: Model file not found: {filename}. This model will not be available.")

    print("--- Model loading complete ---")

load_models()

@app.route('/get-stem-map', methods=['GET'])
def get_stem_map():
    return jsonify(stem_map)
### ======

@app.route('/fetch-xml', methods=['GET'])
def fetch_pubmed_xml():
    # Get the PubMed ID from the request URL (e.g., /fetch-xml?pmid=12345)
    pmid = request.args.get('pmid')

    if not pmid:
        return jsonify({"error": "PMID is required"}), 400

    print(f"Received request for PMID: {pmid}")

    # Construct the URL for the NCBI E-utilities API to fetch XML data
    base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
    params = {
        "db": "pubmed",
        "id": pmid,
        "rettype": "abstract", # You can use 'full' for more data
        "retmode": "xml"
    }

    try:
        # Make the request to the PubMed API
        response = requests.get(base_url, params=params)
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)

        # Return the XML content directly
        # We set the Content-Type so the browser knows it's XML
        return response.text, 200, {'Content-Type': 'application/xml'}

    except requests.exceptions.RequestException as e:
        print(f"Error fetching from NCBI: {e}")
        return jsonify({"error": f"Failed to fetch data from NCBI: {e}"}), 500

### HW3 ======

@app.route('/get-all-similarities', methods=['GET'])
def get_all_similarities():
    # ... (code to get keyword is the same) ...
    keyword = request.args.get('keyword').lower().strip()
    all_results = {}
    stemmed_models = ["cbow_stemmed", "skipgram_stemmed"]
    stemmed_keyword = stemmer.stem(keyword)
    model_order = ["skipgram", "cbow","skipgram_no_stopwords", "skipgram_stemmed", "cbow_no_stopwords", "cbow_stemmed"]

    for name in model_order:
        if name in models:
            model = models[name]
            query_word = stemmed_keyword if name in stemmed_models else keyword
            try:
                similar_words = model.wv.most_similar(query_word, topn=10)
                
                # --- THIS IS THE NEW ENRICHMENT LOGIC ---
                enriched_results = []
                for word, score in similar_words:
                    result_item = {"word": word, "score": float(score)}
                    # If it's a stemmed model, add the original words from our map
                    if name in stemmed_models:
                        result_item["originals"] = reverse_stem_map.get(word, [word])
                    enriched_results.append(result_item)
                all_results[name] = enriched_results
                # --- END OF NEW LOGIC ---

            except KeyError:
                all_results[name] = []
        else:
            all_results[name] = []
            
    return jsonify(all_results)
### ======

if __name__ == '__main__':
    # This sequence loads all necessary assets ONCE.
    load_models()
    load_reverse_stem_map()
    
    # Then it starts the server.
    app.run(debug=True, port=5000)
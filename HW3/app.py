from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from gensim.models import Word2Vec
import os
import json

app = Flask(__name__)
# Enable CORS to allow requests from your HTML file opened in the browser
CORS(app)

### HW3 ======
stem_map = {}
models = {}

def load_models():
    global stem_map
    """
    Loads all Word2Vec models from the disk into the 'models' dictionary.
    This function is called once when the server starts.
    """
    print("--- Loading Word2Vec models ---")
    
    # Define the models we want to load. The key is what we'll use in the API call.
    # The value is the filename.
    model_files = {
        "cbow": "pubmed_cbow.model",
        "skipgram": "pubmed_skipgram.model",
        "cbow_no_stopwords": "pubmed_cbow_no_stopwords.model",
        "skipgram_no_stopwords": "pubmed_skipgram_no_stopwords.model"
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

    print("--- Loading stem-to-originals map ---")
    map_filename = "stem_map.json"
    if os.path.exists(map_filename):
        try:
            with open(map_filename, 'r', encoding='utf-8') as f:
                stem_map = json.load(f)
            print("Stem map loaded successfully.")
        except Exception as e:
            print(f"Error loading stem map: {e}")
    else:
        print(f"WARNING: Stem map file not found: {map_filename}. Hover feature will not work.")
    
    print("--- All assets loaded ---")

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
    keyword = request.args.get('keyword')
    if not keyword:
        return jsonify({"error": "A 'keyword' is required."}), 400

    keyword = keyword.lower().strip()
    all_results = {}

    # Define the order of models for consistent display on the frontend
    model_order = ["cbow", "skipgram", "cbow_no_stopwords", "skipgram_no_stopwords"]

    for name in model_order:
        if name in models:
            model = models[name]
            try:
                # Get top 10 similar words for the current model
                similar_words = model.wv.most_similar(keyword, topn=10)
                # Format the result for JSON
                all_results[name] = [{"word": word, "score": float(score)} for word, score in similar_words]
            except KeyError:
                # If the word isn't in this model's vocab, return an empty list for this model
                all_results[name] = []
        else:
             all_results[name] = [] # Model wasn't loaded

    return jsonify(all_results)
### ======

if __name__ == '__main__':
    # Run the server on localhost, port 5000
    app.run(debug=True, port=5000)
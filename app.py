from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import xml.etree.ElementTree as ET # Used to parse search results

# Initialize the Flask app
app = Flask(__name__)
# Enable Cross-Origin Resource Sharing (CORS) so your HTML/JS can talk to this server
CORS(app)

# --- PubMed API Base URLs ---
EUTILS_BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"

# --- API Endpoint to search for articles ---
@app.route('/search', methods=['GET'])
def search_pubmed():
    # 1. Get the search term from the user's request
    search_term = request.args.get('term')
    if not search_term:
        return jsonify({"error": "A search term is required."}), 400

    try:
        # 2. Use PubMed's 'esearch' utility to find PMIDs (PubMed IDs) for the term
        search_params = {
            "db": "pubmed",
            "term": search_term,
            "retmax": "10",  # Get up to 10 results
            "sort": "relevance",
            "retmode": "xml"
        }
        search_response = requests.get(f"{EUTILS_BASE_URL}esearch.fcgi", params=search_params)
        search_response.raise_for_status() # Raise an exception for bad status codes

        # 3. Parse the XML response to get the list of PMIDs
        root = ET.fromstring(search_response.content)
        pmid_list = [id_elem.text for id_elem in root.findall('.//Id')]
        
        if not pmid_list:
            return jsonify([])

        # 4. Use 'esummary' to get article details (like titles) for the found PMIDs
        summary_params = {
            "db": "pubmed",
            "id": ",".join(pmid_list),
            "retmode": "xml"
        }
        summary_response = requests.get(f"{EUTILS_BASE_URL}esummary.fcgi", params=summary_params)
        summary_response.raise_for_status()

        # 5. Parse the summary XML and format it into a nice JSON list for the front-end
        summary_root = ET.fromstring(summary_response.content)
        results = []
        for doc_sum in summary_root.findall('.//DocSum'):
            pmid = doc_sum.find('Id').text
            title_elem = doc_sum.find("./Item[@Name='Title']")
            title = title_elem.text if title_elem is not None else "No title found"
            
            # Construct the direct URL to the PubMed article page
            pubmed_url = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
            
            results.append({
                "pmid": pmid,
                "title": title,
                "url": pubmed_url
            })

        return jsonify(results)

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Failed to connect to PubMed API: {e}"}), 500
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {e}"}), 500


# --- API Endpoint to fetch the full XML for a specific article ---
@app.route('/fetch', methods=['GET'])
def fetch_xml():
    pmid = request.args.get('pmid')
    if not pmid:
        return "A PubMed ID (pmid) is required.", 400

    try:
        # Use 'efetch' to get the full XML data for a given PMID
        fetch_params = {
            "db": "pubmed",
            "id": pmid,
            "rettype": "xml",
            "retmode": "xml" # Can be text as well, but xml is more structured
        }
        fetch_response = requests.get(f"{EUTILS_BASE_URL}efetch.fcgi", params=fetch_params)
        fetch_response.raise_for_status()

        # Return the raw XML content
        return fetch_response.text, 200, {'Content-Type': 'application/xml'}
    
    except requests.exceptions.RequestException as e:
        return f"Failed to fetch XML from PubMed API: {e}", 500


# --- Run the server ---
if __name__ == '__main__':
    # Runs on http://127.0.0.1:5000
    app.run(debug=True)
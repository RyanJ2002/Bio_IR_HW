from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
# Enable CORS to allow requests from your HTML file opened in the browser
CORS(app) 

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

if __name__ == '__main__':
    # Run the server on localhost, port 5000
    app.run(debug=True, port=5000)
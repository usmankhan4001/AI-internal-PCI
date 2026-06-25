import os
import glob
import time
import google.generativeai as genai

# Set the API key
genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))

# Directories
PDF_DIRS = [
    "../bot/pdfs",
    "../bot"
]
OUT_DIR = "knowledge_base"

os.makedirs(OUT_DIR, exist_ok=True)

def extract_pdfs():
    files_to_process = []
    for d in PDF_DIRS:
        for ext in ('*.pdf', '*.PDF'):
            files_to_process.extend(glob.glob(os.path.join(d, ext)))
            
    print(f"Found {len(files_to_process)} PDFs to process using Python.")
    
    for filepath in files_to_process:
        filename = os.path.basename(filepath)
        outpath = os.path.join(OUT_DIR, f"{filename}.json")
        
        if os.path.exists(outpath):
            print(f"Skipping {filename}, JSON already exists.")
            continue
            
        print(f"\nProcessing {filename}...")
        
        try:
            print("  Uploading to Gemini File API...")
            # Upload the file
            uploaded_file = genai.upload_file(path=filepath, mime_type="application/pdf")
            print(f"  Upload successful. File URI: {uploaded_file.uri}")
            
            # Wait for the file to be processed by Google before generating content
            # Huge PDFs take time to be ingested by the Gemini infrastructure
            while uploaded_file.state.name == "PROCESSING":
                print("  Waiting for Gemini to process the massive file...")
                time.sleep(10)
                uploaded_file = genai.get_file(uploaded_file.name)
                
            if uploaded_file.state.name == "FAILED":
                raise ValueError("File processing failed on Gemini's end.")
            
            print("  Extracting structured data with gemini-1.5-pro...")
            model = genai.GenerativeModel("gemini-1.5-pro")
            
            prompt = "Extract all factual data from this document. This includes pricing, layouts, payment plans, policies, descriptions, and features. Return the extracted data as a strict JSON array of objects. Each object MUST have the following keys: 'category' (string), 'topic' (string), 'content' (string, containing the detailed facts), and 'metadata' (an object with key-value pairs of specific numbers, dimensions, or prices if applicable). Do not include markdown formatting or extra text, just the raw JSON array."
            
            response = model.generate_content(
                [uploaded_file, prompt],
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.1
                )
            )
            
            with open(outpath, "w", encoding="utf-8") as f:
                f.write(response.text)
                
            print(f"  Saved extracted JSON to {outpath}")
            
            # Clean up remote file
            genai.delete_file(uploaded_file.name)
            print("  Cleaned up remote file.")
            
        except Exception as e:
            print(f"  Error processing {filename}: {e}")

if __name__ == "__main__":
    extract_pdfs()

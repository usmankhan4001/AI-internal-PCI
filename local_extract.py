import os
import glob
import json
import fitz  # PyMuPDF

PDF_DIRS = [
    "../bot/pdfs",
    "../bot"
]
OUT_DIR = "knowledge_base"

os.makedirs(OUT_DIR, exist_ok=True)

def extract_local():
    files_to_process = []
    for d in PDF_DIRS:
        for ext in ('*.pdf', '*.PDF'):
            files_to_process.extend(glob.glob(os.path.join(d, ext)))
            
    print(f"Found {len(files_to_process)} PDFs to process locally.")
    
    for filepath in files_to_process:
        filename = os.path.basename(filepath)
        outpath = os.path.join(OUT_DIR, f"{filename}.json")
        
        if os.path.exists(outpath):
            print(f"Skipping {filename}, JSON already exists.")
            continue
            
        print(f"\nProcessing {filename} locally...")
        
        try:
            doc = fitz.open(filepath)
            extracted_data = []
            
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                # Extract text maintaining some structural integrity
                text = page.get_text("text").strip()
                
                if text:
                    # Clean up the text by removing excessive newlines while keeping spacing
                    text = ' '.join(text.split())
                    
                    extracted_data.append({
                        "category": filename.replace('.pdf', '').replace('.PDF', ''),
                        "topic": f"Content from Page {page_num + 1}",
                        "content": text,
                        "metadata": {
                            "source_file": filename,
                            "page": page_num + 1
                        }
                    })
            
            doc.close()
            
            if extracted_data:
                with open(outpath, "w", encoding="utf-8") as f:
                    json.dump(extracted_data, f, indent=2, ensure_ascii=False)
                print(f"  Saved {len(extracted_data)} structured chunks to {outpath}")
            else:
                print(f"  Warning: No text found in {filename} (might be entirely scanned images).")
            
        except Exception as e:
            print(f"  Error processing {filename}: {e}")

if __name__ == "__main__":
    extract_local()

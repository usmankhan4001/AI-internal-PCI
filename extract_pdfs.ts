import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';

// Using environment variables for Gemini API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const pdfDirs = [
  path.join(__dirname, '..', 'bot', 'pdfs'),
  path.join(__dirname, '..', 'bot')
];
const outDir = path.join(__dirname, 'knowledge_base');

async function extractPdfs() {
  const filesToProcess: string[] = [];

  for (const dir of pdfDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.toLowerCase().endsWith('.pdf')) {
          filesToProcess.push(path.join(dir, file));
        }
      }
    }
  }

  console.log(`Found ${filesToProcess.length} PDFs to process.`);

  for (const filePath of filesToProcess) {
    const filename = path.basename(filePath);
    const outPath = path.join(outDir, `${filename}.json`);
    
    // Skip if already processed to save time/credits
    if (fs.existsSync(outPath)) {
      console.log(`Skipping ${filename}, JSON already exists.`);
      continue;
    }

    console.log(`\nProcessing ${filename}...`);

    try {
      // 1. Upload the file to Gemini
      console.log(`  Uploading to Gemini File API...`);
      const uploadResponse = await ai.files.upload({
        file: filePath,
        mimeType: 'application/pdf',
      } as any);
      console.log(`  Upload successful. File URI: ${uploadResponse.uri}`);

      // 2. Generate content
      console.log(`  Extracting structured data with gemini-1.5-pro...`);
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-pro',
        contents: [
          uploadResponse,
          { text: "Extract all factual data from this document. This includes pricing, layouts, payment plans, policies, descriptions, and features. Return the extracted data as a strict JSON array of objects. Each object MUST have the following keys: 'category' (string), 'topic' (string), 'content' (string, containing the detailed facts), and 'metadata' (an object with key-value pairs of specific numbers, dimensions, or prices if applicable). Do not include markdown formatting or extra text, just the raw JSON array." }
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      });

      const jsonString = response.text || "[]";
      
      fs.writeFileSync(outPath, jsonString);
      console.log(`  Saved extracted JSON to ${outPath}`);

      // 3. Delete the file from Gemini to save space
      await ai.files.delete({ name: uploadResponse.name as string });
      console.log(`  Cleaned up remote file.`);

    } catch (err: any) {
      console.error(`  Error processing ${filename}:`, err.message);
    }
  }
}

extractPdfs().then(() => console.log("All PDFs processed."));

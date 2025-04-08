import './App.css'
import {useState, useEffect} from 'react';
import axios from 'axios';
// import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import "@fontsource/noto-sans"; // automatically loads CSS
import notoSans from "./assets/fonts/NotoSans-Regular.ttf?url";




// Set the workerSrc dynamically using the version from the lib
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;


// Set the worker source for PDF.js

const apiKey = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY;

function App() {
  const [options, setOptions] = useState([]);
  const [to, setTo] = useState("");
  const [from, setFrom] = useState("");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfText, setPdfText] = useState('');
  const [translatedPdfText, setTranslatedPdfText] = useState('');

  const translate = () => {
    if (!input.trim()) {
      alert("Please enter text to translate.");
      return;
    }
  
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
  
    axios.post(url, {
      q: input,
      // source: from,
      target: to,
      format: 'text',
    })
    .then(res => {
      console.log(res.data);
      setOutput(res.data.data.translations[0].translatedText);
      setFrom(res.data.data.translations[0].detectedSourceLanguage);
      // setTo(res.data.data.translations[0].detectedSourceLanguage);
    })
    .catch(err => {
      console.error("Translation error:", err);
      alert("Translation failed. Please check your API key or input.");
    });
  };
  const swapLanguages = () => {
    const tempLang = from;
    const tempText = input;
    const tempPdfText = pdfText;
  
    setFrom(to);
    setTo(tempLang);
    setInput(output);      // Swap the text areas
    setOutput(tempText);
    
  // Swap PDF preview text as well
  setPdfText(translatedPdfText);
  setTranslatedPdfText(tempPdfText);
  };
  

  useEffect(() => {
    axios.get(`https://translation.googleapis.com/language/translate/v2/languages?key=${apiKey}&target=en`)
      .then(res => {
        console.log(res.data);
        const langs = res.data.data.languages;
        setOptions(langs.map(lang => ({
          code: lang.language,
          name: lang.name|| lang.language // Google gives the display name when target is set
        })));
      });
  }, []);
  
 // PDF TEXT EXTRACTION AND TRANSLATION
 const extractTextFromPDF = async (file) => {
  const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(' ');
    text += pageText + '\n\n';
  }
  return text;
};

const handlePDFTranslate = async () => {
  if (!pdfFile || !to) {
    alert('Upload a PDF and select a target language.');
    return;
  }

  try {
    const originalText = await extractTextFromPDF(pdfFile);
    setPdfText(originalText);

    const response = await axios.post(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        q: originalText,
        target: to,
        format: 'text',
      }
    );

    const translated = response.data.data.translations[0].translatedText;
    setTranslatedPdfText(translated);

    const pdf = new jsPDF();

    // ✅ Load font as base64
    const res = await fetch(notoSans);
    const buffer = await res.arrayBuffer();
    const binary = new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "");
    const fontData = btoa(binary);

    // ✅ Embed and register the font
    pdf.addFileToVFS("NotoSans.ttf", fontData);
    pdf.addFont("NotoSans.ttf", "NotoSans", "normal");
    pdf.setFont("NotoSans");
    pdf.setFontSize(12);

    // ✅ Write translated text
    const lines = pdf.splitTextToSize(translated, 180);
    pdf.text(lines, 10, 10);
    pdf.save('translated.pdf');
  } catch (error) {
    console.error('PDF Translation error:', error);
    alert('Failed to translate the PDF.');
  }
};



  return (
    <div className='App border-1 border-gray-400 p-4 rounded'>
      <div>
        <h1>Text & Document Translator</h1>
        Detected From ({from}):
        <select value={from} onChange={(e)=>setFrom(e.target.value)}>
          <option value="">Select language</option>
          {options.map(opt=> (<option key={opt.code} value={opt.code}>{opt.name}</option>))}
        </select>
        
        Detected To ({to}):
        <select  value={to} onChange={(e)=>setTo(e.target.value)}>
          <option value="">Select language</option>
          {options.map(opt=> (<option key={opt.code} value={opt.code}>{opt.name}</option>))}
        </select>
      </div>
      <button onClick={swapLanguages} className="border px-2 py-1 rounded bg-blue-200 hover:bg-blue-300">
           Swap
        </button>
      <div>
        <textarea name="inputText" id="itext" cols="80" rows="20" value={input} onInput={(e)=>setInput(e.target.value)}placeholder="Enter text to translate..."></textarea>
        <textarea name="outputText" id="otext" cols="80" rows="20" value={output} readOnly placeholder='Translated text here...'></textarea>
      </div>
      <div>
        <button className="Translate" onClick={translate}>Translate</button>
      </div>

   {/* ---------- PDF TRANSLATION SECTION ---------- */}
   <div className="mt-10 p-4 border-t pt-6">
   <h2 className="text-xl font-bold mb-4">📄 PDF Document Translator</h2>
   <input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files[0])} />
  
   <button
     onClick={handlePDFTranslate}
     className="ml-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
   >
     Translate PDF
   </button>
    {pdfText && (
      <div className="mt-4">
        <h3 className="font-medium">Original PDF Text:</h3>
        <textarea readOnly value={pdfText} rows="10" cols="80" className="mt-2"></textarea>
      </div>
    )}

    {translatedPdfText && (
      <div className="mt-4">
        <h3 className="font-medium">Translated Text Preview:</h3>
        <textarea readOnly value={translatedPdfText} rows="10" cols="80" className="mt-2"></textarea>
      </div>
    )}
 </div>
</div>
);
}

export default App

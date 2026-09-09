import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  FileCode, 
  FolderTree, 
  Download, 
  Sparkles, 
  Layers, 
  ExternalLink,
  ChevronRight,
  Terminal
} from 'lucide-react';
import { JAVA_PROJECT_FILES, JavaFileItem } from '../data/javaCodebase';

export const JavaCodeViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<JavaFileItem>(JAVA_PROJECT_FILES[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const element = document.createElement('a');
    const file = new Blob([selectedFile.content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = selectedFile.name;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-neutral-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E5ECE0] text-[#344E27] text-xs font-bold uppercase tracking-wider mb-2">
            <Code2 className="w-3.5 h-3.5" />
            <span>Pure Java & JavaFX Desktop Architecture</span>
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[#191919] uppercase tracking-tight">
            Java Desktop Source Code
          </h1>
          <p className="text-neutral-500 text-sm sm:text-base mt-1">
            Complete, production-ready JavaFX application code adhering to OOP design patterns, modular services, and organic UI themes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadFile}
            className="px-4 py-2.5 rounded-full bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-800 text-xs font-bold transition-all flex items-center gap-2 shadow-2xs"
          >
            <Download className="w-4 h-4 text-[#344E27]" />
            <span>Download {selectedFile.name}</span>
          </button>
        </div>
      </div>

      {/* Code Browser Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-neutral-900 rounded-[32px] overflow-hidden border border-neutral-800 shadow-2xl">
        
        {/* Left File Tree */}
        <div className="lg:col-span-4 p-5 bg-neutral-950 border-r border-neutral-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4 px-2">
              <FolderTree className="w-4 h-4 text-[#344E27]" />
              <span>Project Structure (JavaFX)</span>
            </div>

            <div className="space-y-1">
              {JAVA_PROJECT_FILES.map((file) => {
                const isSelected = selectedFile.name === file.name;
                return (
                  <button
                    key={file.name}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-mono transition-all flex items-center justify-between group ${
                      isSelected
                        ? 'bg-[#344E27] text-white font-bold shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileCode className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-neutral-500 group-hover:text-neutral-300'}`} />
                      <span className="truncate">{file.path}</span>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-neutral-600'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 text-[11px] text-neutral-400">
            <span className="font-bold text-neutral-200 block mb-1">Compilation Note:</span>
            <span>Requires JDK 17+ and JavaFX 21 SDK (Controls, FXML, Graphics modules).</span>
          </div>
        </div>

        {/* Right Code Viewer */}
        <div className="lg:col-span-8 p-6 flex flex-col bg-neutral-900">
          
          {/* File Tab Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-white">{selectedFile.name}</span>
                <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400 text-[10px] uppercase font-bold">Java</span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">{selectedFile.description}</p>
            </div>

            <button
              onClick={handleCopy}
              className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          {/* Syntax Highlighted Box */}
          <div className="flex-1 overflow-x-auto max-h-[560px] overflow-y-auto font-mono text-xs text-neutral-300 leading-relaxed bg-neutral-950 p-5 rounded-2xl border border-neutral-800/80">
            <pre className="whitespace-pre">{selectedFile.content}</pre>
          </div>

        </div>

      </div>

    </div>
  );
};

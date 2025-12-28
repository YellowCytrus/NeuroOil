import { useState, useRef, DragEvent } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  defaultFileName?: string;
}

export default function FileUpload({ onFileSelect, defaultFileName }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'text/csv' || files[0].name.endsWith('.csv')) {
      setSelectedFile(files[0]);
      onFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      onFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          border-2 border-dashed rounded-lg p-4 sm:p-6 lg:p-8 text-center cursor-pointer
          transition-all duration-200 shadow-sm touch-manipulation
          ${isDragging 
            ? 'border-indigo-500 bg-indigo-50 shadow-md border-solid' 
            : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-md active:bg-indigo-100 active:border-indigo-500'
          }
        `}
        style={{ minHeight: '120px' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="hidden"
        />
        <div className="space-y-2 flex flex-col items-center justify-center h-full">
          <svg
            className="mx-auto h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="text-xs sm:text-sm text-gray-600">
            <span className="font-semibold">Нажмите для загрузки</span> <span className="hidden sm:inline">или перетащите файл сюда</span>
          </div>
          <p className="text-xs text-gray-500">
            {defaultFileName && !selectedFile && `По умолчанию: ${defaultFileName}`}
            {selectedFile && `Выбран: ${selectedFile.name}`}
          </p>
        </div>
      </div>
    </div>
  );
}









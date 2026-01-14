import { useRef, useCallback } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  bgColor?: string;
  fgColor?: string;
  includeMargin?: boolean;
}

export function QRCodeDisplay({
  value,
  size = 128,
  bgColor = '#ffffff',
  fgColor = '#000000',
  includeMargin = true,
}: QRCodeDisplayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const downloadPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'qr-code.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  const downloadSVG = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = 'qr-code.svg';
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="flex flex-col items-center">
      {/* Display SVG version */}
      <div className="bg-white p-2 rounded-lg border border-gray-200">
        <QRCodeSVG
          ref={svgRef}
          value={value}
          size={size}
          bgColor={bgColor}
          fgColor={fgColor}
          includeMargin={includeMargin}
          level="M"
        />
      </div>

      {/* Hidden canvas for PNG download */}
      <div className="hidden">
        <QRCodeCanvas
          ref={canvasRef}
          value={value}
          size={size * 2}
          bgColor={bgColor}
          fgColor={fgColor}
          includeMargin={includeMargin}
          level="M"
        />
      </div>

      {/* Export buttons */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={downloadPNG}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          Download PNG
        </button>
        <button
          onClick={downloadSVG}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          Download SVG
        </button>
      </div>
    </div>
  );
}

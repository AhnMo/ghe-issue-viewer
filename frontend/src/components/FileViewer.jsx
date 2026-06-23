import React, { useEffect, useRef } from 'react';
import { FileCode } from 'lucide-react';

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FileViewer = ({ file }) => {
  const targetLineRef = useRef(null);

  // Get highlighted line from URL hash
  const getTargetLine = () => {
    const hash = window.location.hash;
    const match = hash.match(/^#L(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  };

  useEffect(() => {
    if (targetLineRef.current) {
      targetLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [file]);

  const handleLineClick = (lineNum) => {
    window.location.hash = `#L${lineNum}`;
  };

  if (file.encoding === 'too_large') {
    return (
      <div className="rounded-md border overflow-hidden" style={{ borderColor: '#d0d7de' }}>
        <div className="px-4 py-2 flex items-center justify-between border-b" style={{ backgroundColor: '#f6f8fa', borderColor: '#d0d7de' }}>
          <div className="flex items-center gap-2">
            <FileCode size={14} style={{ color: '#656d76' }} />
            <span className="font-mono text-sm" style={{ color: '#1f2328' }}>{file.name}</span>
          </div>
          <span className="text-xs" style={{ color: '#656d76' }}>{formatSize(file.size)}</span>
        </div>
        <div className="p-8 text-center" style={{ backgroundColor: '#ffffff', color: '#656d76' }}>
          <FileCode size={32} className="mx-auto mb-2" style={{ color: '#656d76' }} />
          <p>File is too large to display ({formatSize(file.size)})</p>
        </div>
      </div>
    );
  }

  if (file.encoding === 'binary') {
    return (
      <div className="rounded-md border overflow-hidden" style={{ borderColor: '#d0d7de' }}>
        <div className="px-4 py-2 flex items-center justify-between border-b" style={{ backgroundColor: '#f6f8fa', borderColor: '#d0d7de' }}>
          <div className="flex items-center gap-2">
            <FileCode size={14} style={{ color: '#656d76' }} />
            <span className="font-mono text-sm" style={{ color: '#1f2328' }}>{file.name}</span>
          </div>
          <span className="text-xs" style={{ color: '#656d76' }}>{formatSize(file.size)}</span>
        </div>
        <div className="p-8 text-center" style={{ backgroundColor: '#ffffff', color: '#656d76' }}>
          <p>Binary file — cannot display content</p>
        </div>
      </div>
    );
  }

  const lines = file.content.split('\n');
  const targetLine = getTargetLine();

  return (
    <div className="rounded-md border overflow-hidden" style={{ borderColor: '#d0d7de' }}>
      {/* File header */}
      <div className="px-4 py-2 flex items-center justify-between border-b" style={{ backgroundColor: '#f6f8fa', borderColor: '#d0d7de' }}>
        <div className="flex items-center gap-2">
          <FileCode size={14} style={{ color: '#656d76' }} />
          <span className="font-mono text-sm" style={{ color: '#1f2328' }}>{file.name}</span>
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: '#656d76' }}>
          <span>{lines.length} lines</span>
          <span>{formatSize(file.size)}</span>
          <span className="font-mono">{file.sha.slice(0, 7)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-x-auto" style={{ backgroundColor: '#ffffff' }}>
        <table className="w-full text-xs font-mono" style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {lines.map((line, idx) => {
              const lineNum = idx + 1;
              const isTarget = lineNum === targetLine;
              return (
                <tr
                  key={idx}
                  ref={isTarget ? targetLineRef : null}
                  style={{ backgroundColor: isTarget ? '#fff8c5' : 'transparent' }}
                >
                  <td
                    className="px-3 py-0.5 text-right select-none border-r cursor-pointer hover:underline"
                    style={{ color: '#656d76', borderColor: '#d0d7de', width: '1%', whiteSpace: 'nowrap', minWidth: '3rem' }}
                    onClick={() => handleLineClick(lineNum)}
                  >
                    {lineNum}
                  </td>
                  <td
                    className="px-3 py-0.5 whitespace-pre"
                    style={{ color: '#1f2328' }}
                  >
                    {line}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FileViewer;
